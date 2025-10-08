# backend/core/management/commands/import_asistencia.py
from django.core.management.base import BaseCommand
from core.models import Estudiante, Modulo, Asistencia
import pandas as pd
from pathlib import Path
import json

TRUE_SET = {"si","sí","true","1","p","presente","x"}
FALSE_SET = {"no","false","0","a","ausente","-"}

class Command(BaseCommand):
    help = "Importa asistencia desde Semana*.csv/xlsx en data/asistencia"

    def add_arguments(self, parser):
        parser.add_argument("--dir", default="data/asistencia")

    def handle(self, *args, **opts):
        d = Path(opts["dir"])
        files = sorted([p for p in d.glob("Semana*.*") if p.suffix.lower() in [".csv",".xlsx",".xls"]])
        total_rows, missing_students, missing_modules = 0, 0, 0

        for f in files:
            if f.suffix.lower() == ".csv":
                df = pd.read_csv(f, dtype=str).fillna("")
            else:
                df = pd.read_excel(f, dtype=str).fillna("")

            # Mapea a columnas estándar
            # ajustá aquí si tus encabezados reales difieren:
            COL_DNI, COL_MOD, COL_FECHA, COL_PRESENTE = "DNI", "Modulo", "Fecha", "Presente"

            # Normalizaciones
            df[COL_DNI] = df[COL_DNI].astype(str).str.strip()
            df[COL_MOD] = df[COL_MOD].astype(str).str.strip()
            df[COL_FECHA] = pd.to_datetime(df[COL_FECHA], dayfirst=True, errors="coerce").dt.date

            for _, r in df.iterrows():
                dni = r[COL_DNI]
                modulo_nombre = r[COL_MOD]
                fecha = r[COL_FECHA]
                presente_raw = str(r[COL_PRESENTE]).strip().lower()
                if not dni or not modulo_nombre or pd.isna(fecha):
                    continue
                presente = True if presente_raw in TRUE_SET else False if presente_raw in FALSE_SET else None
                if presente is None:
                    continue
                try:
                    estudiante = Estudiante.objects.get(dni=dni)
                except Estudiante.DoesNotExist:
                    missing_students += 1
                    continue
                try:
                    modulo = Modulo.objects.get(nombre=modulo_nombre)
                except Modulo.DoesNotExist:
                    missing_modules += 1
                    continue

                Asistencia.objects.update_or_create(
                    estudiante=estudiante, modulo=modulo, fecha=fecha,
                    defaults={"presente": presente, "archivo_origen": f.name}
                )
                total_rows += 1

        result = {
            "imported": total_rows,
            "updated": 0, # This command does not track updates
            "skipped": 0, # This command does not track skipped rows
            "errors": [f"Alumnos faltantes: {missing_students}", f"Módulos faltantes: {missing_modules}"],
            "source_file": f.name if 'f' in locals() else '',
        }
        self.stdout.write(json.dumps(result))