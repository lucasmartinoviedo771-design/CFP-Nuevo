import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  listProgramas,
  createPrograma,
  updatePrograma,
  deletePrograma,
} from "../services/programasService";
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, TextField, Checkbox, FormControlLabel, Link
} from "@mui/material";

export default function Programas() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ codigo: '', nombre: '', activo: true });
  const [errorMsg, setErrorMsg] = useState(null);

  async function reload() {
    setLoading(true);
    try {
      const data = await listProgramas();
      setRows(data.results || data);
    } catch (e) {
      console.error("Programas error:", e?.response?.status, e?.response?.data || e?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setErrorMsg(null);
    try {
      if (editing) {
        await updatePrograma(editing.id, form);
      } else {
        await createPrograma(form);
      }
      setForm({ codigo: '', nombre: '', activo: true });
      setEditing(null);
      reload();
    } catch (e) {
      console.error("createPrograma error", e);
      const errorData = e.response?.data || e;
      setErrorMsg(typeof errorData === "string" ? errorData : JSON.stringify(errorData));
    }
  }

  const handleEdit = (row) => {
    setEditing(row);
    setForm(row);
  };

  const handleCancel = () => {
    setEditing(null);
    setForm({ codigo: '', nombre: '', activo: true });
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de que desea eliminar?")) {
      await deletePrograma(id);
      reload();
    }
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Programas</Typography>

      {errorMsg && (
        <Typography color="error" sx={{ mb: 2 }}>
          Error: {errorMsg}
        </Typography>
      )}

      <Box component="form" onSubmit={onSubmit} sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField label="Código" name="codigo" value={form.codigo} onChange={handleFormChange} variant="outlined" size="small" required />
        <TextField label="Nombre" name="nombre" value={form.nombre} onChange={handleFormChange} variant="outlined" size="small" required sx={{flexGrow: 1}} />
        <FormControlLabel control={<Checkbox name="activo" checked={form.activo} onChange={handleFormChange} />} label="Activo" />
        
        <Button type="submit" variant="contained">{editing ? "Guardar" : "Crear"}</Button>
        {editing && (
          <Button onClick={handleCancel} variant="outlined">Cancelar</Button>
        )}
      </Box>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.codigo}</TableCell>
                  <TableCell>
                    <Link component={RouterLink} to={`/cursos/${r.id}`}>
                      {r.nombre}
                    </Link>
                  </TableCell>
                  <TableCell>{r.activo ? 'Sí' : 'No'}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => handleEdit(r)} sx={{ mr: 1 }}>Editar</Button>
                    <Button size="small" color="error" onClick={() => handleDelete(r.id)}>Eliminar</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}