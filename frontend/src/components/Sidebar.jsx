import React, { useState, useEffect } from 'react';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Collapse } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import GroupIcon from '@mui/icons-material/Group';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import GradingIcon from '@mui/icons-material/Grading';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import StorageIcon from '@mui/icons-material/Storage';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import BarChartIcon from '@mui/icons-material/BarChart';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

const dataItems = [
  { label: 'Dashboard', icon: <DashboardIcon/>, href: '/dashboard' },
  { label: 'Histórico por Cursos', icon: <BarChartIcon/>, href: '/historico-cursos' },
  { label: 'Histórico por Estudiante', icon: <PeopleIcon/>, href: '/historico-estudiante' },
  { label: 'Egresados', icon: <HowToRegIcon/>, href: '/egresados' },
];

const cargaDatosItems = [
  { label: 'Estudiantes', icon: <PeopleIcon/>, href: '/estudiantes' },
  { label: 'Inscripciones', icon: <HowToRegIcon/>, href: '/inscripciones' },
  { label: 'Asistencia', icon: <AssignmentTurnedInIcon/>, href: '/asistencia' },
];

const calificacionesItems = [
  { label: 'Notas / Equivalencias', icon: <GradingIcon/>, href: '/notas' },
];

const adminCursosItems = [
  { label: 'Estructura Académica', icon: <AccountTreeIcon/>, href: '/estructura' },
  { label: 'Programas', icon: <SchoolIcon/>, href: '/programas' },
  { label: 'Calendario Académico', icon: <CalendarMonthIcon/>, href: '/calendario' },
  { label: 'Cohortes', icon: <GroupIcon/>, href: '/cohortes' },
  { label: 'Gráfico de Cursos', icon: <BarChartIcon/>, href: '/grafico-cursos' },
];

const secretariaItems = [
  { label: 'Usuarios', icon: <PeopleIcon/>, href: '/usuarios' },
];

function NestedListItem({ item }) {
  return (
    <ListItemButton key={item.href} component={Link} to={item.href} sx={{ pl: 4 }}>
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
}

export default function Sidebar({ width = 240 }) {
  const location = useLocation();
  const [openSection, setOpenSection] = useState(null);

  useEffect(() => {
    const currentPath = location.pathname;
    if (dataItems.some(item => item.href === currentPath)) {
      setOpenSection('datos');
    } else if (cargaDatosItems.some(item => item.href === currentPath)) {
      setOpenSection('carga');
    } else if (calificacionesItems.some(item => item.href === currentPath)) {
      setOpenSection('calificaciones');
    } else if (adminCursosItems.some(item => item.href === currentPath)) {
      setOpenSection('admin');
    } else if (secretariaItems.some(item => item.href === currentPath)) {
      setOpenSection('secretaria');
    } else {
      setOpenSection(null);
    }
  }, [location.pathname]);

  const handleClick = (sectionName) => {
    setOpenSection(prev => (prev === sectionName ? null : sectionName));
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width, boxSizing: 'border-box' },
      }}
    >
      <Toolbar>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>CFP Admin</Typography>
      </Toolbar>
      <List>
        {/* Datos */}
        <ListItemButton onClick={() => handleClick('datos')}>
          <ListItemIcon><StorageIcon /></ListItemIcon>
          <ListItemText primary="Datos" />
          {openSection === 'datos' ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={openSection === 'datos'} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {dataItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Carga de Datos */}
        <ListItemButton onClick={() => handleClick('carga')}>
          <ListItemIcon><UploadFileIcon /></ListItemIcon>
          <ListItemText primary="Carga de Datos" />
          {openSection === 'carga' ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={openSection === 'carga'} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {cargaDatosItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Calificaciones */}
        <ListItemButton onClick={() => handleClick('calificaciones')}>
          <ListItemIcon><GradingIcon /></ListItemIcon>
          <ListItemText primary="Calificaciones" />
          {openSection === 'calificaciones' ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={openSection === 'calificaciones'} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {calificacionesItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Administración de Cursos */}
        <ListItemButton onClick={() => handleClick('admin')}>
          <ListItemIcon><SchoolIcon /></ListItemIcon>
          <ListItemText primary="Administración de Cursos" />
          {openSection === 'admin' ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={openSection === 'admin'} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {adminCursosItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Secretaría */}
        <ListItemButton onClick={() => handleClick('secretaria')}>
          <ListItemIcon><GroupIcon /></ListItemIcon>
          <ListItemText primary="Secretaría" />
          {openSection === 'secretaria' ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={openSection === 'secretaria'} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {secretariaItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

      </List>
    </Drawer>
  );
}

