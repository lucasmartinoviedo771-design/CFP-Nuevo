import React, { useEffect, useState, useContext } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, Button, IconButton, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../services/apiClient';
import UserFormDialog from '../components/UserFormDialog';
import { UserContext } from '../App';

export default function Usuarios() {
  const { user } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/');
      setUsers(response.data.results || response.data);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError('Error al cargar usuarios.');
      setSnackbarMessage('Error al cargar usuarios.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.groups.includes('Admin')) {
      fetchUsers();
    }
  }, [user]);

  const handleAddUser = () => {
    setEditingUser(null);
    setOpenDialog(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setOpenDialog(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('¿Está seguro de que desea eliminar este usuario?')) {
      try {
        await api.delete(`/users/${userId}/`);
        setSnackbarMessage('Usuario eliminado con éxito.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        fetchUsers(); // Refresh the list
      } catch (err) {
        console.error("Error deleting user:", err);
        setSnackbarMessage('Error al eliminar usuario.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  if (!user || !user.groups.includes('Admin')) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Acceso Denegado</Typography>
        <Typography variant="body1">No tienes permisos para ver esta página.</Typography>
      </Box>
    );
  }

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Gestión de Usuarios</Typography>
      <Button variant="contained" sx={{ mb: 2 }} onClick={handleAddUser}>Agregar Usuario</Button>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Apellido</TableCell>
              <TableCell>Grupos</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.first_name}</TableCell>
                <TableCell>{user.last_name}</TableCell>
                <TableCell>{user.groups ? user.groups.join(', ') : ''}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleEdit(user)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(user.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <UserFormDialog
        open={openDialog}
        onClose={handleCloseDialog}
        user={editingUser}
        onSave={fetchUsers}
      />

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
