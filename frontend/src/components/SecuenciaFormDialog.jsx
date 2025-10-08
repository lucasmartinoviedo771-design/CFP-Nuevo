import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, List, ListItem,
  ListItemText, Select, MenuItem, FormControl, InputLabel, Button, CircularProgress
} from '@mui/material';import {
  AddRounded as AddRoundedIcon,
  DeleteOutlineRounded as DeleteOutlineRoundedIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';
import api from '../services/apiClient';

const SEMANA_TIPOS = [
  { id: 'CLASE', label: 'Clase' },
  { id: 'PARCIAL', label: 'Parcial' },
  { id: 'FINAL_VIRTUAL', label: 'Final Virtual' },
  { id: 'FINAL_SINC', label: 'Final Sincrónico' },
];

export default function SecuenciaFormDialog({ open, onClose, bloque, onSaveSuccess }) {
  const [semanas, setSemanas] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bloque) {
      setLoading(true);
      api.get(`/bloques-de-fechas/${bloque.id}/`)
        .then(response => setSemanas(response.data.semanas_config || []))
        .catch(err => console.error("Failed to fetch semanas", err))
        .finally(() => setLoading(false));
    }
  }, [bloque, open]);

  const handleAddSemana = () => {
    setSemanas([...semanas, { tipo: 'CLASE', orden: semanas.length + 1 }]);
  };

  const handleRemoveSemana = (index) => {
    setSemanas(semanas.filter((_, i) => i !== index));
  };

  const handleMove = (index, direction) => {
    const newSemanas = [...semanas];
    const item = newSemanas.splice(index, 1)[0];
    newSemanas.splice(index + direction, 0, item);
    setSemanas(newSemanas);
  };

  const handleTipoChange = (index, newTipo) => {
    const newSemanas = [...semanas];
    newSemanas[index].tipo = newTipo;
    setSemanas(newSemanas);
  };

  const handleSave = async () => {
    if (!bloque) return;
    setLoading(true);
    try {
      await api.post(`/bloques-de-fechas/${bloque.id}/guardar_secuencia/`, { semanas });
      onSaveSuccess();
      onClose();
    } catch (error) {
      console.error("Error guardando la secuencia", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Gestionar Secuencia para "{bloque?.nombre}"</DialogTitle>
      <DialogContent>
        {loading ? <CircularProgress /> : (
          <List>
            {semanas.map((semana, index) => (
              <ListItem key={index} secondaryAction={
                <>
                  <IconButton edge="end" onClick={() => handleMove(index, -1)} disabled={index === 0}><ArrowUpwardIcon /></IconButton>
                  <IconButton edge="end" onClick={() => handleMove(index, 1)} disabled={index === semanas.length - 1}><ArrowDownwardIcon /></IconButton>
                  <IconButton edge="end" onClick={() => handleRemoveSemana(index)}><DeleteOutlineRoundedIcon /></IconButton>
                </>
              }>
                <ListItemText primary={`Semana ${index + 1}`} />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Tipo</InputLabel>
                  <Select value={semana.tipo} label="Tipo" onChange={(e) => handleTipoChange(index, e.target.value)}>
                    {SEMANA_TIPOS.map(tipo => <MenuItem key={tipo.id} value={tipo.id}>{tipo.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </ListItem>
            ))}
          </List>
        )}
        <Button startIcon={<AddRoundedIcon />} onClick={handleAddSemana} sx={{ mt: 2 }}>Añadir Semana</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" disabled={loading}>Guardar Secuencia</Button>
      </DialogActions>
    </Dialog>
  );
}
