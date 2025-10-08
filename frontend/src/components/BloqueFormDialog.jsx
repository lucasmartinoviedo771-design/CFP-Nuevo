import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button
} from '@mui/material';

export default function BloqueFormDialog({ open, onClose, onSave, bloque }) {
  const [form, setForm] = useState({ nombre: '', fecha_inicio: '' });

  useEffect(() => {
    if (bloque) {
      setForm({ nombre: bloque.nombre, fecha_inicio: bloque.fecha_inicio || '' });
    } else {
      setForm({ nombre: '', fecha_inicio: '' });
    }
  }, [bloque, open]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(form);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{bloque ? 'Editar Bloque de Fechas' : 'Añadir Bloque de Fechas'}</DialogTitle>
      <DialogContent sx={{ pt: '20px !important' }}>
        <TextField autoFocus margin="dense" name="nombre" label="Nombre del Bloque" type="text" fullWidth variant="outlined" value={form.nombre} onChange={handleChange} sx={{ mb: 2 }}/>
        <TextField margin="dense" name="fecha_inicio" label="Fecha de Inicio del Bloque" type="date" fullWidth variant="outlined" InputLabelProps={{ shrink: true }} value={form.fecha_inicio} onChange={handleChange}/>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained">{bloque ? 'Guardar Cambios' : 'Crear'}</Button>
      </DialogActions>
    </Dialog>
  );
}
