# backend/core/views.py
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from datetime import timedelta, datetime
from django.db import transaction
from django.db.models import Avg, Count, Q, IntegerField, Prefetch
from django.db.models.functions import Coalesce, TruncMonth, TruncWeek, Round, Cast
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.core.management import call_command
from django.core.files.storage import FileSystemStorage
import os
from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from io import StringIO
import json

from .models import (
    Estudiante, Programa, Bateria, Bloque, Modulo, Examen, Nota, Asistencia, Inscripcion,
    BloqueDeFechas, SemanaConfig, Cohorte
)
from .serializers import (
    ProgramaSerializer,
    CohorteSerializer,
    EstudianteSerializer,
    InscripcionSerializer,
    BloqueSerializer,
    ModuloSerializer,
    ExamenSerializer,
    NotaSerializer,
    AsistenciaSerializer,
    BateriaSerializer,
    BloqueDeFechasSerializer,
    SemanaConfigSerializer
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.utils.dateparse import parse_date
from django.utils import timezone

class HistoricoCursoView(APIView):
    def get(self, request, *args, **kwargs):
        cohorte_id = request.query_params.get('cohorte_id')
        tipo_dato = request.query_params.get('tipo_dato')

        if not cohorte_id:
            return Response(
                {"error": "El parámetro 'cohorte_id' es requerido."},
                status=status.HTTP_400_BAD_REQUEST
            )

        inscripciones = Inscripcion.objects.filter(cohorte_id=cohorte_id).select_related('estudiante')
        estudiantes = [inscripcion.estudiante for inscripcion in inscripciones]

        # Lógica para procesar según tipo_dato
        if tipo_dato == 'notas':
            # Aquí irá la lógica para las notas
            data = self.get_data_notas(estudiantes, cohorte_id)
        elif tipo_dato == 'asistencia':
            # Aquí irá la lógica para la asistencia
            data = self.get_data_asistencia(estudiantes, cohorte_id)
        else:
            # Por defecto, o si no se especifica, podemos devolver solo los estudiantes
            serializer = EstudianteSerializer(estudiantes, many=True)
            data = serializer.data

        return Response(data)

    def get_data_notas(self, estudiantes, cohorte_id):
        # Obtener todos los módulos y bloques de la cohorte
        cohorte = Cohorte.objects.get(id=cohorte_id)
        programa = cohorte.programa
        baterias = programa.baterias.all()
        bloques = Bloque.objects.filter(bateria__in=baterias)
        modulos = Modulo.objects.filter(bloque__in=bloques)

        # Obtener todos los exámenes para esos módulos y bloques
        examenes = Examen.objects.filter(models.Q(modulo__in=modulos) | models.Q(bloque__in=bloques)).order_by('bloque__orden', 'modulo__orden')
        
        # Crear los encabezados para la tabla
        headers = ['ID', 'Apellido', 'Nombre', 'DNI']
        examen_headers = []
        for ex in examenes:
            header_name = f"{ex.tipo_examen.capitalize()} - {ex.modulo.nombre if ex.modulo else ex.bloque.nombre}"
            examen_headers.append(header_name)
        headers.extend(examen_headers)

        # Obtener todas las notas de una vez para eficiencia
        notas_qs = Nota.objects.filter(estudiante__in=estudiantes, examen__in=examenes).select_related('examen', 'estudiante')
        
        # Organizar notas por estudiante
        notas_por_estudiante = {}
        for nota in notas_qs:
            if nota.estudiante_id not in notas_por_estudiante:
                notas_por_estudiante[nota.estudiante_id] = {}
            header_name = f"{nota.examen.tipo_examen.capitalize()} - {nota.examen.modulo.nombre if nota.examen.modulo else nota.examen.bloque.nombre}"
            notas_por_estudiante[nota.estudiante_id][header_name] = nota.calificacion

        # Construir la data final
        results = []
        for est in estudiantes:
            est_data = {
                'ID': est.id,
                'Apellido': est.apellido,
                'Nombre': est.nombre,
                'DNI': est.dni,
            }
            # Agregar notas, o None si no existen
            for header in examen_headers:
                est_data[header] = notas_por_estudiante.get(est.id, {}).get(header, None)
            
            results.append(est_data)

        return {
            'headers': headers,
            'rows': results
        }

    def get_data_asistencia(self, estudiantes, cohorte_id):
        from datetime import timedelta

        cohorte = Cohorte.objects.get(id=cohorte_id)
        modulos = Modulo.objects.filter(bloque__bateria__programa=cohorte.programa).order_by('bloque__orden', 'orden')

        if not modulos.exists():
            return {'headers': ['ID', 'Apellido', 'Nombre', 'DNI'], 'rows': []}

        # Asumimos que las semanas se cuentan desde el inicio del primer módulo
        fecha_inicio_curso = modulos.first().fecha_inicio or cohorte.bloque_fechas.fecha_inicio

        asistencias_qs = Asistencia.objects.filter(estudiante__in=estudiantes, modulo__in=modulos)

        asistencia_por_estudiante = {}
        for asistencia in asistencias_qs:
            if asistencia.estudiante_id not in asistencia_por_estudiante:
                asistencia_por_estudiante[asistencia.estudiante_id] = {}
            
            # Calcular el número de semana
            delta_dias = (asistencia.fecha - fecha_inicio_curso).days
            nro_semana = (delta_dias // 7) + 1
            
            semana_key = f'Semana {nro_semana}'
            if semana_key not in asistencia_por_estudiante[asistencia.estudiante_id]:
                asistencia_por_estudiante[asistencia.estudiante_id][semana_key] = {'presente': 0, 'total': 0}
            
            if asistencia.presente:
                asistencia_por_estudiante[asistencia.estudiante_id][semana_key]['presente'] += 1
            asistencia_por_estudiante[asistencia.estudiante_id][semana_key]['total'] += 1

        # Determinar el número máximo de semanas para los headers
        max_semana = 0
        for data_asistencia in asistencia_por_estudiante.values():
            for semana_key in data_asistencia.keys():
                nro = int(semana_key.split(' ')[1])
                if nro > max_semana:
                    max_semana = nro
        
        semana_headers = [f'Semana {i}' for i in range(1, max_semana + 1)]
        headers = ['ID', 'Apellido', 'Nombre', 'DNI'] + semana_headers + ['% Asistencia']

        results = []
        for est in estudiantes:
            est_data = {
                'ID': est.id,
                'Apellido': est.apellido,
                'Nombre': est.nombre,
                'DNI': est.dni,
            }
            total_presente = 0
            total_clases = 0

            for semana_header in semana_headers:
                semana_data = asistencia_por_estudiante.get(est.id, {}).get(semana_header)
                if semana_data:
                    est_data[semana_header] = 'Presente' if semana_data['presente'] > 0 else 'Ausente' # Simplificado
                    total_presente += semana_data['presente']
                    total_clases += semana_data['total']
                else:
                    est_data[semana_header] = 'N/A'
            
            porcentaje = (total_presente / total_clases * 100) if total_clases > 0 else 0
            est_data['% Asistencia'] = f'{porcentaje:.2f}%'
            results.append(est_data)

        return {
            'headers': headers,
            'rows': results
        }

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

from rest_framework.permissions import AllowAny

class CohorteViewSet(viewsets.ModelViewSet):
    queryset = Cohorte.objects.select_related('programa', 'bloque_fechas').all()
    serializer_class = CohorteSerializer
    permission_classes = [AllowAny] # Permitir acceso sin autenticación
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


class AnalyticsEnrollmentsView(APIView):
    TTL = getattr(settings, 'ANALYTICS_CACHE_SECONDS', 300)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    @method_decorator(cache_page(TTL), name='dispatch')
    def get(self, request):
        programa_id = request.query_params.get('programa_id')
        cohorte_id = request.query_params.get('cohorte_id')
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        group_by = request.query_params.get('group_by', 'month').lower()

        qs = Inscripcion.objects.all()
        if programa_id:
            qs = qs.filter(cohorte__programa_id=programa_id)
        if cohorte_id:
            qs = qs.filter(cohorte_id=cohorte_id)
        if date_from:
            df = parse_date(date_from)
            if df:
                qs = qs.filter(created_at__date__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                qs = qs.filter(created_at__date__lte=dt)

        if group_by == 'month':
            data = (
                qs.annotate(period=TruncMonth('created_at'))
                  .values('period')
                  .annotate(count=Count('id'))
                  .order_by('period')
            )
            results = [
                {"period": item['period'].date().isoformat(), "count": item['count']}
                for item in data
            ]
        else:
            results = [{"period": None, "count": qs.count()}]

        return Response({
            "total": qs.count(),
            "series": results,
        })


class AnalyticsAttendanceView(APIView):
    TTL = getattr(settings, 'ANALYTICS_CACHE_SECONDS', 300)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    @method_decorator(cache_page(TTL), name='dispatch')
    def get(self, request):
        programa_id = request.query_params.get('programa_id')
        cohorte_id = request.query_params.get('cohorte_id')
        modulo_id = request.query_params.get('modulo_id')
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        group_by = request.query_params.get('group_by', 'module').lower()

        qs = Asistencia.objects.all()
        if modulo_id:
            qs = qs.filter(modulo_id=modulo_id)
        if cohorte_id:
            try:
                cohorte = Cohorte.objects.get(id=cohorte_id)
                qs = qs.filter(modulo__bloque__bateria__programa=cohorte.programa)
            except Cohorte.DoesNotExist:
                qs = qs.none()
        if programa_id and not cohorte_id:
            qs = qs.filter(modulo__bloque__bateria__programa_id=programa_id)
        if date_from:
            df = parse_date(date_from)
            if df:
                qs = qs.filter(fecha__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                qs = qs.filter(fecha__lte=dt)

        overall = qs.aggregate(
            total=Count('id'),
            presentes=Count('id', filter=Q(presente=True)),
            rate=Avg('presente'),
        )

        if group_by == 'module':
            data = (
                qs.values('modulo__id', 'modulo__nombre')
                  .annotate(rate=Avg('presente'), total=Count('id'))
                  .order_by('modulo__id')
            )
            series = [
                {
                    "modulo_id": item['modulo__id'],
                    "modulo_nombre": item['modulo__nombre'],
                    "rate": float(item['rate'] or 0),
                    "total": item['total'],
                }
                for item in data
            ]
        elif group_by == 'week':
            data = (
                qs.annotate(period=TruncWeek('fecha'))
                  .values('period')
                  .annotate(rate=Avg('presente'), total=Count('id'))
                  .order_by('period')
            )
            series = [
                {
                    "period": item['period'].date().isoformat(),
                    "rate": float(item['rate'] or 0),
                    "total": item['total'],
                }
                for item in data
            ]
        else:
            series = []

        return Response({
            "overall": {
                "total": overall.get('total', 0),
                "presentes": overall.get('presentes', 0),
                "rate": float(overall.get('rate') or 0),
            },
            "series": series,
        })


class AnalyticsGradesView(APIView):
    TTL = getattr(settings, 'ANALYTICS_CACHE_SECONDS', 300)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    @method_decorator(cache_page(TTL), name='dispatch')
    def get(self, request):
        programa_id = request.query_params.get('programa_id')
        cohorte_id = request.query_params.get('cohorte_id')
        modulo_id = request.query_params.get('modulo_id')
        tipo_examen = request.query_params.get('tipo_examen')
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')

        qs = Nota.objects.select_related('examen', 'examen__modulo', 'examen__bloque')

        if modulo_id:
            qs = qs.filter(examen__modulo_id=modulo_id)
        if cohorte_id:
            try:
                cohorte = Cohorte.objects.get(id=cohorte_id)
                qs = qs.filter(
                    Q(examen__modulo__bloque__bateria__programa=cohorte.programa) |
                    Q(examen__bloque__bateria__programa=cohorte.programa)
                )
            except Cohorte.DoesNotExist:
                qs = qs.none()
        if programa_id and not cohorte_id:
            qs = qs.filter(
                Q(examen__modulo__bloque__bateria__programa_id=programa_id) |
                Q(examen__bloque__bateria__programa_id=programa_id)
            )
        if tipo_examen:
            qs = qs.filter(examen__tipo_examen=tipo_examen)
        if date_from:
            df = parse_date(date_from)
            if df:
                qs = qs.filter(fecha_calificacion__date__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                qs = qs.filter(fecha_calificacion__date__lte=dt)

        aprob_por_tipo = (
            qs.values('examen__tipo_examen')
              .annotate(rate=Avg('aprobado'), total=Count('id'))
              .order_by('examen__tipo_examen')
        )
        aprobacion = [
            {
                "tipo_examen": item['examen__tipo_examen'],
                "rate": float(item['rate'] or 0),
                "total": item['total'],
            }
            for item in aprob_por_tipo
        ]

        hist_qs = qs.exclude(calificacion__isnull=True).annotate(
            bin=Cast(Round('calificacion', 0), IntegerField())
        ).values('bin').annotate(count=Count('id')).order_by('bin')
        histogram = [
            {"bin": int(item['bin']), "count": item['count']}
            for item in hist_qs
        ]

        overall = qs.aggregate(
            total=Count('id'),
            aprobados=Count('id', filter=Q(aprobado=True))
        )
        overall_rate = (overall.get('aprobados') or 0) / overall.get('total') if overall.get('total') else 0

        return Response({
            "overall": {
                "total": overall.get('total', 0),
                "aprobados": overall.get('aprobados', 0),
                "rate": float(overall_rate),
            },
            "aprobacion_por_tipo": aprobacion,
            "histograma": histogram,
        })


class AnalyticsDropoutView(APIView):
    TTL = getattr(settings, 'ANALYTICS_CACHE_SECONDS', 300)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    @method_decorator(cache_page(TTL), name='dispatch')
    def get(self, request):
        programa_id = request.query_params.get('programa_id')
        cohorte_id = request.query_params.get('cohorte_id')
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        rule = (request.query_params.get('rule') or 'A').upper()
        lookback_weeks = int(request.query_params.get('lookback_weeks') or 3)

        insc_qs = Inscripcion.objects.select_related('estudiante', 'cohorte__programa')
        if programa_id:
            insc_qs = insc_qs.filter(cohorte__programa_id=programa_id)
        if cohorte_id:
            insc_qs = insc_qs.filter(cohorte_id=cohorte_id)
        if date_from:
            df = parse_date(date_from)
            if df:
                insc_qs = insc_qs.filter(created_at__date__gte=df)
        if date_to:
            dt = parse_date(date_to)
            if dt:
                insc_qs = insc_qs.filter(created_at__date__lte=dt)

        total_insc = insc_qs.count()

        if rule == 'B':
            # Inactividad: sin asistencias en las últimas N semanas
            threshold = (timezone.now() - timedelta(weeks=lookback_weeks)).date()
            active_student_ids = Asistencia.objects.filter(
                fecha__gte=threshold,
                estudiante_id__in=insc_qs.values_list('estudiante_id', flat=True)
            ).values_list('estudiante_id', flat=True).distinct()
            risk_ids = set(insc_qs.values_list('estudiante_id', flat=True)) - set(active_student_ids)

            dropout_count = len(risk_ids)
            rate = (dropout_count / total_insc) if total_insc else 0

            # No hay series temporales obvias; devolvemos snapshot y top lista de riesgo
            risk_students = list(
                Estudiante.objects.filter(id__in=risk_ids)
                .values('id', 'apellido', 'nombre', 'dni')[:50]
            )
            return Response({
                'rule': 'B',
                'lookback_weeks': lookback_weeks,
                'overall': {
                    'total_inscripciones': total_insc,
                    'dropout': dropout_count,
                    'rate': float(rate),
                },
                'at_risk': risk_students,
                'series': [],
            })

        # Regla A: Baja/Pausado aproximando fecha por updated_at
        bajas_ids = set(
            insc_qs.filter(estudiante__estatus='Baja').values_list('id', flat=True)
        )
        pausado_ids = set(
            insc_qs.filter(estado='PAUSADO').values_list('id', flat=True)
        )
        dropout_ids = bajas_ids.union(pausado_ids)
        dropout_count = len(dropout_ids)
        rate = (dropout_count / total_insc) if total_insc else 0

        # Series por mes usando updated_at aproximado
        # Para Baja (por estudiante), usamos updated_at del estudiante; para Pausado, updated_at de la inscripción
        bajas_series = (
            insc_qs.filter(estudiante__estatus='Baja')
                   .annotate(period=TruncMonth('estudiante__updated_at'))
                   .values('period')
                   .annotate(count=Count('id'))
        )
        pausado_series = (
            insc_qs.filter(estado='PAUSADO')
                   .annotate(period=TruncMonth('updated_at'))
                   .values('period')
                   .annotate(count=Count('id'))
        )
        # Combinar por periodo
        by_period = {}
        for item in bajas_series:
            if item['period']:
                key = item['period'].date().isoformat()
                by_period[key] = by_period.get(key, 0) + item['count']
        for item in pausado_series:
            if item['period']:
                key = item['period'].date().isoformat()
                by_period[key] = by_period.get(key, 0) + item['count']
        series = [
            { 'period': k, 'count': v }
            for k, v in sorted(by_period.items())
        ]

        return Response({
            'rule': 'A',
            'overall': {
                'total_inscripciones': total_insc,
                'dropout': dropout_count,
                'rate': float(rate),
            },
            'series': series,
        })


class LogoutView(APIView):
    """Blacklists the provided refresh token (SimpleJWT blacklist).
    Allows logout even if access token expired.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "'refresh' is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            return Response({"detail": "Invalid refresh token"}, status=status.HTTP_400_BAD_REQUEST)
        # 205 Reset Content is a common choice to hint client to clear state
        return Response(status=status.HTTP_205_RESET_CONTENT)


class CoursesGraphView(APIView):
    """Returns a tree for Programa structure for course admin graphs.

    Query params:
      - programa_id (required)
      - cohorte_id (optional)
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        programa_id = request.query_params.get('programa_id')
        cohorte_id = request.query_params.get('cohorte_id')
        if not programa_id:
            return Response({'detail': "'programa_id' is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            programa = Programa.objects.get(id=programa_id)
        except Programa.DoesNotExist:
            return Response({'detail': 'Programa not found'}, status=status.HTTP_404_NOT_FOUND)

        baterias = (
            Bateria.objects.filter(programa=programa)
            .order_by('orden', 'id')
            .prefetch_related(
                Prefetch(
                    'bloques',
                    queryset=Bloque.objects.order_by('orden', 'id').prefetch_related(
                        Prefetch('modulos', queryset=Modulo.objects.order_by('orden', 'id'))
                    )
                )
            )
        )

        tree = []
        for bat in baterias:
            bat_node = {
                'type': 'bateria',
                'id': bat.id,
                'nombre': bat.nombre,
                'orden': bat.orden,
                'children': [],
            }
            for blo in bat.bloques.all():
                blo_node = {
                    'type': 'bloque',
                    'id': blo.id,
                    'nombre': blo.nombre,
                    'orden': blo.orden,
                    'children': [],
                }
                for mod in blo.modulos.all():
                    blo_node['children'].append({
                        'type': 'modulo',
                        'id': mod.id,
                        'nombre': mod.nombre,
                        'orden': mod.orden,
                        'es_practica': mod.es_practica,
                        'fecha_inicio': mod.fecha_inicio.isoformat() if mod.fecha_inicio else None,
                        'fecha_fin': mod.fecha_fin.isoformat() if mod.fecha_fin else None,
                    })
                # Examenes finales del bloque (final virtual/sincronico/equivalencia)
                finales_qs = Examen.objects.filter(
                    bloque=blo,
                    tipo_examen__in=[Examen.FINAL_VIRTUAL, Examen.FINAL_SINC, Examen.EQUIVALENCIA]
                ).order_by('fecha', 'id')
                blo_node['finales'] = [
                    {
                        'id': ex.id,
                        'tipo_examen': ex.tipo_examen,
                        'fecha': ex.fecha.isoformat() if ex.fecha else None,
                        'peso': float(ex.peso),
                    }
                    for ex in finales_qs
                ]
                bat_node['children'].append(blo_node)
            tree.append(bat_node)

        cohorte_data = None
        if cohorte_id:
            try:
                coh = Cohorte.objects.select_related('programa', 'bloque_fechas').get(id=cohorte_id)
                cohorte_data = {
                    'id': coh.id,
                    'nombre': coh.nombre,
                    'programa_id': coh.programa_id,
                    'bloque_fechas_id': coh.bloque_fechas_id,
                    'bloque_fechas_nombre': coh.bloque_fechas.nombre,
                }
            except Cohorte.DoesNotExist:
                pass

        return Response({
            'programa': {'id': programa.id, 'codigo': programa.codigo, 'nombre': programa.nombre},
            'cohorte': cohorte_data,
            'tree': tree,
        })


class AnalyticsGraduatesView(APIView):
    """Graduates (egresados) based on all block finals approved.

    Rules:
      - A student is considered graduated if they have approved finals
        (FINAL_VIRTUAL, FINAL_SINC or EQUIVALENCIA) for ALL blocks of the Programa.
    Filters:
      - programa_id or cohorte_id (one required)
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        programa_id = request.query_params.get('programa_id')
        cohorte_id = request.query_params.get('cohorte_id')

        if not programa_id and not cohorte_id:
            return Response({'detail': "'programa_id' or 'cohorte_id' is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Determine programa from either param
        programa = None
        if cohorte_id and not programa_id:
            try:
                coh = Cohorte.objects.select_related('programa').get(id=cohorte_id)
                programa = coh.programa
                programa_id = programa.id
            except Cohorte.DoesNotExist:
                return Response({'detail': 'Cohorte not found'}, status=status.HTTP_404_NOT_FOUND)
        if programa is None and programa_id:
            try:
                programa = Programa.objects.get(id=programa_id)
            except Programa.DoesNotExist:
                return Response({'detail': 'Programa not found'}, status=status.HTTP_404_NOT_FOUND)

        # Required blocks for the program
        bloques_req = list(
            Bloque.objects.filter(bateria__programa_id=programa_id).values_list('id', flat=True)
        )
        total_bloques = len(bloques_req)

        # Population: estudiantes in cohort or in any cohort of programa
        if cohorte_id:
            estudiantes_qs = Estudiante.objects.filter(inscripciones__cohorte_id=cohorte_id)
        else:
            estudiantes_qs = Estudiante.objects.filter(inscripciones__cohorte__programa_id=programa_id)
        estudiantes_qs = estudiantes_qs.distinct()

        total_estudiantes = estudiantes_qs.count()

        graduates_ids = []
        if total_bloques > 0 and total_estudiantes > 0:
            finals_types = [Examen.FINAL_VIRTUAL, Examen.FINAL_SINC, Examen.EQUIVALENCIA]
            aprobados_por_est = (
                Nota.objects.filter(
                    aprobado=True,
                    examen__tipo_examen__in=finals_types,
                    examen__bloque_id__in=bloques_req,
                    estudiante__in=estudiantes_qs,
                )
                .values('estudiante_id')
                .annotate(bloques_aprobados=Count('examen__bloque', distinct=True))
            )
            graduates_ids = [r['estudiante_id'] for r in aprobados_por_est if r['bloques_aprobados'] >= total_bloques]

        graduates_count = len(graduates_ids) if total_bloques > 0 else 0
        rate = (graduates_count / total_estudiantes) if total_estudiantes else 0

        grads = list(
            Estudiante.objects.filter(id__in=graduates_ids)
            .values('id', 'apellido', 'nombre', 'dni')[:100]
        )

        return Response({
            'programa': {'id': programa.id, 'codigo': programa.codigo, 'nombre': programa.nombre},
            'cohorte_id': int(cohorte_id) if cohorte_id else None,
            'overall': {
                'total_estudiantes': total_estudiantes,
                'total_bloques_requeridos': total_bloques,
                'graduados': graduates_count,
                'rate': float(rate),
            },
            'graduados': grads,
        })
