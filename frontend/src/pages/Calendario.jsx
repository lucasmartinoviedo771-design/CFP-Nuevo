import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Snackbar, Alert, Tooltip, IconButton
} from '@mui/material';
import {
  AddRounded as AddRoundedIcon,
  EditOutlined as EditOutlinedIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon
} from '@mui/icons-material';
import api from '../services/apiClient';
import SecuenciaFormDialog from '../components/SecuenciaFormDialog';
import BloqueFormDialog from '../components/BloqueFormDialog';



// --- Main Calendario Page Component ---
export default function Calendario() {
  const [bloques, setBloques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openBloqueDialog, setOpenBloqueDialog] = useState(false);
  const [openSecuenciaDialog, setOpenSecuenciaDialog] = useState(false);
  const [currentBloque, setCurrentBloque] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const fetchBloques = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/bloques-de-fechas/');
      setBloques(data.results || data);
    } catch (error) {
      console.error("Error al cargar los bloques de fechas:", error);
      setFeedback({ open: true, message: 'Error al cargar calendarios.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBloques();
  }, [fetchBloques]);

  const handleAddBloque = () => {
    setCurrentBloque(null);
    setOpenBloqueDialog(true);
  };

  const handleEditBloque = (bloque) => {
    setCurrentBloque(bloque);
    setOpenBloqueDialog(true);
  };

  const handleDeleteBloque = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este bloque de fechas?")) return;
    try {
      await api.delete(`/bloques-de-fechas/${id}/`);
      setFeedback({ open: true, message: 'Bloque eliminado con éxito.', severity: 'success' });
      fetchBloques();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al eliminar: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleSaveBloque = async (formData) => {
    try {
      if (currentBloque && currentBloque.id) {
        await api.put(`/bloques-de-fechas/${currentBloque.id}/`, formData);
        setFeedback({ open: true, message: 'Bloque actualizado con éxito.', severity: 'success' });
      } else {
        await api.post('/bloques-de-fechas/', formData);
        setFeedback({ open: true, message: 'Bloque creado con éxito.', severity: 'success' });
      }
      setOpenBloqueDialog(false);
      fetchBloques();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleOpenSecuencia = (bloque) => {
    setCurrentBloque(bloque);
    setOpenSecuenciaDialog(true);
  };

  const handleSaveSecuenciaSuccess = () => {
    setFeedback({ open: true, message: 'Secuencia guardada con éxito.', severity: 'success' });
    fetchBloques(); // Refetch to get updated data if needed
  };

  const handleCloseFeedback = (event, reason) => {
    if (reason === 'clickaway') return;
    setFeedback({ ...feedback, open: false });
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestión de Calendarios</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={handleAddBloque}>
          Añadir Bloque de Fechas
        </Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Crea y gestiona los bloques de calendario que se asignarán a los cursos.
      </Typography>

      {loading ? (
        <CircularProgress />
      ) : (
        <Box>
          {bloques.map(bloque => (
            <Box key={bloque.id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <Typography variant="h6">{bloque.nombre}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Inicia el: {new Date(bloque.fecha_inicio).toLocaleDateString('es-AR', { timeZone: 'UTC' })}
                </Typography>
              </div>
              <div>
                <Button sx={{ mr: 1 }} onClick={() => handleOpenSecuencia(bloque)}>Gestionar Secuencia</Button>
                <Tooltip title="Editar Bloque"><IconButton onClick={() => handleEditBloque(bloque)}><EditOutlinedIcon /></IconButton></Tooltip>
                <Tooltip title="Eliminar Bloque"><IconButton onClick={() => handleDeleteBloque(bloque.id)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
              </div>
            </Box>
          ))}
        </Box>
      )}

      <BloqueFormDialog open={openBloqueDialog} onClose={() => setOpenBloqueDialog(false)} onSave={handleSaveBloque} bloque={currentBloque} />
      {currentBloque && <SecuenciaFormDialog open={openSecuenciaDialog} onClose={() => setOpenSecuenciaDialog(false)} bloque={currentBloque} onSaveSuccess={handleSaveSecuenciaSuccess} />}

      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={handleCloseFeedback} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>{feedback.message}</Alert>
      </Snackbar>
    </>
  );
}
