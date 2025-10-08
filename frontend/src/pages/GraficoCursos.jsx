import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, FormControl, InputLabel, Select, MenuItem, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Button } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { listProgramas } from '../services/programasService';
import api from '../services/apiClient';
import { getCoursesGraph } from '../services/estructuraService';

export default function GraficoCursos() {
  const [programas, setProgramas] = useState([]);
  const [cohortes, setCohortes] = useState([]);
  const [programaId, setProgramaId] = useState('');
  const [cohorteId, setCohorteId] = useState('');
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const boot = async () => {
      try {
        const progs = await listProgramas({ page: 1, page_size: 200 });
        setProgramas(progs.results || progs);
      } catch (e) {
        // ignore
      }
    };
    boot();
  }, []);

  useEffect(() => {
    const loadCohortes = async () => {
      if (!programaId) { setCohortes([]); setCohorteId(''); return; }
      try {
        const res = await api.get('/cohortes/', { params: { programa: programaId, page: 1, page_size: 200 } });
        setCohortes(res.data.results || res.data);
      } catch (e) {
        setCohortes([]);
      }
    }
    loadCohortes();
  }, [programaId]);

  const loadTree = async () => {
    if (!programaId) return;
    setLoading(true);
    try {
      const data = await getCoursesGraph({ programa_id: programaId, cohorte_id: cohorteId || undefined });
      setTree(data);
    } catch (e) {
      setTree(null);
    } finally {
      setLoading(false);
    }
  };

  const renderTree = () => {
    if (!tree) return null;
    return (
      <Box>
        {(tree.tree || []).map(bat => (
          <Accordion key={`bat-${bat.id}`} sx={{ mb: 1 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography fontWeight={600}>Bateria {bat.orden}: {bat.nombre}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {(bat.children || []).map(blo => (
                <Accordion key={`blo-${blo.id}`} sx={{ mb: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Bloque {blo.orden}: {blo.nombre}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(blo.children || []).map(mod => (
                      <Box key={`mod-${mod.id}`} sx={{ pl: 2, py: 0.5 }}>
                        <Typography variant="body2">
                          Modulo {mod.orden}: {mod.nombre} {mod.es_practica ? '(Practica)' : ''}
                          { (mod.fecha_inicio || mod.fecha_fin) && ` — ${mod.fecha_inicio || ''} ${mod.fecha_fin ? 'a ' + mod.fecha_fin : ''}` }
                        </Typography>
                      </Box>
                    ))}
                    {(!blo.children || blo.children.length === 0) && (
                      <Typography variant="body2" color="text.secondary">Sin modulos</Typography>
                    )}
                    {/* Finales del bloque */}
                    {Array.isArray(blo.finales) && blo.finales.length > 0 && (
                      <Box sx={{ pl: 2, pt: 1 }}>
                        <Typography variant="subtitle2">Finales del Bloque</Typography>
                        {blo.finales.map(fin => (
                          <Typography key={`fin-${fin.id}`} variant="body2" color="text.secondary">
                            - {fin.tipo_examen} {fin.fecha ? `(${fin.fecha})` : ''}
                          </Typography>
                        ))}
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
              {(!bat.children || bat.children.length === 0) && (
                <Typography variant="body2" color="text.secondary">Sin bloques</Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>
    );
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Grafico de Cursos (Arbol)</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="prog-label">Programa</InputLabel>
              <Select labelId="prog-label" label="Programa" value={programaId}
                onChange={(e) => { setProgramaId(e.target.value); setTree(null); }}>
                <MenuItem value=""><em>Seleccione</em></MenuItem>
                {(programas || []).map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 240 }} disabled={!programaId}>
              <InputLabel id="coh-label">Cohorte</InputLabel>
              <Select labelId="coh-label" label="Cohorte" value={cohorteId}
                onChange={(e) => setCohorteId(e.target.value)}>
                <MenuItem value=""><em>Opcional</em></MenuItem>
                {(cohortes || []).map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={loadTree} disabled={!programaId}>Cargar</Button>
          </Box>
        </CardContent>
      </Card>

      {loading ? <CircularProgress /> : renderTree()}
    </Box>
  );
}
