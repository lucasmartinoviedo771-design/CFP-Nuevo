import React from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const drawerWidth = 240;

export default function AppLayout({ children, title }) {
  return (
    <Box sx={{ display: 'flex', bgcolor: '#F8F9FA', minHeight: '100vh' }}>
      <CssBaseline />
      <Sidebar width={drawerWidth} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Topbar title={title} drawerWidth={drawerWidth} />
        <Toolbar /> {/* spacer */}
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
