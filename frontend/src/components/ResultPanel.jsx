import { Card, CardContent, Typography } from "@mui/material";

export default function ResultPanel({ result }) {
  if (!result) return null;
  return (
    <Card variant="outlined" sx={{ maxWidth: 880, m: "16px auto 0" }}>
      <CardContent>
        <Typography variant="h6">Resultado del proceso</Typography>
        <Typography variant="body2"><b>Importadas:</b> {result.imported ?? 0}</Typography>
        <Typography variant="body2"><b>Actualizadas:</b> {result.updated ?? 0}</Typography>
        {result.skipped !== undefined && (
          <Typography variant="body2"><b>Omitidas:</b> {result.skipped}</Typography>
        )}
        {Array.isArray(result.errors) && result.errors.length > 0 && (
          <>
            <Typography variant="subtitle2" sx={{ mt: 1 }}>Errores:</Typography>
            <ul>{result.errors.map((e, i) => <li key={i}><code>{typeof e === "string" ? e : JSON.stringify(e)}</code></li>)}</ul>
          </>
        )}
        {result.source_file && (
          <Typography variant="caption" color="text.secondary">Origen: {result.source_file}</Typography>
        )}
      </CardContent>
    </Card>
  );
}
