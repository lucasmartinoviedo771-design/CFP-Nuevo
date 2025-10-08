import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Typography, Accordion, AccordionSummary, AccordionDetails, CircularProgress, 
  List, ListItem, ListItemText, Grid, Chip, Divider, IconButton, Tooltip, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel,
  Snackbar, Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import api from '../services/apiClient';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
};

const initialModuloFormState = {
  nombre: '',
  fecha_inicio: '',
  fecha_fin: '',
  orden: 1,
  es_practica: false,
  asistencia_requerida_practica: 80,
  bloque: null, // ID del bloque padre
};

const initialBloqueFormState = {
  nombre: '',
  orden: 1,
  bateria: null, // ID de la batería padre
};

const initialBateriaFormState = {
  nombre: '',
  orden: 1,
  programa: null, // ID del programa padre
};

function ModuloFormDialog({ open, onClose, onSave, modulo, bloqueId }) {
  const [form, setForm] = useState(initialModuloFormState);

  useEffect(() => {
    if (modulo) {
      setForm({
        ...modulo,
        fecha_inicio: modulo.fecha_inicio || '',
        fecha_fin: modulo.fecha_fin || '',
      });
    } else {
      setForm({ ...initialModuloFormState, bloque: bloqueId });
    }
  }, [modulo, bloqueId, open]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{modulo ? 'Editar Módulo' : 'Añadir Módulo'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}><TextField name="nombre" label="Nombre del Módulo" fullWidth value={form.nombre} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField name="fecha_inicio" label="Fecha de Inicio" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.fecha_inicio} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField name="fecha_fin" label="Fecha de Fin" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.fecha_fin} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><TextField name="orden" label="Orden" type="number" fullWidth value={form.orden} onChange={handleChange} /></Grid>
          <Grid item xs={12} sm={6}><FormControlLabel control={<Checkbox name="es_practica" checked={form.es_practica} onChange={handleChange} />} label="Es Práctica" /></Grid>
          {form.es_practica && (
            <Grid item xs={12}><TextField name="asistencia_requerida_practica" label="Asistencia Requerida (%)" type="number" fullWidth value={form.asistencia_requerida_practica} onChange={handleChange} /></Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">{modulo ? 'Guardar Cambios' : 'Añadir'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function BloqueFormDialog({ open, onClose, onSave, bloque, bateriaId }) {
  const [form, setForm] = useState(initialBloqueFormState);

  useEffect(() => {
    if (bloque) {
      setForm(bloque);
    } else {
      setForm({ ...initialBloqueFormState, bateria: bateriaId });
    }
  }, [bloque, bateriaId, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{bloque ? 'Editar Bloque' : 'Añadir Bloque'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}><TextField name="nombre" label="Nombre del Bloque" fullWidth value={form.nombre} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField name="orden" label="Orden" type="number" fullWidth value={form.orden} onChange={handleChange} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">{bloque ? 'Guardar Cambios' : 'Añadir'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function BateriaFormDialog({ open, onClose, onSave, bateria, programaId }) {
  const [form, setForm] = useState(initialBateriaFormState);

  useEffect(() => {
    if (bateria) {
      setForm(bateria);
    } else {
      setForm({ ...initialBateriaFormState, programa: programaId });
    }
  }, [bateria, programaId, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{bateria ? 'Editar Batería' : 'Añadir Batería'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}><TextField name="nombre" label="Nombre de la Batería" fullWidth value={form.nombre} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField name="orden" label="Orden" type="number" fullWidth value={form.orden} onChange={handleChange} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">{bateria ? 'Guardar Cambios' : 'Añadir'}</Button>
      </DialogActions>
    </Dialog>
  );
}

const initialProgramaFormState = {
  nombre: '',
  codigo: '',
};

function ProgramaFormDialog({ open, onClose, onSave, programa }) {
  const [form, setForm] = useState(initialProgramaFormState);

  useEffect(() => {
    if (programa) {
      setForm(programa);
    } else {
      setForm(initialProgramaFormState);
    }
  }, [programa, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{programa ? 'Editar Programa' : 'Añadir Programa'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}><TextField name="nombre" label="Nombre del Programa" fullWidth value={form.nombre} onChange={handleChange} /></Grid>
          <Grid item xs={12}><TextField name="codigo" label="Código del Programa" fullWidth value={form.codigo} onChange={handleChange} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">{programa ? 'Guardar Cambios' : 'Añadir'}</Button>
      </DialogActions>
    </Dialog>
  );
}

function ModuloItem({ modulo, onEdit, onDelete }) {
  return (
    <ListItem 
      disablePadding 
      secondaryAction={
        <Box>
          <Tooltip title="Editar Módulo">
            <IconButton edge="end" aria-label="edit" onClick={() => onEdit(modulo)}>
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar Módulo">
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(modulo)}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      }
    >
      <ListItemText 
        primary={<Typography variant="body1">{modulo.nombre}</Typography>}
        secondary={
          <Typography variant="body2" color="text.secondary">
            Inicio: {formatDate(modulo.fecha_inicio)} | Fin: {formatDate(modulo.fecha_fin)}
          </Typography>
        }
      />
    </ListItem>
  );
}

function BloqueAccordion({ bloque, expanded, onChange, onAddModulo, onEditBloque, onDeleteBloque, onEditModulo, onDeleteModulo }) {
  const [expandedBloque, setExpandedBloque] = useState(false);
  const handleBloqueChange = (panel) => (event, isExpanded) => {
    setExpandedBloque(isExpanded ? panel : false);
  };

  return (
    <Accordion expanded={expanded} onChange={onChange} sx={{ mt: 1, mb: 1, bgcolor: 'grey.50' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>Bloque: {bloque.nombre}</Typography>
          <Tooltip title="Añadir Módulo">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAddModulo(bloque.id); }}>
              <AddRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar Bloque">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditBloque(bloque); }}>
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar Bloque">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteBloque(bloque); }}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <List dense>
          {bloque.modulos.length === 0 ? (
            <Typography variant="body2" color="text.secondary">No hay módulos en este bloque.</Typography>
          ) : (
            bloque.modulos.map((modulo) => (
              <ModuloItem key={modulo.id} modulo={modulo} onEdit={onEditModulo} onDelete={onDeleteModulo} />
            ))
          )}
        </List>
      </AccordionDetails>
    </Accordion>
  );
}

function BateriaAccordion({ bateria, expanded, onChange, onAddBloque, onEditBateria, onDeleteBateria, onAddModulo, onEditBloque, onDeleteBloque, onEditModulo, onDeleteModulo }) {
  const [expandedBloque, setExpandedBloque] = useState(false);
  const handleBloqueChange = (panel) => (event, isExpanded) => {
    setExpandedBloque(isExpanded ? panel : false);
  };

  return (
    <Accordion expanded={expanded} onChange={onChange} sx={{ mt: 1, mb: 1, bgcolor: 'grey.100' }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Batería: {bateria.nombre}</Typography>
          <Tooltip title="Añadir Bloque">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAddBloque(bateria.id); }}>
              <AddRoundedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Editar Batería">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEditBateria(bateria); }}>
              <EditOutlinedIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar Batería">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDeleteBateria(bateria); }}>
              <DeleteOutlineRoundedIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {bateria.bloques.length === 0 ? (
          <Typography>No hay bloques en esta batería.</Typography>
        ) : (
          bateria.bloques.map((bloque) => (
            <BloqueAccordion 
              key={bloque.id} 
              bloque={bloque} 
              expanded={expandedBloque === `bloque-${bloque.id}`}
              onChange={handleBloqueChange(`bloque-${bloque.id}`)}
              onAddModulo={onAddModulo}
              onEditBloque={(b) => onEditBloque(b, bateria.id)}
              onDeleteBloque={onDeleteBloque}
              onEditModulo={onEditModulo}
              onDeleteModulo={onDeleteModulo}
            />
          ))
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function Estructura() {
  const [programas, setProgramas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProgram, setExpandedProgram] = useState(false);
  const [expandedBateria, setExpandedBateria] = useState(false);
  const [openModuloDialog, setOpenModuloDialog] = useState(false);
  const [currentModulo, setCurrentModulo] = useState(null);
  const [parentBloqueId, setParentBloqueId] = useState(null);
  const [openBloqueDialog, setOpenBloqueDialog] = useState(false);
  const [currentBloque, setCurrentBloque] = useState(null);
  const [parentBateriaId, setParentBateriaId] = useState(null);
  const [openBateriaDialog, setOpenBateriaDialog] = useState(false);
  const [currentBateria, setCurrentBateria] = useState(null);
  const [parentProgramaId, setParentProgramaId] = useState(null);
  const [openProgramaDialog, setOpenProgramaDialog] = useState(false);
  const [currentPrograma, setCurrentPrograma] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const fetchProgramas = useCallback(async () => {
    setLoading(true);
    try {
      const { data: programasList } = await api.get('/programas/'); 
      const detailedProgramas = await Promise.all(programasList.map(async (programa) => {
        const { data: detail } = await api.get(`/programas/${programa.id}/`);
        return detail;
      }));
      setProgramas(detailedProgramas);
    } catch (error) {
      console.error("Error al cargar programas:", error);
      setFeedback({ open: true, message: 'Error al cargar programas.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProgramas();
  }, [fetchProgramas]);

  const handleProgramChange = (panel) => (event, isExpanded) => {
    setExpandedProgram(isExpanded ? panel : false);
    setExpandedBateria(false); // Colapsar baterías al cambiar de programa
  };

  const handleBateriaChange = (panel) => (event, isExpanded) => {
    setExpandedBateria(isExpanded ? panel : false);
  };

  // Modulo CRUD Handlers
  const handleAddModulo = (bloqueId) => {
    setCurrentModulo(null);
    setParentBloqueId(bloqueId);
    setOpenModuloDialog(true);
  };

  const handleEditModulo = (modulo) => {
    setCurrentModulo(modulo);
    setParentBloqueId(modulo.bloque); 
    setOpenModuloDialog(true);
  };

  const handleDeleteModulo = async (modulo) => {
    if (!window.confirm(`¿Estás seguro de eliminar el módulo ${modulo.nombre}?`)) return;
    try {
      await api.delete(`/modulos/${modulo.id}/`);
      setFeedback({ open: true, message: 'Módulo eliminado con éxito', severity: 'success' });
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al eliminar módulo: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleSaveModulo = async (moduloData) => {
    try {
      if (moduloData.id) {
        await api.put(`/modulos/${moduloData.id}/`, moduloData);
        setFeedback({ open: true, message: 'Módulo actualizado con éxito', severity: 'success' });
      } else {
        await api.post('/modulos/', { ...moduloData, bloque: parentBloqueId });
        setFeedback({ open: true, message: 'Módulo añadido con éxito', severity: 'success' });
      }
      setOpenModuloDialog(false);
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar módulo: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleCloseModuloDialog = () => {
    setOpenModuloDialog(false);
    setCurrentModulo(null);
    setParentBloqueId(null);
  };

  // Bloque CRUD Handlers
  const handleAddBloque = (bateriaId) => {
    setCurrentBloque(null);
    setParentBateriaId(bateriaId);
    setOpenBloqueDialog(true);
  };

  const handleEditBloque = (bloque, bateriaId) => {
    setCurrentBloque(bloque);
    setParentBateriaId(bateriaId); 
    setOpenBloqueDialog(true);
  };

  const handleDeleteBloque = async (bloque) => {
    if (!window.confirm(`¿Estás seguro de eliminar el bloque ${bloque.nombre}?`)) return;
    try {
      await api.delete(`/bloques/${bloque.id}/`);
      setFeedback({ open: true, message: 'Bloque eliminado con éxito', severity: 'success' });
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al eliminar bloque: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleSaveBloque = async (bloqueData) => {
    try {
      if (bloqueData.id) {
        const payload = { ...bloqueData, bateria: parentBateriaId };
        await api.put(`/bloques/${bloqueData.id}/`, payload);
        setFeedback({ open: true, message: 'Bloque actualizado con éxito', severity: 'success' });
      } else {
        await api.post('/bloques/', { ...bloqueData, bateria: parentBateriaId });
        setFeedback({ open: true, message: 'Bloque añadido con éxito', severity: 'success' });
      }
      setOpenBloqueDialog(false);
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar bloque: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleCloseBloqueDialog = () => {
    setOpenBloqueDialog(false);
    setCurrentBloque(null);
    setParentBateriaId(null);
  };

  // Bateria CRUD Handlers
  const handleAddBateria = (programaId) => {
    setCurrentBateria(null);
    setParentProgramaId(programaId);
    setOpenBateriaDialog(true);
  };

  const handleEditBateria = (bateria) => {
    setCurrentBateria(bateria);
    setParentProgramaId(bateria.programa); 
    setOpenBateriaDialog(true);
  };

  const handleDeleteBateria = async (bateria) => {
    if (!window.confirm(`¿Estás seguro de eliminar la batería ${bateria.nombre}?`)) return;
    try {
      await api.delete(`/baterias/${bateria.id}/`);
      setFeedback({ open: true, message: 'Batería eliminada con éxito', severity: 'success' });
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al eliminar batería: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleSaveBateria = async (bateriaData) => {
    try {
      if (bateriaData.id) {
        await api.put(`/baterias/${bateriaData.id}/`, bateriaData);
        setFeedback({ open: true, message: 'Batería actualizada con éxito', severity: 'success' });
      } else {
        await api.post('/baterias/', { ...bateriaData, programa: parentProgramaId });
        setFeedback({ open: true, message: 'Batería añadida con éxito', severity: 'success' });
      }
      setOpenBateriaDialog(false);
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar batería: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleCloseBateriaDialog = () => {
    setOpenBateriaDialog(false);
    setCurrentBateria(null);
    setParentProgramaId(null);
  };

  // Programa CRUD Handlers
  const handleAddPrograma = () => {
    setCurrentPrograma(null);
    setOpenProgramaDialog(true);
  };

  const handleEditPrograma = (programa) => {
    setCurrentPrograma(programa);
    setOpenProgramaDialog(true);
  };

  const handleDeletePrograma = async (programa) => {
    if (!window.confirm(`¿Estás seguro de eliminar el programa ${programa.nombre}?`)) return;
    try {
      await api.delete(`/programas/${programa.id}/`);
      setFeedback({ open: true, message: 'Programa eliminado con éxito', severity: 'success' });
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al eliminar programa: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleSavePrograma = async (programaData) => {
    try {
      if (programaData.id) {
        await api.put(`/programas/${programaData.id}/`, programaData);
        setFeedback({ open: true, message: 'Programa actualizado con éxito', severity: 'success' });
      } else {
        await api.post('/programas/', programaData);
        setFeedback({ open: true, message: 'Programa añadido con éxito', severity: 'success' });
      }
      setOpenProgramaDialog(false);
      fetchProgramas();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar programa: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleCloseProgramaDialog = () => {
    setOpenProgramaDialog(false);
    setCurrentPrograma(null);
  };

  const handleCloseFeedback = (event, reason) => {
    if (reason === 'clickaway') return;
    setFeedback({ ...feedback, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Editor de Estructura de Cursos</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAddPrograma}>Añadir Programa</Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 4 }}>Gestiona la jerarquía de tus programas, baterías, bloques y módulos.</Typography>

      <Box>
        {programas.length === 0 ? (
          <Typography>No hay programas cargados. Crea uno para empezar.</Typography>
        ) : (
          programas.map((programa) => (
            <Accordion expanded={expandedProgram === `programa-${programa.id}`} onChange={handleProgramChange(`programa-${programa.id}`)} key={programa.id}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>{programa.codigo} - {programa.nombre}</Typography>
                  <Tooltip title="Añadir Batería">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleAddBateria(programa.id); }}>
                      <AddRoundedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Editar Programa">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditPrograma(programa); }}>
                      <EditOutlinedIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar Programa">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeletePrograma(programa); }}>
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                {programa.baterias.length === 0 ? (
                  <Typography>No hay baterías en este programa.</Typography>
                ) : (
                  programa.baterias.map((bateria) => (
                    <BateriaAccordion 
                      key={bateria.id} 
                      bateria={bateria} 
                      expanded={expandedBateria === `bateria-${bateria.id}`}
                      onChange={handleBateriaChange(`bateria-${bateria.id}`)}
                      onAddBloque={handleAddBloque}
                      onEditBateria={handleEditBateria}
                      onDeleteBateria={handleDeleteBateria}
                      onAddModulo={handleAddModulo}
                      onEditBloque={handleEditBloque}
                      onDeleteBloque={handleDeleteBloque}
                      onEditModulo={handleEditModulo}
                      onDeleteModulo={handleDeleteModulo}
                    />
                  ))
                )}
              </AccordionDetails>
            </Accordion>
          ))
        )}
      </Box>

      {/* Modulo Form Dialog */}
      <ModuloFormDialog 
        open={openModuloDialog} 
        onClose={handleCloseModuloDialog} 
        onSave={handleSaveModulo} 
        modulo={currentModulo}
        bloqueId={parentBloqueId}
      />

      {/* Bloque Form Dialog */}
      <BloqueFormDialog 
        open={openBloqueDialog} 
        onClose={handleCloseBloqueDialog} 
        onSave={handleSaveBloque} 
        bloque={currentBloque}
        bateriaId={parentBateriaId}
      />

      {/* Bateria Form Dialog */}
      <BateriaFormDialog 
        open={openBateriaDialog} 
        onClose={handleCloseBateriaDialog} 
        onSave={handleSaveBateria} 
        bateria={currentBateria}
        programaId={parentProgramaId}
      />

      {/* Programa Form Dialog */}
      <ProgramaFormDialog 
        open={openProgramaDialog} 
        onClose={handleCloseProgramaDialog} 
        onSave={handleSavePrograma} 
        programa={currentPrograma}
      />

      {/* Feedback Snackbar */}
      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={handleCloseFeedback} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>

    </>
  );
}
