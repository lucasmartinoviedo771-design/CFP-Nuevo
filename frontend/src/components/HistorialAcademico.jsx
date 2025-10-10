import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardHeader, CardContent, Grid, TextField, Button, Typography, Divider, Tooltip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Checkbox } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc'; // Import the UTC plugin
import apiClient from '../services/apiClient';
import { listInscripciones } from '../services/inscripcionesService';
import { listNotas } from '../services/notasService';
dayjs.extend(utc); // Extend dayjs with the UTC plugin

// These functions are needed by CreateNotaModal
async function fetchExamenesByModulo(moduloId) {
  const { data } = await apiClient.get('/examenes/', {
    params: { modulo: moduloId, tipo_examen: 'PARCIAL,RECUP' }
  });
  return data.results || data;
}

async function fetchExamenesFinalesByBloque(bloqueId) {
  const { data } = await apiClient.get('/examenes/', {
    params: { bloque: bloqueId, tipo_examen: 'FINAL_VIRTUAL,FINAL_SINC,EQUIVALENCIA' }
  });
  return data.results || data;
}

function CreateNotaModal({ open, onClose, studentId, cursos, onSave }) {
  const [curso, setCurso] = useState('');
  const [bloque, setBloque] = useState('');
  const [modulo, setModulo] = useState('');
  const [examen, setExamen] = useState('');
  const [calificacion, setCalificacion] = useState('');
  const [fechaCalificacion, setFechaCalificacion] = useState(dayjs().format('YYYY-MM-DD'));
  const [esEquivalencia, setEsEquivalencia] = useState(false);
  const [estructura, setEstructura] = useState(null);
  const [examenes, setExamenes] = useState([]);
  const [existingNote, setExistingNote] = useState(null);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [approvedModuleExamTypes, setApprovedModuleExamTypes] = useState(new Set());
  const [studentApprovedModuleIds, setStudentApprovedModuleIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch student enrollments
  useEffect(() => {
    if (!studentId) {
      setStudentEnrollments([]);
      return;
    }
    (async () => {
      try {
        const { results } = await listInscripciones({ estudiante: studentId, estado: 'ACTIVO', page_size: 500 });
        setStudentEnrollments(results || []);
      } catch (error) {
        console.error("Error fetching student enrollments:", error);
        setStudentEnrollments([]);
      }
    })();
  }, [studentId]);

  // Fetch approved module exam types for the selected student and module
  useEffect(() => {
    if (!studentId || !modulo) {
      setApprovedModuleExamTypes(new Set());
      return;
    }
    (async () => {
      try {
        const { results } = await listNotas({ estudiante: studentId, examen__modulo: modulo, aprobado: true, page_size: 500 });
        const approvedTypes = new Set(results.map(nota => nota.examen_tipo_examen));
        setApprovedModuleExamTypes(approvedTypes);
      } catch (error) {
        console.error("Error fetching approved module exam types:", error);
        setApprovedModuleExamTypes(new Set());
      }
    })();
  }, [studentId, modulo]);

  // Fetch all approved module IDs for the student
  useEffect(() => {
    if (!studentId) {
      setStudentApprovedModuleIds(new Set());
      return;
    }
    (async () => {
      try {
        const { results } = await listNotas({ estudiante: studentId, aprobado: true, page_size: 500 });
        const approvedModIds = new Set(results.map(nota => nota.examen_modulo_id).filter(Boolean));
        setStudentApprovedModuleIds(approvedModIds);
      } catch (error) {
        console.error("Error fetching all approved module IDs:", error);
        setStudentApprovedModuleIds(new Set());
      }
    })();
  }, [studentId]);

  useEffect(() => {
    if (!examen || !studentId) {
      setExistingNote(null);
      return;
    }
    (async () => {
      const { data } = await apiClient.get('/notas/', { params: { estudiante: studentId, examen: examen, aprobado: true } });
      if (data.results && data.results.length > 0) {
        setExistingNote(data.results[0]);
      } else {
        setExistingNote(null);
      }
    })();
  }, [examen, studentId]);

  useEffect(() => {
    if (!curso) {
      setEstructura(null);
      setBloque('');
      setModulo('');
      setExamen('');
      return;
    }
    (async () => {
      const { data } = await apiClient.get('/estructura/', { params: { programa: curso }});
      setEstructura(data);
      setBloque('');
      setModulo('');
      setExamen('');
    })();
  }, [curso]);

  useEffect(() => {
    setModulo('');
    setExamen('');
  }, [bloque]);

  useEffect(() => {
    setExamen('');
  }, [modulo]);

  useEffect(() => {
    const fetchAndFilterExams = async () => {
      let fetchedExams = [];
      let isFinalExamsForSingleModuleBlock = false;

      if (modulo) {
        // Always fetch partial/recuperatorio for a specific module
        fetchedExams = await fetchExamenesByModulo(modulo);
      } else if (bloque) {
        const currentBloque = estructura?.bloques.find(b => b.id === Number(bloque));
        if (currentBloque && currentBloque.modulos && currentBloque.modulos.length === 1) {
          // If block has only one module, treat its exams as final exams
          isFinalExamsForSingleModuleBlock = true;
          fetchedExams = await fetchExamenesFinalesByBloque(bloque);
        } else {
          // Otherwise, fetch final exams for the block (normal multi-module block)
          fetchedExams = await fetchExamenesFinalesByBloque(bloque);
        }
      } else {
        setExamenes([]);
        return;
      }

      let filteredExams = fetchedExams || [];

      // Rule 1: If a PARCIAL is approved for a module, don't show PARCIAL as an option
      if (modulo && approvedModuleExamTypes.has('PARCIAL')) {
        filteredExams = filteredExams.filter(ex => ex.tipo_examen !== 'PARCIAL');
      }

      // Rule 2: For multi-module blocks, only show final exams if all modules are approved
      if (bloque && !modulo && !isFinalExamsForSingleModuleBlock) { // Only for multi-module blocks
        const currentBloque = estructura?.bloques.find(b => b.id === Number(bloque));
        if (currentBloque && currentBloque.modulos) {
          const allModuleIdsInBlock = new Set(currentBloque.modulos.map(m => m.id));
          const allModulesApproved = Array.from(allModuleIdsInBlock).every(modId => studentApprovedModuleIds.has(modId));

          if (!allModulesApproved) {
            filteredExams = filteredExams.filter(ex => !['FINAL_VIRTUAL', 'FINAL_SINC', 'EQUIVALENCIA'].includes(ex.tipo_examen));
          }
        }
      }
      setExamenes(filteredExams);
    };
    fetchAndFilterExams();
  }, [modulo, bloque, approvedModuleExamTypes, studentApprovedModuleIds, estructura]); // Dependencies

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      estudiante: studentId,
      examen: examen,
      calificacion: Number(calificacion),
      fecha_calificacion: fechaCalificacion,
      es_equivalencia: esEquivalencia,
      aprobado: Number(calificacion) >= 6,
    };
    try {
      await apiClient.post('/notas/', payload);
      onSave();
      alert('Nota creada con éxito');
    } catch (error) {
      console.error("Error creating note:", error);
      alert('Error al crear la nota. Revise la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  };

  // Filter options based on student enrollments
  const enrolledProgramIds = useMemo(() => new Set(studentEnrollments.map(e => e.cohorte?.programa?.id).filter(Boolean)), [studentEnrollments]);
  const filteredCursos = useMemo(() => cursos.filter(c => enrolledProgramIds.has(c.id)), [cursos, enrolledProgramIds]);

  const enrolledBloqueIds = useMemo(() => new Set(studentEnrollments.map(e => e.modulo?.bloque?.id).filter(Boolean)), [studentEnrollments]);
  const filteredBloquesOptions = useMemo(() => {
    if (!estructura) return [];
    return estructura.bloques.filter(b => enrolledBloqueIds.has(b.id));
  }, [estructura, enrolledBloqueIds]);

  const enrolledModuloIds = useMemo(() => new Set(studentEnrollments.map(e => e.modulo?.id).filter(Boolean)), [studentEnrollments]);
  const filteredModulosOptions = useMemo(() => {
    if (!bloque) return [];
    const allModulosInBloque = filteredBloquesOptions.find(b => b.id === Number(bloque))?.modulos || [];
    return allModulosInBloque.filter(m => enrolledModuloIds.has(m.id));
  }, [bloque, filteredBloquesOptions, enrolledModuloIds]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Añadir Nueva Nota / Equivalencia</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField fullWidth select SelectProps={{ native: true }} label="Curso" value={curso} onChange={e => setCurso(e.target.value)}>
              <option value=""></option>
              {filteredCursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth select SelectProps={{ native: true }} label="Bloque" value={bloque} onChange={e => setBloque(e.target.value)} disabled={!curso}>
              <option value=""></option>
              {filteredBloquesOptions.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth select SelectProps={{ native: true }} label="Módulo" value={modulo} onChange={e => setModulo(e.target.value)} disabled={!bloque}>
              <option value=""></option>
              {filteredModulosOptions.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </TextField>
          </Grid>
          <Grid item xs={12}>
            <TextField fullWidth select SelectProps={{ native: true }} label="Examen" value={examen} onChange={e => setExamen(e.target.value)} disabled={!bloque}>
              <option value=""></option>
              {examenes.map(ex => <option key={ex.id} value={ex.id}>{ex.tipo_examen} - {dayjs(ex.fecha).format('DD/MM/YYYY')}</option>)}
            </TextField>
            {existingNote && (
              <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                Ya existe una nota aprobada para este examen. Usa la función de editar en el historial para modificarla.
              </Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Calificación" type="number" value={calificacion} onChange={e => setCalificacion(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Fecha Calificación" type="date" value={fechaCalificacion} onChange={e => setFechaCalificacion(e.target.value)} InputLabelProps={{ shrink: true }}/>
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel control={<Checkbox checked={esEquivalencia} onChange={e => setEsEquivalencia(e.target.checked)} />} label="Es Equivalencia" />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={!examen || !calificacion || existingNote || loading}>Guardar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HistorialAcademico({ historial, setHistorial, selEstudiante, cursos, readOnly = false }) {
  const [filterPrograma, setFilterPrograma] = useState('');
  const [filterBloque, setFilterBloque] = useState('');
  const [filterModulo, setFilterModulo] = useState('');
  const [editingNotaId, setEditingNotaId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEditClick = (nota) => {
    setEditingNotaId(nota.id);
    setEditFormData({ 
      calificacion: nota.calificacion, 
      fecha_calificacion: dayjs(nota.fecha_calificacion).format('YYYY-MM-DD') 
    });
  };

  const handleCancelClick = () => {
    setEditingNotaId(null);
  };

  const handleFormChange = (e) => {
    setEditFormData({
      ...editFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdate = async (notaId) => {
    setLoading(true);
    try {
      const originalNota = historial.find(n => n.id === notaId);
      if (!originalNota) {
        alert('Error: No se pudo encontrar la nota original.');
        return;
      }

      const payload = {
        ...editFormData,
        estudiante: originalNota.estudiante,
        examen: originalNota.examen,
        calificacion: Number(editFormData.calificacion),
        aprobado: Number(editFormData.calificacion) >= 6,
      };
      const { data: updatedNota } = await apiClient.put(`/notas/${notaId}/`, payload);
      setHistorial(prev => prev.map(n => n.id === notaId ? updatedNota : n));
      setEditingNotaId(null);
      alert('Nota actualizada con éxito!');
    } catch (error) {
      console.error("Error updating note:", error.response?.data || error.message);
      alert('Error al actualizar la nota.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (notaId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta nota?')) {
      setLoading(true);
      try {
        await apiClient.delete(`/notas/${notaId}/`);
        setHistorial(prev => prev.filter(n => n.id !== notaId));
        alert('Nota eliminada con éxito!');
      } catch (error) {
        console.error("Error deleting note:", error);
        alert('Error al eliminar la nota. Revise la consola para más detalles.');
      } finally {
        setLoading(false);
      }
    }
  };

  const programasOptions = useMemo(() => 
    Array.from(new Set(historial.map(h => h.examen_programa_nombre).filter(Boolean)))
  , [historial]);

  const bloquesOptions = useMemo(() => {
    if (!filterPrograma) return [];
    return Array.from(new Set(historial
      .filter(h => h.examen_programa_nombre === filterPrograma)
      .map(h => h.examen_bloque_nombre)
      .filter(Boolean)))
  }, [historial, filterPrograma]);

  const modulosOptions = useMemo(() => {
    if (!filterBloque) return [];
    return Array.from(new Set(historial
      .filter(h => h.examen_bloque_nombre === filterBloque)
      .map(h => h.examen_modulo_nombre)
      .filter(Boolean)))
  }, [historial, filterBloque]);

  const filteredHistorial = useMemo(() => {
    return historial.filter(h => {
      const matchPrograma = !filterPrograma || h.examen_programa_nombre === filterPrograma;
      const matchBloque = !filterBloque || h.examen_bloque_nombre === filterBloque;
      const matchModulo = !filterModulo || h.examen_modulo_nombre === filterModulo;
      return matchPrograma && matchBloque && matchModulo;
    });
  }, [historial, filterPrograma, filterBloque, filterModulo]);

  useEffect(() => {
    setFilterBloque('');
    setFilterModulo('');
  }, [filterPrograma]);

  useEffect(() => {
    setFilterModulo('');
  }, [filterBloque]);

  return (
    <>
    <Card sx={{ mt: 3 }}>
      <CardHeader 
        title="Historial Académico"
        action={
          <Grid container spacing={1} alignItems="center" sx={{ minWidth: 600 }}>
            {!readOnly && (
              <Grid item>
                <Button variant="contained" size="small" onClick={() => setCreateModalOpen(true)}>Añadir Nota</Button>
              </Grid>
            )}
            <Grid item xs>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  <TextField fullWidth select SelectProps={{ native: true }} size="small" label="Programa" value={filterPrograma} onChange={e => setFilterPrograma(e.target.value)}>
                    <option value=""></option>
                    {programasOptions.map(p => <option key={p} value={p}>{p}</option>)}
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth select SelectProps={{ native: true }} size="small" label="Bloque" value={filterBloque} onChange={e => setFilterBloque(e.target.value)} disabled={!filterPrograma}>
                    <option value=""></option>
                    {bloquesOptions.map(b => <option key={b} value={b}>{b}</option>)}
                  </TextField>
                </Grid>
                <Grid item xs={4}>
                  <TextField fullWidth select SelectProps={{ native: true }} size="small" label="Módulo" value={filterModulo} onChange={e => setFilterModulo(e.target.value)} disabled={!filterBloque}>
                    <option value=""></option>
                    {modulosOptions.map(m => <option key={m} value={m}>{m}</option>)}
                  </TextField>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        }
      />
      <CardContent>
        <Grid container spacing={1} sx={{ borderBottom: '1px solid #ccc', pb: 1, mb: 1 }}>
          <Grid item xs={readOnly ? 4 : 3}><Typography variant="subtitle2" fontWeight="bold">Programa</Typography></Grid>
          <Grid item xs={readOnly ? 4 : 3}><Typography variant="subtitle2" fontWeight="bold">Bloque/Módulo</Typography></Grid>
          <Grid item xs={2}><Typography variant="subtitle2" fontWeight="bold">Examen</Typography></Grid>
          <Grid item xs={1}><Typography variant="subtitle2" fontWeight="bold">Nota</Typography></Grid>
          <Grid item xs={2}><Typography variant="subtitle2" fontWeight="bold">Fecha</Typography></Grid>
          {!readOnly && <Grid item xs={1}><Typography variant="subtitle2" fontWeight="bold">Acciones</Typography></Grid>}
        </Grid>
        {filteredHistorial.length > 0 ? (
          filteredHistorial.map(h => (
            <React.Fragment key={h.id}>
              {editingNotaId === h.id && !readOnly ? (
                // Edit Mode Row
                <Grid container spacing={1} alignItems="center" sx={{ mb: 0.5, background: '#f5f5f5', borderRadius: 1, p: 0.5 }}>
                  <Grid item xs={3}>{h.examen_programa_nombre}</Grid>
                  <Grid item xs={3}>{h.examen_bloque_nombre || 'N/A'} / {h.examen_modulo_nombre || 'N/A'}</Grid>
                  <Grid item xs={2}>{h.examen_tipo_examen}</Grid>
                  <Grid item xs={1}><TextField size="small" name="calificacion" value={editFormData.calificacion} onChange={handleFormChange} sx={{ width: '100%' }}/></Grid>
                  <Grid item xs={2}><TextField size="small" type="date" name="fecha_calificacion" value={editFormData.fecha_calificacion} onChange={handleFormChange} InputLabelProps={{ shrink: true }} sx={{ width: '100%' }}/></Grid>
                  <Grid item xs={1}>
                    <Tooltip title="Guardar"><IconButton size="small" color="primary" onClick={() => handleUpdate(h.id)}><CheckIcon fontSize="inherit"/></IconButton></Tooltip>
                    <Tooltip title="Cancelar"><IconButton size="small" onClick={handleCancelClick}><CloseIcon fontSize="inherit"/></IconButton></Tooltip>
                  </Grid>
                </Grid>
              ) : (
                // Display Mode Row
                <Grid container spacing={1} alignItems="center" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
                  <Grid item xs={readOnly ? 4 : 3}>{h.examen_programa_nombre}</Grid>
                  <Grid item xs={readOnly ? 4 : 3}>{h.examen_bloque_nombre || 'N/A'} / {h.examen_modulo_nombre || 'N/A'}</Grid>
                  <Grid item xs={2}>{h.examen_tipo_examen}</Grid>
                  <Grid item xs={1}>{h.calificacion}</Grid>
                  <Grid item xs={2}>{dayjs.utc(h.fecha_calificacion).format('DD/MM/YYYY')}</Grid>
                  {!readOnly && (
                    <Grid item xs={1}>
                      <Tooltip title="Editar"><IconButton size="small" onClick={() => handleEditClick(h)}><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                      <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => handleDelete(h.id)}><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                    </Grid>
                  )}
                </Grid>
              )}
            </React.Fragment>
          ))
        ) : (
          <Typography sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
            No hay notas registradas para el estudiante o los filtros seleccionados.
          </Typography>
        )}
      </CardContent>
    </Card>
    {!readOnly && isCreateModalOpen && <CreateNotaModal 
      open={isCreateModalOpen} 
      onClose={() => setCreateModalOpen(false)} 
      studentId={selEstudiante}
      cursos={cursos}
      onSave={() => {
        // Refetch history after saving
        (async () => {
          const { data } = await apiClient.get('/notas/', { params: { estudiante: selEstudiante } });
          setHistorial(data.results || data);
        })();
        setCreateModalOpen(false);
      }}
    />}
    </>
  );
}
