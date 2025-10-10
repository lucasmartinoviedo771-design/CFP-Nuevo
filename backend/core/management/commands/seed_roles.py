from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.apps import apps

APP = "core"

def perms(model, actions):
    """Helper para generar codenames de permisos (ej: add_estudiante)."""
    return [f"{action}_{model}" for action in actions]

class Command(BaseCommand):
    help = "Crea los grupos de roles y les asigna los permisos definidos."

    def handle(self, *args, **opts):
        self.stdout.write("Configurando roles y permisos...")

        # --- 1. DEFINICIÓN DE MODELOS ---
        # Nombres de los modelos sobre los que se aplicarán permisos.
        model_names = [
            "estudiante", "inscripcion", "asistencia", "programa", "bateria",
            "bloque", "modulo", "examen", "nota", "cohorte", "bloquedefechas"
        ]

        # --- 2. DEFINICIÓN DE PERMISOS POR ROL ---
        
        # Permisos de LECTURA para todos los modelos.
        view_all_perms = sum([perms(m, ["view"]) for m in model_names], [])

        # Permisos de GESTIÓN (lectura, creación, modificación, borrado).
        manage_all_perms = sum([perms(m, ["view", "add", "change", "delete"]) for m in model_names], [])

        # Preceptor: Lectura de todo + Gestión de Asistencias, Notas e Inscripciones.
        preceptor_perms = view_all_perms + \
                          perms("asistencia", ["add", "change", "delete"]) + \
                          perms("nota", ["add", "change", "delete"]) + \
                          perms("inscripcion", ["add", "change", "delete"])

        # Coordinación Docente: Solo lectura.
        coordinacion_perms = view_all_perms

        # Secretaría y Regencia: Acceso total.
        full_access_perms = manage_all_perms
        
        # Estudiante: Sin permisos.
        estudiante_perms = []

        groups_def = {
            "Secretaría": full_access_perms,
            "Regencia": full_access_perms,
            "Coordinación Docente": coordinacion_perms,
            "Docente": coordinacion_perms, # Mismos permisos que Coordinación
            "Preceptor": preceptor_perms,
            "Estudiante": estudiante_perms,
        }

        # --- 3. APLICACIÓN DE PERMISOS ---
        all_app_permissions = Permission.objects.filter(content_type__app_label=APP)

        for group_name, permission_codenames in groups_def.items():
            group, created = Group.objects.get_or_create(name=group_name)
            
            # Limpiar permisos existentes para un inicio limpio.
            group.permissions.clear()
            
            # Filtrar los permisos que realmente existen en la BD.
            permissions_to_add = all_app_permissions.filter(codename__in=permission_codenames)
            
            # Asignar permisos.
            group.permissions.add(*permissions_to_add)
            
            if created:
                self.stdout.write(self.style.SUCCESS(f"Grupo '{group_name}' creado."))
            self.stdout.write(f"  - Asignados {permissions_to_add.count()} permisos a '{group_name}'.")

        self.stdout.write(self.style.SUCCESS("\nConfiguración de roles finalizada con éxito."))