# backend/core/management/commands/seed_estructura.py
from django.core.management.base import BaseCommand
from core.models import Programa, Bateria, Bloque, Modulo

class Command(BaseCommand):
    help = "Crea estructura base de programas/bloques/módulos (ejemplos)."

    def handle(self, *args, **opts):
        data = []
        for codigo, nombre, baterias in data:
            prog, _ = Programa.objects.get_or_create(codigo=codigo, defaults={"nombre": nombre})
            for i, (bnombre, modulos) in enumerate(baterias, start=1):
                bat, _ = prog.baterias.get_or_create(nombre=bnombre, defaults={"orden": i})
                blk, _ = bat.bloques.get_or_create(nombre="Troncal", defaults={"orden": 1})
                for j, mnombre in enumerate(modulos, start=1):
                    blk.modulos.get_or_create(nombre=mnombre, defaults={"orden": j})
        self.stdout.write(self.style.SUCCESS("Estructura base creada."))