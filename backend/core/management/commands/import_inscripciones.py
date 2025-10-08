# backend/core/management/commands/import_inscripciones.py
from django.core.management.base import BaseCommand
from core.models import Estudiante
import pandas as pd
from pathlib import Path
import json

COLS = {
    "DNI": "dni",
    "Apellidos": "apellido",
    "Nombres": "nombre",
    "Correo Electrónico": "email",
    "Teléfono (2964123456)": "telefono",
    "Domicilio Particular": "domicilio",
    "Barrio y ciudad": "barrio",
    "Fecha de Nacimiento": "fecha_nacimiento",
    "Sexo": "sexo",
    "CUIL": "cuil",
    "País de Nacimiento": "pais_nacimiento",
    "Nacionalidad": "nacionalidad",
    "Lugar de Nacimiento": "lugar_nacimiento",
    "Estudios de nivel alcanzado": "nivel_educativo",
    "¿Posee pc en su domicilio?": "posee_pc",
    "¿Posee conectividad a internet?": "posee_conectividad",
    "¿Puede asistir a clase con su computadora personal?": "asistir_con_pc",
    "¿Trabaja?": "trabaja",
    "Lugar de trabajo": "lugar_trabajo",
    "DNI Digitalizado": "dni_digitalizado",
}

BOOL_COLS = [
    "posee_pc",
    "posee_conectividad",
    "asistir_con_pc",
    "trabaja",
    "dni_digitalizado",
]

class Command(BaseCommand):
    help = "Importa inscripciones desde Excel/CSV a Estudiante"

    def add_arguments(self, parser):
        parser.add_argument("--file", default="data/inscripciones.xlsx")

    def handle(self, *args, **opts):
        path = Path(opts["file"])
        if not path.exists():
            self.stderr.write(f"No existe {path}")
            return
        if path.suffix.lower() in [".xlsx", ".xls"]:
            df = pd.read_excel(path, dtype=str)
        else:
            df = pd.read_csv(path, dtype=str)
        df = df.fillna("")

        created, updated, skipped = 0, 0, 0
        for _, r in df.iterrows():
            if not str(r.get("DNI", "")).strip():
                skipped += 1
                continue
            defaults = {}
            for src, dst in COLS.items():
                val = str(r.get(src, "")).strip()
                if dst == "fecha_nacimiento" and val:
                    try:
                        val = pd.to_datetime(val, dayfirst=True, errors="coerce").date()
                    except Exception:
                        val = None
                if dst in BOOL_COLS:
                    val = val.lower() == "si"
                defaults[dst] = val
            obj, is_new = Estudiante.objects.update_or_create(dni=str(r["DNI"]).strip(), defaults=defaults)
            created += int(is_new)
            updated += int(not is_new)

        result = {
            "imported": created,
            "updated": updated,
            "skipped": skipped,
            "errors": [],
            "source_file": path.name,
        }
        self.stdout.write(json.dumps(result))
