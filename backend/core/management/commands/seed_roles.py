from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.apps import apps

APP = "core"

# helper para listar permisos por modelo + acciones
def perms(model, actions):
    return [f"{a}_{model}" for a in actions]

class Command(BaseCommand):
    help = "Crea grupos (Preceptor, Coordinacion, Docente, Secretaria opcional) y asigna permisos"

    def handle(self, *args, **opts):
        # Modelos en la app core
        models = {
            "estudiante": apps.get_model(APP, "Estudiante"),
            "inscripcion": apps.get_model(APP, "Inscripcion"),
            "asistencia": apps.get_model(APP, "Asistencia"),
            "programa": apps.get_model(APP, "Programa"),
            "bateria": apps.get_model(APP, "Bateria"),
            "bloque": apps.get_model(APP, "Bloque"),
            "modulo": apps.get_model(APP, "Modulo"),
            "examen": apps.get_model(APP, "Examen"),
            "nota": apps.get_model(APP, "Nota"),
        }

        # --- MATRIZ DE PERMISOS ---
        # Preceptor: ver todo, y cargar/editar asistencia
        preceptor_perms = (
            # view de todos los modelos
            sum([perms(m, ["view"]) for m in models.keys()], []) +
            # add/change de asistencia
            perms("attendance", ["add","change"])
        )

        # Coordinacion: solo ver todo
        coordinacion_perms = sum([perms(m, ["view"]) for m in models.keys()], [])

        # Docente: solo ver todo
        docente_perms = sum([perms(m, ["view"]) for m in models.keys()], [])

        # (OPCIONAL) Secretaría: ver + cargar/editar Estudiantes, Inscripciones y Notas
        secretaria_perms = (
            sum([perms(m, ["view"]) for m in models.keys()], []) +
            perms("student", ["add","change"]) +
            perms("enrollment", ["add","change"]) +
            perms("grade", ["add","change"])
        )

        groups_def = {
            "Preceptor": preceptor_perms,
            "Coordinacion": coordinacion_perms,
            "Docente": docente_perms,
            # Descomenta si querés usar Secretaría:
            "Secretaria": secretaria_perms,
        }

        for gname, cnames in groups_def.items():
            g, _ = Group.objects.get_or_create(name=gname)
            g.permissions.clear()
            qs = Permission.objects.filter(content_type__app_label=APP, codename__in=cnames)
            for p in qs:
                g.permissions.add(p)
            self.stdout.write(self.style.SUCCESS(f"[{gname}] permisos asignados: {qs.count()}"))

        self.stdout.write(self.style.SUCCESS("Grupos creados y permisos aplicados."))
