# backend/core/serializers.py
from rest_framework import serializers
from django.db.models import Q, Avg, Count
from .models import (
    Estudiante, Programa, Bloque, Modulo, Examen, Nota, Asistencia, 
    Inscripcion, BloqueDeFechas, SemanaConfig, Cohorte
)
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User, Group
from .roles import list_roles

class EstudianteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estudiante
        fields = "__all__"

class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']

class SemanaConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemanaConfig
        fields = ['id', 'tipo', 'orden']

class BloqueDeFechasSerializer(serializers.ModelSerializer):
    semanas_config = SemanaConfigSerializer(many=True, read_only=True)

    class Meta:
        model = BloqueDeFechas
        fields = ['id', 'nombre', 'fecha_inicio', 'semanas_config']

class ProgramaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Programa
        fields = ['id', 'codigo', 'nombre', 'activo']

class CohorteSerializer(serializers.ModelSerializer):
    programa = ProgramaSerializer(read_only=True)
    bloque_fechas = BloqueDeFechasSerializer(read_only=True)
    programa_id = serializers.PrimaryKeyRelatedField(
        queryset=Programa.objects.all(), source='programa', write_only=True
    )
    bloque_fechas_id = serializers.PrimaryKeyRelatedField(
        queryset=BloqueDeFechas.objects.all(), source='bloque_fechas', write_only=True
    )

    class Meta:
        model = Cohorte
        fields = ['id', 'nombre', 'programa', 'bloque_fechas', 'programa_id', 'bloque_fechas_id']

class ExamenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Examen
        fields = "__all__"

class SimpleBloqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bloque
        fields = ['id', 'nombre']

class ModuloSerializer(serializers.ModelSerializer):
    examenes = serializers.SerializerMethodField()
    bloque = SimpleBloqueSerializer(read_only=True)

    class Meta:
        model = Modulo
        fields = ['id', 'nombre', 'orden', 'fecha_inicio', 'fecha_fin', 'es_practica', 'asistencia_requerida_practica', 'examenes', 'bloque']

    def get_examenes(self, obj):
        qs = Examen.objects.filter(modulo=obj, tipo_examen__in=['PARCIAL', 'RECUP'])
        return ExamenSerializer(qs, many=True).data

class BloqueDetailSerializer(serializers.ModelSerializer):
    modulos = ModuloSerializer(many=True, read_only=True)
    examenes_finales = serializers.SerializerMethodField()

    class Meta:
        model = Bloque
        fields = ['id', 'nombre', 'orden', 'modulos', 'examenes_finales']
    
    def get_examenes_finales(self, obj):
        qs = Examen.objects.filter(bloque=obj, tipo_examen__in=['FINAL_VIRTUAL', 'FINAL_SINC', 'EQUIVALENCIA'])
        return ExamenSerializer(qs, many=True).data

class ProgramaDetailSerializer(serializers.ModelSerializer):
    bloques = BloqueDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Programa
        fields = ['id', 'codigo', 'nombre', 'activo', 'bloques']

class BloqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bloque
        fields = "__all__"

class InscripcionSerializer(serializers.ModelSerializer):
    estudiante = EstudianteSerializer(read_only=True)
    cohorte = CohorteSerializer(read_only=True)
    modulo = ModuloSerializer(read_only=True, allow_null=True)
    estudiante_id = serializers.PrimaryKeyRelatedField(
        queryset=Estudiante.objects.all(), source='estudiante', write_only=True
    )
    cohorte_id = serializers.PrimaryKeyRelatedField(
        queryset=Cohorte.objects.all(), source='cohorte', write_only=True
    )
    modulo_id = serializers.PrimaryKeyRelatedField(
        queryset=Modulo.objects.all(), source='modulo', write_only=True, allow_null=True
    )

    class Meta:
        model = Inscripcion
        fields = ['id', 'estudiante', 'cohorte', 'modulo', 'estudiante_id', 'cohorte_id', 'modulo_id', 'estado', 'created_at', 'updated_at']

