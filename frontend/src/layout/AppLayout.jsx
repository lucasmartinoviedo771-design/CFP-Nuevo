import React from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';

const drawerWidth = 240;

export default function AppLayout({ children, title }) {
  return (
    <Box sx={{ display: 'flex', bgcolor: 'background.default', minHeight: '100vh' }}>
      <CssBaseline />
      <Sidebar width={drawerWidth} />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Topbar title={title} drawerWidth={drawerWidth} />
        <Toolbar /> {/* spacer */}
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
