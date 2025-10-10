# backend/core/admin.py
from django.contrib import admin
from .models import Programa, Bloque, Modulo, Estudiante, Inscripcion, Examen, Nota, Asistencia, BloqueDeFechas

@admin.register(Estudiante)
class EstudianteAdmin(admin.ModelAdmin):
    list_display = ("dni", "apellido", "nombre", "email", "ciudad", "barrio", "posee_pc", "posee_conectividad", "trabaja", "estatus")
    search_fields = ("dni", "apellido", "nombre", "email")
    list_filter = ("ciudad", "barrio", "posee_pc", "posee_conectividad", "trabaja", "estatus")

@admin.register(Programa)
class ProgramaAdmin(admin.ModelAdmin):
    list_display = ("codigo", "nombre", "activo")
    search_fields = ("codigo", "nombre")
    list_filter = ("activo",)

admin.site.register([Bloque, Modulo, Inscripcion, Examen, Nota, Asistencia, BloqueDeFechas])