class NotaSerializer(serializers.ModelSerializer):
    examen_modulo_nombre = serializers.CharField(source="examen.modulo.nombre", read_only=True, allow_null=True)
    examen_modulo_id = serializers.IntegerField(source="examen.modulo.id", read_only=True, allow_null=True)
    examen_bloque_nombre = serializers.SerializerMethodField()
    examen_programa_nombre = serializers.SerializerMethodField()
    examen_tipo_examen = serializers.CharField(source="examen.tipo_examen", read_only=True)
    examen_fecha = serializers.DateField(source="examen.fecha", read_only=True)

    def get_examen_bloque_nombre(self, obj):
        if obj.examen.bloque:
            return obj.examen.bloque.nombre
        elif obj.examen.modulo and obj.examen.modulo.bloque:
            return obj.examen.modulo.bloque.nombre
        return None

    def get_examen_programa_nombre(self, obj):
        bloque = None
        if obj.examen.bloque:
            bloque = obj.examen.bloque
        elif obj.examen.modulo and obj.examen.modulo.bloque:
            bloque = obj.examen.modulo.bloque
        
        if bloque and bloque.programa:
            return bloque.programa.nombre
        return None

    class Meta:
        model = Nota
        fields = (
            'id', 'created_at', 'updated_at',
            'examen', 'estudiante', 'calificacion', 'aprobado', 'fecha_calificacion',
            'es_equivalencia', 'origen_equivalencia', 'fecha_ref_equivalencia',
            'examen_modulo_nombre',
            'examen_modulo_id',
            'examen_bloque_nombre',
            'examen_programa_nombre',
            'examen_tipo_examen',
            'examen_fecha',
        )
    def validate(self, data):
        # Implement rounding for calificacion
        calificacion = data.get("calificacion")
        if calificacion is not None:
            data["calificacion"] = round(calificacion)

        # Get examen and estudiante from incoming data or the existing instance
        examen = data.get("examen") or getattr(self.instance, "examen", None)
        estudiante = data.get("estudiante") or getattr(self.instance, "estudiante", None)

        # Equivalencia solo sobre FINAL
        es_equivalencia = data.get("es_equivalencia", getattr(self.instance, "es_equivalencia", False))
        if es_equivalencia and examen and examen.tipo_examen not in [Examen.FINAL_VIRTUAL, Examen.FINAL_SINC]:
            raise serializers.ValidationError("La equivalencia solo puede registrarse sobre exámenes FINAL.")

        # Validation: Only one approved grade per exam and student
        if data.get("aprobado"):
            if examen and estudiante:
                qs = Nota.objects.filter(examen=examen, estudiante=estudiante, aprobado=True)
                if self.instance:
                    qs = qs.exclude(pk=self.instance.pk)
                if qs.exists():
                    raise serializers.ValidationError("Ya existe una nota aprobada para este examen y estudiante.")

        # calificacion/aprobado coherentes
        if data.get("aprobado") and data.get("calificacion", 0) < 6:
            raise serializers.ValidationError("Si 'aprobado=True', la calificación debe ser >= 6.")
        return data

class AsistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asistencia
        fields = "__all__"


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Contraseña actual inválida.')
        return value

    def validate_new_password(self, value):
        validate_password(value)
        return value


class AssignRoleSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    role_name = serializers.ChoiceField(choices=[(r, r) for r in list_roles()])

class UserSerializer(serializers.ModelSerializer):
    groups = serializers.SlugRelatedField(many=True, slug_field='name', queryset=Group.objects.all())
    password = serializers.CharField(write_only=True, required=False)
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'groups', 'password', 'password2']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if 'password' in data and 'password2' in data and data['password'] != data['password2']:
            raise serializers.ValidationError({'password2': "Las contraseñas no coinciden."})
        if 'password' in data:
            validate_password(data['password'])
        return data

    def create(self, validated_data):
        groups_data = validated_data.pop('groups', [])
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None) # Remove password2

        user = User.objects.create(**validated_data)
        if password:
            user.set_password(password)
            user.save()
        user.groups.set(groups_data)
        return user

    def update(self, instance, validated_data):
        groups_data = validated_data.pop('groups', None)
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None) # Remove password2

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)
        instance.save()

        if groups_data is not None:
            instance.groups.set(groups_data)

        return instance