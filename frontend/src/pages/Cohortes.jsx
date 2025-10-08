import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, CircularProgress, Paper,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Snackbar, Alert
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import api from '../services/apiClient';
import CohorteFormDialog from '../components/CohorteFormDialog';


export default function Cohortes() {
  const [cohortes, setCohortes] = useState([]);
  const [programas, setProgramas] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cohortesRes, programasRes, bloquesRes] = await Promise.all([
        api.get('/cohortes/'),
        api.get('/programas/'),
        api.get('/bloques-de-fechas/'),
      ]);
      setCohortes(cohortesRes.data.results || cohortesRes.data);
      setProgramas(programasRes.data.results || programasRes.data);
      setBloques(bloquesRes.data.results || bloquesRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      setFeedback({ open: true, message: 'Error al cargar los datos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (formData) => {
    try {
      const payload = {
        nombre: formData.nombre,
        programa_id: formData.programa,
        bloque_fechas_id: formData.bloque_fechas,
      };

      await api.post('/cohortes/', payload);
      setFeedback({ open: true, message: 'Cohorte creada con éxito.', severity: 'success' });
      setOpenDialog(false);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleCloseFeedback = (event, reason) => {
    if (reason === 'clickaway') return;
    setFeedback({ ...feedback, open: false });
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Gestión de Cohortes</Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpenDialog(true)}>
          Crear Cohorte
        </Button>
      </Box>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Una cohorte representa una cursada específica, vinculando un Programa con un Calendario.
      </Typography>

      {loading ? <CircularProgress /> : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre Cohorte</TableCell>
                <TableCell>Programa</TableCell>
                <TableCell>Calendario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cohortes.map(c => (
                <TableRow key={c.id}>
                  <TableCell>{c.nombre}</TableCell>
                  <TableCell>{c.programa.nombre}</TableCell>
                  <TableCell>{c.bloque_fechas.nombre}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <CohorteFormDialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)} 
        onSave={handleSave} 
        programas={programas}
        bloques={bloques}
      />

      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={handleCloseFeedback} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  );
}
