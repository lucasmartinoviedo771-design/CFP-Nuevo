import React, { useState } from 'react';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, Collapse } from '@mui/material';
import { Link } from 'react-router-dom';

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
];

function NestedListItem({ item }) {
  return (
    <ListItemButton key={item.href} component={Link} to={item.href} sx={{ pl: 4 }}>
      <ListItemIcon>{item.icon}</ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
}

export default function Sidebar({ width=240 }) {
  const [open, setOpen] = useState({
    datos: true,
    carga: false,
    calificaciones: false,
    admin: false,
  });

  const handleClick = (item) => {
    setOpen(prev => ({ ...prev, [item]: !prev[item] }));
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
        <Typography variant="h6" sx={{ fontWeight: 700 }}>CFP • Admin</Typography>
      </Toolbar>
      <List>
        {/* Datos */}
        <ListItemButton onClick={() => handleClick('datos')}>
          <ListItemIcon><StorageIcon /></ListItemIcon>
          <ListItemText primary="Datos" />
          {open.datos ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open.datos} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {dataItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Carga de Datos */}
        <ListItemButton onClick={() => handleClick('carga')}>
          <ListItemIcon><UploadFileIcon /></ListItemIcon>
          <ListItemText primary="Carga de Datos" />
          {open.carga ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open.carga} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {cargaDatosItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Calificaciones */}
        <ListItemButton onClick={() => handleClick('calificaciones')}>
          <ListItemIcon><GradingIcon /></ListItemIcon>
          <ListItemText primary="Calificaciones" />
          {open.calificaciones ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open.calificaciones} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {calificacionesItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

        {/* Administración de Cursos */}
        <ListItemButton onClick={() => handleClick('admin')}>
          <ListItemIcon><SchoolIcon /></ListItemIcon>
          <ListItemText primary="Administración de Cursos" />
          {open.admin ? <ExpandLess /> : <ExpandMore />}
        </ListItemButton>
        <Collapse in={open.admin} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {adminCursosItems.map(item => <NestedListItem key={item.href} item={item} />)}
          </List>
        </Collapse>

      </List>
    </Drawer>
  );
}