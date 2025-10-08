# backend/core/management/commands/import_notas.py
from django.core.management.base import BaseCommand
from core.models import Estudiante, Modulo, Examen, Nota
import pandas as pd
from pathlib import Path
from django.db import transaction
import json

class Command(BaseCommand):
    help = "Importa notas (incluye equivalencias sobre FINAL). CSV/XLSX con columnas estándar."

    def add_arguments(self, parser):
        parser.add_argument("--file", default="data/notas.csv")

    def handle(self, *args, **opts):
        path = Path(opts["file"])
        if not path.exists():
            self.stderr.write(f"No existe {path}")
            return
        if path.suffix.lower() in [".xlsx",".xls"]:
            df = pd.read_excel(path, dtype=str).fillna("")
        else:
            df = pd.read_csv(path, dtype=str).fillna("")

        # Encabezados esperados (ajusta si hace falta):
        # DNI, Modulo, TipoExamen (PARCIAL|RECUP|FINAL), Fecha, Nota, EsEquivalencia, OrigenEquivalencia, FechaOrigen
        total, created, updated, skipped = 0, 0, 0, 0

        for _, r in df.iterrows():
            total += 1
            dni = str(r.get("DNI","")).strip()
            modulo_nombre = str(r.get("Modulo","")).strip()
            tipo_examen = str(r.get("TipoExamen","")).strip().upper()
            fecha = pd.to_datetime(r.get("Fecha",""), dayfirst=True, errors="coerce").date() if r.get("Fecha","") else None
            calificacion_raw = str(r.get("Nota","")).replace(",", ".")
            try:
                calificacion = float(calificacion_raw)
            except:
                skipped += 1
                continue
            es_equivalencia = str(r.get("EsEquivalencia","")).strip().lower() in {"si","sí","true","1","x"}
            origen = str(r.get("OrigenEquivalencia","")).strip()
            fecha_origen = pd.to_datetime(r.get("FechaOrigen",""), dayfirst=True, errors="coerce").date() if r.get("FechaOrigen","") else None

            # Reglas de equivalencia
            if es_equivalencia and tipo_examen != "FINAL":
                self.stderr.write(f"[SKIP] Equivalencia solo con FINAL - DNI {dni} Mod {modulo_nombre}")
                skipped += 1
                continue

            try:
                estudiante = Estudiante.objects.get(dni=dni)
                modulo = Modulo.objects.get(nombre=modulo_nombre)
            except Exception:
                skipped += 1
                continue

            examen, _ = Examen.objects.get_or_create(modulo=modulo, tipo_examen=tipo_examen, defaults={"fecha": fecha or None})
            # aprobado derivado si no hay flag en archivo
            aprobado = calificacion >= 6.0

            with transaction.atomic():
                # Para FINAL, evitar duplicidad por módulo/estudiante
                if tipo_examen == "FINAL":
                    existing_final = Nota.objects.filter(
                        examen__modulo=modulo, estudiante=estudiante, examen__tipo_examen="FINAL"
                    ).exclude(examen=examen).first()
                    if existing_final:
                        # Política: si ya hay FINAL, actualizamos ese registro si viene equivalencia (o actualizamos el actual).
                        # Puedes cambiar a "skip" si preferís no tocarlo.
                        g = existing_final
                        g.calificacion = calificacion
                        g.aprobado = aprobado
                        g.es_equivalencia = es_equivalencia
                        g.origen_equivalencia = origen if es_equivalencia else ""
                        g.fecha_ref_equivalencia = fecha_origen if es_equivalencia else None
                        g.save()
                        updated += 1
                        continue

                grade, was_created = Nota.objects.update_or_create(
                    examen=examen, estudiante=estudiante,
                    defaults=dict(
                        calificacion=calificacion,
                        aprobado=aprobado,
                        es_equivalencia=es_equivalencia,
                        origen_equivalencia=origen if es_equivalencia else "",
                        fecha_ref_equivalencia=fecha_origen if es_equivalencia else None,
                    )
                )
                if was_created: created += 1
                else: updated += 1

        result = {
            "imported": created,
            "updated": updated,
            "skipped": skipped,
            "errors": [],
            "source_file": path.name,
        }
        self.stdout.write(json.dumps(result))