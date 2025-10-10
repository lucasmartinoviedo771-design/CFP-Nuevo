import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, TextField, Button, Alert, IconButton, InputAdornment } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../services/apiClient';
import { UserContext } from '../App';
import authService from '../services/authService';

export default function SetPassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext);

  const handleClickShowPassword = (field) => {
    if (field === 'current') setShowCurrentPassword((show) => !show);
    if (field === 'new') setShowNewPassword((show) => !show);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setOk(false); setLoading(true);
    try {
      await api.put('/user/change-password/', { current_password: currentPassword, new_password: newPassword });
      // refresh user details and go to dashboard
      const me = await authService.getUserDetails();
      if (me) setUser(me);
      setOk(true);
      setCurrentPassword(''); setNewPassword('');
      navigate('/dashboard');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Error al actualizar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 420, mx: 'auto', mt: 8 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>Actualizar Contraseña</Typography>
          {ok && <Alert severity="success" sx={{ mb: 2 }}>Contraseña actualizada. Vuelve al dashboard.</Alert>}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={submit} sx={{ display:'flex', flexDirection:'column', gap:2 }}>
            <TextField
              type={showCurrentPassword ? 'text' : 'password'}
              label="Contraseña actual"
              value={currentPassword}
              onChange={(e)=>setCurrentPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle current password visibility"
                      onClick={() => handleClickShowPassword('current')}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              type={showNewPassword ? 'text' : 'password'}
              label="Nueva contraseña"
              value={newPassword}
              onChange={(e)=>setNewPassword(e.target.value)}
              required
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle new password visibility"
                      onClick={() => handleClickShowPassword('new')}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                    >
                      {showNewPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button type="submit" variant="contained" disabled={loading}>Cambiar</Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
