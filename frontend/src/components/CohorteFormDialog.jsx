import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Button
} from '@mui/material';

export default function CohorteFormDialog({ open, onClose, onSave, programas, bloques }) {
  const [form, setForm] = useState({ nombre: '', programa: '', bloque_fechas: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Crear Nueva Cohorte</DialogTitle>
      <DialogContent sx={{ pt: '20px !important' }}>
        <TextField autoFocus margin="dense" name="nombre" label="Nombre de la Cohorte (ej. 2025-Q1)" type="text" fullWidth variant="outlined" value={form.nombre} onChange={handleChange} sx={{ mb: 2 }}/>
        <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
          <InputLabel>Programa</InputLabel>
          <Select name="programa" value={form.programa} label="Programa" onChange={handleChange}>
            {programas.map(p => <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth margin="dense">
          <InputLabel>Calendario</InputLabel>
          <Select name="bloque_fechas" value={form.bloque_fechas} label="Calendario" onChange={handleChange}>
            {bloques.map(b => <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">Crear</Button>
      </DialogActions>
    </Dialog>
  );
}
