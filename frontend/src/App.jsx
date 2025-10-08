import React, { useState, createContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import AppLayout from "./layout/AppLayout";

// Page Components
import Asistencia from "./pages/Asistencia";
import Estudiantes from "./pages/Estudiantes";
import Notas from "./pages/Notas";
import CursoDetail from "./pages/CursoDetail";
import DashboardPage from "./pages/Dashboard";
import Login from "./pages/Login";
import Inscripciones from './pages/Inscripciones';
import Programas from './pages/Programas';
import Estructura from './pages/Estructura';
import Calendario from './pages/Calendario';
import Cohortes from './pages/Cohortes';
import HistoricoCursos from './pages/HistoricoCursos';
import HistoricoEstudiante from './pages/HistoricoEstudiante'; // Added

// Services
import authService from "./services/authService";

// Create a UserContext
export const UserContext = createContext(null);

// PrivateRoute component (simplified, will be used to wrap individual routes)
const PrivateRoute = ({ children }) => {
  const isAuthenticated = authService.getAccessToken();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Wrapper components to apply AppLayout and PrivateRoute
function Dashboard() {
  return (
    <AppLayout title="Dashboard">
      <DashboardPage />
    </AppLayout>
  );
}

function EstudiantesWrapper() {
  return (
    <AppLayout title="Estudiantes">
      <Estudiantes />
    </AppLayout>
  );
}

function AsistenciaWrapper() {
  return (
    <AppLayout title="Asistencia">
      <Asistencia />
    </AppLayout>
  );
}


function CursoDetailWrapper() {
  return (
    <AppLayout title="Detalle del Curso">
      <CursoDetail />
    </AppLayout>
  );
}

function InscripcionesWrapper() {
  return (
    <AppLayout title="Inscripciones">
      <Inscripciones />
    </AppLayout>
  );
}

function NotasWrapper() {
  return (
    <AppLayout title="Notas / Equivalencias">
      <Notas />
    </AppLayout>
  );
}

function ProgramasWrapper() {
  return (
    <AppLayout title="Programas">
      <Programas />
    </AppLayout>
  );
}

function EstructuraWrapper() {
  return (
    <AppLayout title="Estructura Académica">
      <Estructura />
    </AppLayout>
  );
}

function CalendarioWrapper() {
  return (
    <AppLayout title="Calendario Académico">
      <Calendario />
    </AppLayout>
  );
}

function CohortesWrapper() {
  return (
    <AppLayout title="Cohortes">
      <Cohortes />
    </AppLayout>
  );
}

function HistoricoCursosWrapper() {
  return (
    <AppLayout title="Histórico por Cursos">
      <HistoricoCursos />
    </AppLayout>
  );
}

// Added Wrapper for new page
function HistoricoEstudianteWrapper() {
  return (
    <AppLayout title="Histórico por Estudiante">
      <HistoricoEstudiante />
    </AppLayout>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  return (
    <ThemeProvider theme={theme}>
      <UserContext.Provider value={{ user, setUser }}>

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/estudiantes" element={<PrivateRoute><EstudiantesWrapper /></PrivateRoute>} />
            <Route path="/asistencia" element={<PrivateRoute><AsistenciaWrapper /></PrivateRoute>} />
            <Route path="/notas" element={<PrivateRoute><NotasWrapper /></PrivateRoute>} />
            <Route path="/cursos/:id" element={<PrivateRoute><CursoDetailWrapper /></PrivateRoute>} />
            <Route path="/inscripciones" element={<PrivateRoute><InscripcionesWrapper /></PrivateRoute>} />
            <Route path="/programas" element={<PrivateRoute><ProgramasWrapper /></PrivateRoute>} />
            <Route path="/estructura" element={<PrivateRoute><EstructuraWrapper /></PrivateRoute>} />
            <Route path="/calendario" element={<PrivateRoute><CalendarioWrapper /></PrivateRoute>} />
            <Route path="/cohortes" element={<PrivateRoute><CohortesWrapper /></PrivateRoute>} />
            <Route path="/historico-cursos" element={<PrivateRoute><HistoricoCursosWrapper /></PrivateRoute>} />
            <Route path="/historico-estudiante" element={<PrivateRoute><HistoricoEstudianteWrapper /></PrivateRoute>} /> {/* Added */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} /> {/* Catch-all for unknown routes */}
          </Routes>

      </UserContext.Provider>
    </ThemeProvider>
  );
}