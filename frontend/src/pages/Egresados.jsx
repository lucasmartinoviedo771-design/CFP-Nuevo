import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Alert } from '@mui/material';
import { listProgramas } from '../services/programasService';
import api from '../services/apiClient';
import analytics from '../services/analyticsService';

export default function Egresados() {
  const [programas, setProgramas] = useState([]);
  const [cohortes, setCohortes] = useState([]);
  const [programaId, setProgramaId] = useState('');
  const [cohorteId, setCohorteId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const boot = async () => {
      try {
        const progs = await listProgramas({ page: 1, page_size: 200 });
        setProgramas(progs.results || progs);
      } catch (e) {}
    };
    boot();
  }, []);

  useEffect(() => {
    const loadCohortes = async () => {
      if (!programaId) { setCohortes([]); setCohorteId(''); return; }
      try {
        const res = await api.get('/cohortes/', { params: { programa: programaId, page: 1, page_size: 200 } });
        setCohortes(res.data.results || res.data);
      } catch (e) { setCohortes([]); }
    };
    loadCohortes();
  }, [programaId]);

  const fetchGraduates = async () => {
    setLoading(true); setError(''); setData(null);
    try {
      const params = {};
      if (cohorteId) params.cohorte_id = cohorteId; else if (programaId) params.programa_id = programaId;
      const d = await analytics.getGraduates(params);
      setData(d);
    } catch (e) {
      setError('Error al cargar egresados');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Egresados</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="prog-label">Programa</InputLabel>
              <Select labelId="prog-label" label="Programa" value={programaId}
                onChange={(e) => { setProgramaId(e.target.value); setData(null); }}>
                <MenuItem value=""><em>Seleccione</em></MenuItem>
                {(programas || []).map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="coh-label">Cohorte (opcional)</InputLabel>
              <Select labelId="coh-label" label="Cohorte (opcional)" value={cohorteId}
                onChange={(e) => { setCohorteId(e.target.value); setData(null); }} disabled={!programaId}>
                <MenuItem value=""><em>Todas</em></MenuItem>
                {(cohortes || []).map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={fetchGraduates} disabled={!programaId}>Cargar</Button>
          </Box>
        </CardContent>
      </Card>

      {loading && <CircularProgress />}
      {error && <Alert severity="error">{error}</Alert>}

      {data && (
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>{data.programa?.nombre} {data.cohorte_id ? `(Cohorte ${data.cohorte_id})` : ''}</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bloques requeridos: {data.overall?.total_bloques_requeridos} — Egresados: {data.overall?.graduados} / {data.overall?.total_estudiantes} ({Math.round((data.overall?.rate||0)*100)}%)
            </Typography>
            {(!data.graduados || data.graduados.length === 0) ? (
              <Typography color="text.secondary">No hay egresados para los filtros seleccionados.</Typography>
            ) : (
              <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                {data.graduados.map(s => (
                  <li key={s.id}>{s.apellido}, {s.nombre} — DNI {s.dni}</li>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

