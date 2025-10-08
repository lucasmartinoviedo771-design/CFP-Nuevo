# backend/core/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from datetime import timedelta
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.db.models.functions import Coalesce
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.management import call_command
from django.core.files.storage import FileSystemStorage
import os
from django.conf import settings
from io import StringIO
import json

from .models import (
    Estudiante, Programa, Bateria, Bloque, Modulo, Examen, Nota, Asistencia, Inscripcion,
    BloqueDeFechas, SemanaConfig, Cohorte
)
from .serializers import (
    EstudianteSerializer, ProgramaSerializer, BateriaSerializer, BloqueSerializer, BloqueDetailSerializer,
    ModuloSerializer, ExamenSerializer, NotaSerializer, AsistenciaSerializer, InscripcionSerializer,
    ProgramaDetailSerializer, BloqueDeFechasSerializer, SemanaConfigSerializer, CohorteSerializer
)
from django_filters import rest_framework as filters # New import
from django_filters.rest_framework import DjangoFilterBackend # New import

from rest_framework.filters import OrderingFilter
from .filters import EstudianteFilter

class UserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({'username': request.user.username})

class EstudianteViewSet(viewsets.ModelViewSet):
    queryset = Estudiante.objects.all().order_by("apellido", "nombre")
    serializer_class = EstudianteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = EstudianteFilter
    ordering_fields = ['dni', 'apellido', 'nombre', 'email', 'ciudad', 'created_at']

    @action(detail=True, methods=['get'])
    def approved_bloques(self, request, pk=None):
        estudiante = self.get_object()
        bloques = estudiante.get_approved_bloques()
        serializer = BloqueSerializer(bloques, many=True)
        return Response(serializer.data)

    def perform_destroy(self, instance):
        """En lugar de borrar, cambia el estatus a 'Baja' (soft delete)."""
        instance.estatus = 'Baja'
        instance.save()

class ProgramaViewSet(viewsets.ModelViewSet):
    queryset = Programa.objects.all()
    serializer_class = ProgramaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["activo", "codigo"]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProgramaDetailSerializer
        return super().get_serializer_class()

class CohorteViewSet(viewsets.ModelViewSet):
    queryset = Cohorte.objects.select_related('programa', 'bloque_fechas').all()
    serializer_class = CohorteSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['programa', 'bloque_fechas']

