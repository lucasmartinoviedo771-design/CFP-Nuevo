import { useEffect, useState, useCallback } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";
import { 
  Box, Typography, CircularProgress, Breadcrumbs, Paper, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableRow, Accordion, 
  AccordionSummary, AccordionDetails, Select, MenuItem, FormControl, InputLabel, Divider
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { getCurso, listCohortes } from "../services/cursosService";
import { 
  listBloques, createBloque, deleteBloque,
  listModulos, createModulo, deleteModulo,
  listExamenes, createExamen, deleteExamen
} from "../services/estructuraService";
import { getCoursesGraph } from "../services/estructuraService";

// --- ModuloExamenManager (for Parcial/Recup) ---
function ModuloExamenManager({ modulo }) {
  const [examenes, setExamenes] = useState([]);
  const [form, setForm] = useState({ tipo_examen: 'PARCIAL', fecha: '', modulo: modulo.id, bloque: null });
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error' 

  const fetchExamenes = useCallback(async () => {
    try {
      const res = await listExamenes({ modulo: modulo.id });
      setExamenes(res.results || res);
    } catch (err) { console.error("Error fetching module examenes:", err); }
  }, [modulo.id]);

  useEffect(() => { fetchExamenes(); }, [fetchExamenes]);

  const handleFormChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const payload = { ...form };
      if (payload.fecha === '') payload.fecha = null;
      await createExamen(payload);
      setForm({ tipo_examen: 'PARCIAL', fecha: '', modulo: modulo.id, bloque: null });
      fetchExamenes();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("Error creating module examen:", err.response?.data || err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar examen?")) {
      setSaveStatus('saving');
      try {
        await deleteExamen(id);
        fetchExamenes();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Error deleting module examen:", err.response?.data || err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{mt:1}}>Exámenes del Módulo (Parciales)</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, my: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{minWidth: 150}}>
          <InputLabel>Tipo</InputLabel>
          <Select name="tipo_examen" value={form.tipo_examen} label="Tipo" onChange={handleFormChange}>
            <MenuItem value="PARCIAL">Parcial</MenuItem>
            <MenuItem value="RECUP">Recuperatorio</MenuItem>
          </Select>
        </FormControl>
        <TextField name="fecha" type="date" value={form.fecha} onChange={handleFormChange} size="small" InputLabelProps={{ shrink: true }} />
        <Button type="submit" variant="outlined" size="small" disabled={saveStatus === 'saving'}>Agregar Examen</Button>
        {saveStatus === 'saving' && <CircularProgress size={20} />} 
        {saveStatus === 'saved' && <Typography color="success">Guardado ✓</Typography>}
        {saveStatus === 'error' && <Typography color="error">Error al guardar</Typography>}
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            {examenes.map(ex => (
              <TableRow key={ex.id}>
                <TableCell>{ex.tipo_examen}</TableCell>
                <TableCell>{ex.fecha || '-'}</TableCell>
                <TableCell align="right"><Button onClick={() => handleDelete(ex.id)} size="small" color="error">X</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// --- BloqueExamenManager (for Finals/Equiv) ---
function BloqueExamenManager({ bloque }) {
  const [examenes, setExamenes] = useState([]);
  const [form, setForm] = useState({ tipo_examen: 'FINAL_SINC', fecha: '', bloque: bloque.id, modulo: null });
  const [saveStatus, setSaveStatus] = useState('idle');

  const fetchExamenes = useCallback(async () => {
    try {
      const res = await listExamenes({ bloque: bloque.id });
      setExamenes(res.results || res);
    } catch (err) { console.error("Error fetching bloque examenes:", err); }
  }, [bloque.id]);

  useEffect(() => { fetchExamenes(); }, [fetchExamenes]);

  const handleFormChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const payload = { ...form };
      if (payload.fecha === '') payload.fecha = null;
      await createExamen(payload);
      setForm({ tipo_examen: 'FINAL_SINC', fecha: '', bloque: bloque.id, modulo: null });
      fetchExamenes();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("Error creating bloque examen:", err.response?.data || err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar examen final?")) {
      setSaveStatus('saving');
      try {
        await deleteExamen(id);
        fetchExamenes();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Error deleting bloque examen:", err.response?.data || err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{mt:2}}>Exámenes Finales del Bloque</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, my: 1, alignItems: 'center' }}>
        <FormControl size="small" sx={{minWidth: 150}}>
          <InputLabel>Tipo</InputLabel>
          <Select name="tipo_examen" value={form.tipo_examen} label="Tipo" onChange={handleFormChange}>
            <MenuItem value="FINAL_VIRTUAL">Final Virtual</MenuItem>
            <MenuItem value="FINAL_SINC">Final Sincrónico</MenuItem>
            <MenuItem value="EQUIVALENCIA">Equivalencia</MenuItem>
          </Select>
        </FormControl>
        <TextField name="fecha" type="date" value={form.fecha} onChange={handleFormChange} size="small" InputLabelProps={{ shrink: true }} />
        <Button type="submit" variant="outlined" size="small" disabled={saveStatus === 'saving'}>Agregar Examen Final</Button>
        {saveStatus === 'saving' && <CircularProgress size={20} />} 
        {saveStatus === 'saved' && <Typography color="success">Guardado ✓</Typography>}
        {saveStatus === 'error' && <Typography color="error">Error al guardar</Typography>}
      </Box>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableBody>
            {examenes.map(ex => (
              <TableRow key={ex.id}>
                <TableCell>{ex.tipo_examen}</TableCell>
                <TableCell>{ex.fecha || '-'}</TableCell>
                <TableCell align="right"><Button onClick={() => handleDelete(ex.id)} size="small" color="error">X</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}


// --- ModuloManager ---
function ModuloManager({ bloque }) {
  const [modulos, setModulos] = useState([]);
  const [form, setForm] = useState({ nombre: '', orden: 10, bloque: bloque.id });
  const [saveStatus, setSaveStatus] = useState('idle');

  const fetchModulos = useCallback(async () => {
    try {
      const res = await listModulos({ bloque: bloque.id });
      setModulos(res.results || res);
    } catch (err) { console.error("Error fetching modulos:", err); }
  }, [bloque.id]);

  useEffect(() => { fetchModulos(); }, [fetchModulos]);

  const handleFormChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await createModulo(form);
      setForm({ nombre: '', orden: 10, bloque: bloque.id });
      fetchModulos();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("Error creating modulo:", err.response?.data || err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar módulo? Se borrarán sus exámenes.")) {
      setSaveStatus('saving');
      try {
        await deleteModulo(id);
        fetchModulos();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Error deleting modulo:", err.response?.data || err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }
  };

  return (
    <Box>
      <Typography variant="subtitle1" sx={{mt:1}}>Módulos del Bloque</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 1, my: 1, alignItems: 'center' }}>
        <TextField name="nombre" value={form.nombre} onChange={handleFormChange} label="Nombre del Módulo" size="small" required />
        <TextField name="orden" value={form.orden} onChange={handleFormChange} label="Orden" type="number" size="small" required />
        <Button type="submit" variant="outlined" size="small" disabled={saveStatus === 'saving'}>Agregar Módulo</Button>
        {saveStatus === 'saving' && <CircularProgress size={20} />} 
        {saveStatus === 'saved' && <Typography color="success">Guardado ✓</Typography>}
        {saveStatus === 'error' && <Typography color="error">Error al guardar</Typography>}
      </Box>
      {modulos.map(m => (
        <Accordion key={m.id} sx={{ my: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ flexShrink: 0, mr: 2 }}>Orden: {m.orden}</Typography>
            <Typography sx={{ flexGrow: 1 }}>{m.nombre}</Typography>
            <Button onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }} size="small" color="error">Eliminar Módulo</Button>
          </AccordionSummary>
          <AccordionDetails>
            <ModuloExamenManager modulo={m} />
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

// --- BloqueManager ---
function BloqueManager({ curso, bloques, setBloques }) {
  const [form, setForm] = useState({ nombre: '', orden: 10, programa: curso.id });
  const [saveStatus, setSaveStatus] = useState('idle');

  useEffect(() => {
    setForm(f => ({ ...f, programa: curso.id }));
  }, [curso.id]);

  const fetchBloques = useCallback(async () => {
    try {
      const res = await listBloques({ programa: curso.id });
      setBloques(res.results || res);
    } catch (err) { console.error("Error fetching bloques:", err); }
  }, [curso.id, setBloques]);

  useEffect(() => { fetchBloques(); }, [fetchBloques, setBloques]);


  const handleFormChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      await createBloque(form);
      setForm({ nombre: '', orden: 10, programa: curso.id });
      fetchBloques();
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error("Error creating bloque:", err.response?.data || err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar bloque? Se borrarán sus módulos y exámenes.")) {
      setSaveStatus('saving');
      try {
        await deleteBloque(id);
        fetchBloques();
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error("Error deleting bloque:", err.response?.data || err);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }
  };

  return (
    <Box mt={2}>
      <Typography variant="h6">Bloques del Curso</Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', gap: 2, my: 2, alignItems: 'center' }}>
        <TextField name="nombre" value={form.nombre} onChange={handleFormChange} label="Nombre del Bloque" size="small" required />
        <TextField name="orden" value={form.orden} onChange={handleFormChange} label="Orden" type="number" size="small" required />
        <Button type="submit" variant="contained" disabled={saveStatus === 'saving'}>Agregar Bloque</Button>        
        {saveStatus === 'saving' && <CircularProgress size={20} />} 
        {saveStatus === 'saved' && <Typography color="success">Guardado ✓</Typography>}
        {saveStatus === 'error' && <Typography color="error">Error al guardar</Typography>}
      </Box>

      {bloques && bloques.length > 0 ? (
        bloques.map(b => (
          <Accordion key={b.id}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flexShrink: 0, mr: 2 }}>Orden: {b.orden}</Typography>
              <Typography sx={{ flexGrow: 1 }}>{b.nombre}</Typography>
              <Button onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }} size="small" color="error">Eliminar Bloque</Button>
            </AccordionSummary>
            <AccordionDetails>
              <BloqueExamenManager bloque={b} />
              <Divider sx={{ my: 2 }} />
              <ModuloManager bloque={b} />
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>No hay bloques definidos.</Typography>
      )}
    </Box>
  );
}

function ModuloExamenPreview({ modulo }) {
  const [examenes, setExamenes] = useState([]);

  useEffect(() => {
    async function fetchModuloExamenes() {
      try {
        const res = await listExamenes({
          modulo: modulo.id,
          tipo_examen__in: 'PARCIAL,RECUP' // Filter for module exams
        });
        setExamenes(res.results || res);
      } catch (err) {
        console.error("Error fetching module examenes for preview:", err);
      }
    }
    fetchModuloExamenes();
  }, [modulo.id]);

  if (examenes.length === 0) return null;

  return (
    <Box sx={{ mt: 1, ml: 2 }}>
      <Typography variant="subtitle2">Exámenes del Módulo:</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5 }}>
        <Table size="small">
          <TableBody>
            {examenes.map(ex => (
              <TableRow key={ex.id}>
                <TableCell>{ex.tipo_examen}</TableCell>
                <TableCell>{ex.fecha || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function ModuloPreview({ bloque }) {
  const [modulos, setModulos] = useState([]);

  useEffect(() => {
    async function fetchModulos() {
      try {
        const res = await listModulos({ bloque: bloque.id });
        setModulos(res.results || res);
      } catch (err) {
        console.error("Error fetching modulos for preview:", err);
      }
    }
    fetchModulos();
  }, [bloque.id]);

  if (modulos.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1">Módulos:</Typography>
      {modulos.map(modulo => (
        <Accordion key={modulo.id} defaultExpanded sx={{ ml: 2, my: 1 }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Módulo {modulo.orden}: {modulo.nombre}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <ModuloExamenPreview modulo={modulo} />
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}

function BloqueExamenPreview({ bloque }) {
  const [examenes, setExamenes] = useState([]);

  useEffect(() => {
    async function fetchBloqueExamenes() {
      try {
        const res = await listExamenes({
          bloque: bloque.id,
          tipo_examen__in: 'FINAL_SINC,FINAL_VIRTUAL,EQUIVALENCIA' // Filter for final exams
        });
        setExamenes(res.results || res);
      } catch (err) {
        console.error("Error fetching bloque examenes for preview:", err);
      }
    }
    fetchBloqueExamenes();
  }, [bloque.id]);

  if (examenes.length === 0) return null;

  return (
    <Box sx={{ mt: 2, ml: 2 }}>
      <Typography variant="subtitle1">Exámenes Finales del Bloque:</Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
        <Table size="small">
          <TableBody>
            {examenes.map(ex => (
              <TableRow key={ex.id}>
                <TableCell>{ex.tipo_examen}</TableCell>
                <TableCell>{ex.fecha || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function CoursePreview({ curso, bloques }) {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>Vista Previa del Curso: {curso.nombre}</Typography>
      {bloques.length > 0 ? (
        bloques.map(bloque => (
          <Accordion key={bloque.id} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">Bloque {bloque.orden}: {bloque.nombre}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ModuloPreview bloque={bloque} />
              <BloqueExamenPreview bloque={bloque} />
            </AccordionDetails>
          </Accordion>
        ))
      ) : (
        <Typography>No hay bloques definidos para este curso.</Typography>
      )}
    </Box>
  );
}

// --- Main Component ---
export default function CursoDetail() {
  const { id } = useParams();
  const [curso, setCurso] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'
  const [bloques, setBloques] = useState([]);
  // Inline graph (API-based)
  const [cohortes, setCohortes] = useState([]);
  const [cohorteId, setCohorteId] = useState('');
  const [graph, setGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const currentCurso = await getCurso(id);
      setCurso(currentCurso);
      
      const bloquesData = await listBloques({ programa: currentCurso.id });
      setBloques(bloquesData.results || bloquesData);

    } catch (err) {
      console.error("Failed to fetch course structure:", err);
      setError("Ocurrió un error al cargar la estructura del curso.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchData();
  }, [id, fetchData]);

  useEffect(() => {
    const loadCohorts = async () => {
      try {
        const res = await listCohortes({ programa: id, page: 1, page_size: 200 });
        setCohortes(res.results || res);
      } catch (e) {
        setCohortes([]);
      }
    };
    if (id) loadCohorts();
  }, [id]);

  const handleLoadGraph = async () => {
    if (!id) return;
    setGraphLoading(true);
    try {
      const data = await getCoursesGraph({ programa_id: id, cohorte_id: cohorteId || undefined });
      setGraph(data);
    } catch (e) {
      setGraph(null);
    } finally {
      setGraphLoading(false);
    }
  };

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">{error}</Typography>;
  if (!curso) return <Typography>No se encontró el curso.</Typography>;

  return (
    <Box>
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
        <RouterLink to="/cursos">Capacitaciones / Cursos</RouterLink>
        <Typography color="text.primary">{curso.nombre}</Typography>
      </Breadcrumbs>

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" gutterBottom>{curso.nombre}</Typography>
        <Button variant="outlined" onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}> 
          {viewMode === 'edit' ? 'Vista Previa' : 'Volver a Edición'}
        </Button>
      </Box>
      
      <Paper sx={{p: 2, mt: 2}}>
        {/* Grafico de Curso (API) */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Gráfico del Curso (API)</Typography>
          <Box sx={{ display:'flex', gap:2, alignItems:'center', flexWrap:'wrap', mb: 1 }}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <InputLabel id="coh-label">Cohorte (opcional)</InputLabel>
              <Select labelId="coh-label" label="Cohorte (opcional)" value={cohorteId} onChange={(e)=>setCohorteId(e.target.value)}>
                <MenuItem value=""><em>Todas</em></MenuItem>
                {(cohortes||[]).map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="outlined" size="small" onClick={handleLoadGraph} disabled={graphLoading}>Cargar</Button>
            {graphLoading && <CircularProgress size={20} />}
          </Box>
          {graph && (
            <Box>
              {(graph.tree || []).map(blo => (
                <Accordion key={`blo-${blo.id}`} sx={{ my: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>Bloque {blo.orden}: {blo.nombre}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {(blo.children || []).map(mod => (
                      <Box key={`mod-${mod.id}`} sx={{ pl: 2, py: 0.5 }}>
                        <Typography variant="body2">Módulo {mod.orden}: {mod.nombre} {mod.es_practica ? '(Práctica)' : ''}</Typography>
                      </Box>
                    ))}
                    {Array.isArray(blo.finales) && blo.finales.length > 0 && (
                      <Box sx={{ pl: 2, pt: 1 }}>
                        <Typography variant="subtitle2">Finales del Bloque</Typography>
                        {blo.finales.map(fin => (
                          <Typography key={`fin-${fin.id}`} variant="body2" color="text.secondary">- {fin.tipo_examen} {fin.fecha ? `(${fin.fecha})` : ''}</Typography>
                        ))}
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </Box>

        {viewMode === 'edit' ? (
          <BloqueManager curso={curso} bloques={bloques} setBloques={setBloques} />
        ) : (
          <CoursePreview curso={curso} bloques={bloques} />
        )}
      </Paper>

    </Box>
  );
}