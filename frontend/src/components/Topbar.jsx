
import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Box, IconButton, Avatar, Button, Chip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { UserContext } from '../App';

export default function Topbar({ title='Dashboard', drawerWidth=240 }) {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      color="default"
      elevation={0}
      sx={(theme) => ({
        borderBottom: '1px solid #eee',
        bgcolor: '#fff',
        zIndex: theme.zIndex.drawer + 1,
        width: `calc(100% - ${drawerWidth}px)`,
        ml: `${drawerWidth}px`,
      })}
    >
      <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        <Box sx={{ display:'flex', alignItems:'center' }}>
          {user?.username && (
            <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
              {user.username}
            </Typography>
          )}
          {Array.isArray(user?.groups) && user.groups.slice(0,1).map((g) => (
            <Chip key={g} label={g} size="small" sx={{ mr: 1 }} />
          ))}
          <Button size="small" onClick={() => navigate('/set-password')}>Cambiar contraseña</Button>
          <IconButton size="large" color="inherit" aria-label="logout" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
          <Avatar sx={{ ml: 1, bgcolor: '#0D6EFD' }}>{(user?.username || 'A').charAt(0).toUpperCase()}</Avatar>
        </Box>
      </Toolbar>
    </AppBar>
  );
}