class BloqueDeFechasViewSet(viewsets.ModelViewSet):
    queryset = BloqueDeFechas.objects.all()
    serializer_class = BloqueDeFechasSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['post'])
    def guardar_secuencia(self, request, pk=None):
        bloque = self.get_object()
        semanas_data = request.data.get('semanas', [])

        try:
            # Atomic transaction to ensure data integrity
            with transaction.atomic():
                # Delete old sequence
                bloque.semanas_config.all().delete()
                # Create new sequence
                for i, semana_data in enumerate(semanas_data):
                    SemanaConfig.objects.create(
                        bloque=bloque,
                        orden=i + 1, # Ensure order is sequential
                        tipo=semana_data.get('tipo')
                    )
            return Response({'status': 'secuencia guardada'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def calendario(self, request, pk=None):
        bloque = self.get_object()
        semanas_config = bloque.semanas_config.all().order_by('orden')
        
        calendario_calculado = []
        current_date = bloque.fecha_inicio
        
        for semana_config in semanas_config:
            # La semana va de lunes a sábado
            while current_date.weekday() > 5: # Si es domingo, avanza al lunes
                current_date += timedelta(days=1)
            
            fecha_inicio_semana = current_date
            fecha_fin_semana = fecha_inicio_semana + timedelta(days=5) # Lunes a Sábado son 6 días

            calendario_calculado.append({
                'orden': semana_config.orden,
                'tipo': semana_config.get_tipo_display(),
                'fecha_inicio': fecha_inicio_semana,
                'fecha_fin': fecha_fin_semana
            })
            
            # Prepara la fecha para la siguiente semana (siguiente lunes)
            current_date = fecha_fin_semana + timedelta(days=2)

        return Response(calendario_calculado)

class SemanaConfigViewSet(viewsets.ModelViewSet):
    queryset = SemanaConfig.objects.all()
    serializer_class = SemanaConfigSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['bloque']

class BateriaViewSet(viewsets.ModelViewSet):
    queryset = Bateria.objects.all()
    serializer_class = BateriaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["programa"]

class BloqueViewSet(viewsets.ModelViewSet):
    queryset = Bloque.objects.all()
    serializer_class = BloqueSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["bateria"]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BloqueDetailSerializer
        return super().get_serializer_class()

    @action(detail=True, methods=['get'])
    def verificar_correlativas(self, request, pk=None):
        bloque = self.get_object()
        student_id = request.query_params.get('student_id')

        if not student_id:
            return Response({'error': 'student_id query parameter is required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            estudiante = Estudiante.objects.get(pk=student_id)
        except Estudiante.DoesNotExist:
            return Response({'error': 'Student not found.'}, status=status.HTTP_404_NOT_FOUND)

        bloques_faltantes = []
        for correlativa in bloque.correlativas.all():
            if not estudiante.ha_aprobado_bloque(correlativa):
                bloques_faltantes.append({
                    'id': correlativa.id,
                    'nombre': correlativa.nombre
                })
        
        if bloques_faltantes:
            return Response({
                'requisitos_cumplidos': False,
                'bloques_faltantes': bloques_faltantes
            })
        
        return Response({'requisitos_cumplidos': True})

class ExamenFilter(filters.FilterSet):
    tipo_examen = filters.BaseInFilter(field_name='tipo_examen', lookup_expr='in')

    class Meta:
        model = Examen
        fields = ['modulo', 'bloque', 'tipo_examen']

class ExamenViewSet(viewsets.ModelViewSet):
    queryset = Examen.objects.all()
    serializer_class = ExamenSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_class = ExamenFilter

class ModuloViewSet(viewsets.ModelViewSet):
    queryset = Modulo.objects.all()
    serializer_class = ModuloSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["bloque", "es_practica"]

class NotaViewSet(viewsets.ModelViewSet):
    queryset = Nota.objects.select_related("examen", "estudiante", "examen__modulo")
    serializer_class = NotaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["examen__modulo", "examen__bloque__bateria__programa", "examen__tipo_examen", "estudiante", "es_equivalencia", "aprobado"]

class AsistenciaViewSet(viewsets.ModelViewSet):
    queryset = Asistencia.objects.select_related("estudiante", "modulo")
    serializer_class = AsistenciaSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["estudiante", "modulo", "fecha", "presente", "archivo_origen"]

class InscripcionViewSet(viewsets.ModelViewSet):
    queryset = Inscripcion.objects.select_related('cohorte__programa', 'cohorte__bloque_fechas', 'modulo').all()
    serializer_class = InscripcionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ["estudiante", "cohorte", "estado", "cohorte__programa", "modulo", "modulo__bloque"]

# KPIs
class KPIViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    @action(detail=False, methods=["get"])
    def inscriptos(self, request):
        qs = Inscripcion.objects.values("cohorte__programa__codigo", "cohorte__nombre").annotate(inscriptos=Count("id"))
        return Response(list(qs))

    @action(detail=False, methods=["get"])
    def asistencia_promedio(self, request):
        qs = Asistencia.objects.values("modulo__id", "modulo__nombre").annotate(
            asistencia_promedio=Avg("presente")
        ).order_by("modulo__id")
        return Response(list(qs))

    @action(detail=False, methods=["get"])
    def aprobacion_por_examen(self, request):
        qs = Nota.objects.values("examen__modulo__id", "examen__tipo_examen").annotate(
            tasa_aprob=Avg("aprobado")
        )
        return Response(list(qs))

    @action(detail=False, methods=["get"])
    def equivalencias(self, request):
        qs = Nota.objects.filter(es_equivalencia=True).values("examen__modulo__id").annotate(
            count=Count("id")
        )
        return Response(list(qs))

    @action(detail=False, methods=["get"])
    def alertas(self, request):
        """
        - Asistencia < 70% por módulo/estudiante
        - Módulos con FINAL no rendido (sin Nota FINAL)
        """
        # Asistencia <70
        # promedio por estudiante/módulo
        from django.db.models import Avg

        asist_low = Asistencia.objects.values("estudiante__dni", "modulo__nombre").annotate(
            pct=Avg("presente")
        ).filter(pct__lt=0.7)

        # FINAL no rendido (matcheo por presencia de al menos un parcial/existencia de asistencia)
        finales_faltantes = []
        for m in Modulo.objects.all():
            # estudiantes con asistencia pero sin FINAL
            students_with_att = Asistencia.objects.filter(modulo=m).values_list("estudiante_id", flat=True).distinct()
            for sid in students_with_att:
                has_final = Nota.objects.filter(
                    examen__modulo=m, examen__tipo_examen="FINAL", estudiante_id=sid
                ).exists()
                if not has_final:
                    finales_faltantes.append({"modulo": m.nombre, "estudiante_id": sid})

        return Response({
            "asistencia_baja": list(asist_low),
            "finales_pendientes": finales_faltantes
        })

class ImportInscripcionesViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Create a temporary directory if it doesn't exist
        tmp_dir = os.path.join(settings.BASE_DIR, 'tmp')
        os.makedirs(tmp_dir, exist_ok=True)

        fs = FileSystemStorage(location=tmp_dir)
        filename = fs.save(file_obj.name, file_obj)
        file_path = fs.path(filename)
        
        output = StringIO()
        try:
            call_command('import_inscripciones', f'--file={file_path}', stdout=output)
            result = json.loads(output.getvalue())
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            os.remove(file_path)

class ImportAsistenciaViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Create a temporary directory if it doesn\'t exist
        tmp_dir = os.path.join(settings.BASE_DIR, 'tmp_asistencia')
        os.makedirs(tmp_dir, exist_ok=True)

        fs = FileSystemStorage(location=tmp_dir)
        filename = fs.save(file_obj.name, file_obj)
        
        output = StringIO()
        try:
            call_command('import_asistencia', f'--dir={tmp_dir}', stdout=output)
            result = json.loads(output.getvalue())
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            # Clean up the temporary file and directory
            file_path = fs.path(filename)
            os.remove(file_path)
            os.rmdir(tmp_dir)

class ImportNotasViewSet(viewsets.ViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({"error": "No file provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Create a temporary directory if it doesn\'t exist
        tmp_dir = os.path.join(settings.BASE_DIR, 'tmp')
        os.makedirs(tmp_dir, exist_ok=True)

        fs = FileSystemStorage(location=tmp_dir)
        filename = fs.save(file_obj.name, file_obj)
        file_path = fs.path(filename)
        
        output = StringIO()
        try:
            call_command('import_notas', f'--file={file_path}', stdout=output)
            result = json.loads(output.getvalue())
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        finally:
            os.remove(file_path)

class EstructuraProgramaView(APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, format=None):
        programa_id = request.query_params.get('programa')
        if not programa_id:
            return Response({"error": "El parámetro 'programa' es requerido."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            programa = Programa.objects.get(pk=programa_id)
        except Programa.DoesNotExist:
            return Response({"error": "Programa no encontrado."}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = ProgramaDetailSerializer(programa)
        return Response(serializer.data)

class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, format=None):
        # KPIs Optimized
        active_students_count = Inscripcion.objects.filter(estado='ACTIVO').aggregate(
            count=Count('estudiante', distinct=True)
        )['count']
        
        graduated_students_count = Inscripcion.objects.filter(estado='EGRESADO').aggregate(
            count=Count('estudiante', distinct=True)
        )['count']

        # Aggregate attendance in one query
        attendance_stats = Asistencia.objects.aggregate(
            total_asistencias=Count('id'),
            presentes=Count('id', filter=Q(presente=True))
        )
        total_asistencias = attendance_stats['total_asistencias']
        presentes = attendance_stats['presentes']
        attendance_rate = (presentes / total_asistencias * 100) if total_asistencias > 0 else 0

        # Aggregate grades in one query
        nota_stats = Nota.objects.aggregate(
            total_notas=Count('id'),
            aprobados=Count('id', filter=Q(aprobado=True))
        )
        total_notas = nota_stats['total_notas']
        aprobados = nota_stats['aprobados']
        pass_rate = (aprobados / total_notas * 100) if total_notas > 0 else 0

        # Chart data
        program_data = Programa.objects.annotate(
            student_count=Count('cohortes__inscripciones__estudiante', distinct=True)
        ).values('nombre', 'student_count')

        program_labels = [item['nombre'] for item in program_data]
        program_counts = [item['student_count'] for item in program_data]

        data = {
            "active_students_count": active_students_count,
            "graduated_students_count": graduated_students_count,
            "attendance_rate": round(attendance_rate, 2),
            "pass_rate": round(pass_rate, 2),
            "programs_chart": {
                "labels": program_labels,
                "counts": program_counts,
            }
        }
        
        return Response(data)