import { useState, useRef } from "react";
import {
  Card, CardContent, Stack, Typography, Button, LinearProgress, Alert, Snackbar
} from "@mui/material";
import UploadIcon from "@mui/icons-material/UploadFile";

const ACCEPTED = [".csv", ".xlsx",
  "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];

export default function FileUpload({
  title = "Subir archivo",
  description,
  endpoint,
  onUpload,
  doUpload,
  maxSizeMB = 25,
  accept = ".csv,.xlsx",
}) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const inputRef = useRef(null);

  const handlePick = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const ext = `.${f.name.split(".").pop().toLowerCase()}`;
    const typeOk = ACCEPTED.includes(ext) || ACCEPTED.includes(f.type);
    if (!typeOk) return setError("Formato no soportado (.csv o .xlsx).");
    if (f.size > maxSizeMB * 1024 * 1024) return setError(`Máx ${maxSizeMB}MB.`);
    setError(""); setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !doUpload) return;
    setBusy(true); setProgress(0); setError(""); setOk("");
    try {
      const data = await doUpload(file, (evt) => {
        if (evt.total) setProgress(Math.round((evt.loaded * 100) / evt.total));
      });
      setOk("Archivo procesado correctamente.");
      onUpload?.(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || "Error al subir.";
      setError(msg);
    } finally { setBusy(false); }
  };

  const clear = () => {
    setFile(null); inputRef.current && (inputRef.current.value = "");
    setProgress(0); setError(""); setOk("");
  };

  return (
    <Card variant="outlined" sx={{ maxWidth: 880, m: "0 auto" }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="h5" fontWeight={700}>{title}</Typography>
          {description && <Typography variant="body2" color="text.secondary">{description}</Typography>}

          <Stack direction="row" spacing={2}>
            <Button component="label" startIcon={<UploadIcon />} disabled={busy}>
              Seleccionar archivo
              <input ref={inputRef} type="file" hidden accept={accept} onChange={handlePick} />
            </Button>
            <Button disabled={!file || busy} onClick={handleUpload}>Subir y procesar</Button>
            <Button disabled={busy} onClick={clear} variant="outlined">Limpiar</Button>
            {file && <Typography variant="body2" sx={{ alignSelf: "center" }}>{file.name}</Typography>}
          </Stack>

          {busy && <>
            <LinearProgress variant="determinate" value={progress} />
            <Typography variant="caption">{progress}%</Typography>
          </>}

          {error && <Alert severity="error">{error}</Alert>}
          <Snackbar open={!!ok} autoHideDuration={3200} onClose={() => setOk("")}
                    message={ok} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
        </Stack>
      </CardContent>
    </Card>
  );
}