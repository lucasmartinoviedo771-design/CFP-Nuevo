# backend/academia/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from core.views import (
    EstudianteViewSet, ProgramaViewSet, BateriaViewSet, BloqueViewSet, ModuloViewSet, ExamenViewSet, NotaViewSet, AsistenciaViewSet, KPIViewSet, InscripcionViewSet, ImportInscripcionesViewSet, ImportAsistenciaViewSet, ImportNotasViewSet, DashboardStatsView, UserView, EstructuraProgramaView,
    BloqueDeFechasViewSet, SemanaConfigViewSet, CohorteViewSet, HistoricoCursoView, LogoutView,
    AnalyticsEnrollmentsView, AnalyticsAttendanceView, AnalyticsGradesView, AnalyticsDropoutView, AnalyticsGraduatesView,
    CoursesGraphView
)

router = DefaultRouter()
router.register(r"estudiantes", EstudianteViewSet, basename="estudiantes")
router.register(r"programas", ProgramaViewSet, basename="programas")
router.register(r"cohortes", CohorteViewSet, basename="cohortes")
router.register(r"baterias", BateriaViewSet, basename="baterias")
router.register(r"bloques", BloqueViewSet, basename="bloques")
router.register(r"modulos", ModuloViewSet, basename="modulos")
router.register(r"examenes", ExamenViewSet, basename="examenes")
router.register(r"notas", NotaViewSet, basename="notas")
router.register(r"asistencias", AsistenciaViewSet, basename="asistencias")
router.register(r"inscripciones", InscripcionViewSet, basename="inscripciones")
router.register(r"kpi", KPIViewSet, basename="kpi")
router.register(r"import-inscripciones", ImportInscripcionesViewSet, basename="import-inscripciones")
router.register(r"import-asistencia", ImportAsistenciaViewSet, basename="import-asistencia")
router.register(r"import-notas", ImportNotasViewSet, basename="import-notas")
router.register(r"bloques-de-fechas", BloqueDeFechasViewSet, basename="bloques-de-fechas")
router.register(r"semanas-config", SemanaConfigViewSet, basename="semanas-config")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/dashboard-stats/", DashboardStatsView.as_view(), name="dashboard-stats"),
    path("api/user/", UserView.as_view(), name="user-details"),
    path("api/estructura/", EstructuraProgramaView.as_view(), name="estructura-programa"),
    path("api/historico-cursos/", HistoricoCursoView.as_view(), name="historico-cursos"),
    path("api/analytics/enrollments/", AnalyticsEnrollmentsView.as_view(), name="analytics-enrollments"),
    path("api/analytics/attendance/", AnalyticsAttendanceView.as_view(), name="analytics-attendance"),
    path("api/analytics/grades/", AnalyticsGradesView.as_view(), name="analytics-grades"),
    path("api/analytics/dropout/", AnalyticsDropoutView.as_view(), name="analytics-dropout"),
    path("api/analytics/graduates/", AnalyticsGraduatesView.as_view(), name="analytics-graduates"),
    path("api/administracion/grafico-cursos/", CoursesGraphView.as_view(), name="courses-graph"),
    path("api/", include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    # --- OpenAPI schema + UIs ---
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),                 # JSON
    path('api/schema.yaml', SpectacularAPIView.as_view(), name='schema-yaml'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
