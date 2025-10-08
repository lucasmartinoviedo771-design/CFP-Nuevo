import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, Checkbox,
  Grid, Tabs, Tab, Select, MenuItem, FormControl, InputLabel, Snackbar, Alert
} from "@mui/material";
import FileUpload from "../components/FileUpload";
import ResultPanel from "../components/ResultPanel";
import { uploadFile } from "../services/uploadService";
import { listAsistencias, createAsistencia, updateAsistencia } from "../services/asistenciasService";
import api from '../services/apiClient';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function Asistencia() {
  const [tabValue, setTabValue] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [programas, setProgramas] = useState([]);
  const [cohortes, setCohortes] = useState([]);
  const [selectedCohorteId, setSelectedCohorteId] = useState('');
  const [bloques, setBloques] = useState([]);
  const [selectedProgramaId, setSelectedProgramaId] = useState('');
  const [selectedBloqueId, setSelectedBloqueId] = useState('');
  const [clases, setClases] = useState([]);
  const [selectedClaseDate, setSelectedClaseDate] = useState('');
  const [students, setStudents] = useState([]);
  const [modulos, setModulos] = useState([]);
  const [attendanceGrid, setAttendanceGrid] = useState({}); // { studentId: { moduloId: attendanceId/true/false } }
  const [studentEnrolledModules, setStudentEnrolledModules] = useState({}); // { studentId: [moduleId1, ...] }
  const [loadingData, setLoadingData] = useState(false);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const fetchProgramas = useCallback(async () => {
    try {
      const { data } = await api.get('/programas/');
      if (Array.isArray(data)) {
        setProgramas(data);
      }
    } catch (error) {
      setFeedback({ open: true, message: 'Error al cargar programas.', severity: 'error' });
    }
  }, []);

  const fetchCohortes = useCallback(async (programaId) => {
    if (!programaId) return;
    try {
      const { data } = await api.get(`/cohortes/?programa=${programaId}`);
      setCohortes(data.results || data);
    } catch (error) {
      setFeedback({ open: true, message: 'Error al cargar cohortes.', severity: 'error' });
    }
  }, []);

  const fetchCalendario = useCallback(async (cohorteId) => {
    if (!cohorteId) return;
    try {
      const { data: cohorte } = await api.get(`/cohortes/${cohorteId}/`);
      const bloqueFechasId = cohorte.bloque_fechas.id;
      const { data: calendario } = await api.get(`/bloques-de-fechas/${bloqueFechasId}/calendario/`);
      const clases = calendario.filter(item => item.tipo === 'Clase');
      setClases(clases);
    } catch (error) {
      setFeedback({ open: true, message: 'Error al cargar el calendario.', severity: 'error' });
    }
  }, []);

  const fetchBloques = useCallback(async (programaId) => {
    if (!programaId) return;
    try {
      const { data } = await api.get(`/programas/${programaId}/`);
      if (data && data.baterias) {
        const allBloques = data.baterias.flatMap(bateria => bateria.bloques);
        setBloques(allBloques);
        if (allBloques.length === 1) {
          setSelectedBloqueId(allBloques[0].id);
        }
      } else {
        setBloques([]);
      }
    } catch (error) {
      setFeedback({ open: true, message: 'Error al cargar bloques.', severity: 'error' });
    }
  }, []);

  const fetchStudentsAndModulos = useCallback(async (cohorteId, bloqueId, fecha) => {
    if (!cohorteId || !bloqueId || !fecha) return;
    setLoadingData(true);
    try {
      const { data: inscriptionsData } = await api.get(`/inscripciones/?cohorte=${cohorteId}&modulo__bloque=${bloqueId}`);
      const inscriptions = inscriptionsData.results || inscriptionsData;

      const studentMap = new Map();
      const moduleMap = new Map();
      const enrolledModulesMap = {};

      inscriptions.forEach(insc => {
        if (insc.estudiante && insc.modulo) {
          studentMap.set(insc.estudiante.id, insc.estudiante);
          moduleMap.set(insc.modulo.id, insc.modulo);
          if (!enrolledModulesMap[insc.estudiante.id]) {
            enrolledModulesMap[insc.estudiante.id] = [];
          }
          enrolledModulesMap[insc.estudiante.id].push(insc.modulo.id);
        }
      });

      const uniqueStudents = Array.from(studentMap.values());
      const uniqueModulos = Array.from(moduleMap.values());

      setStudents(uniqueStudents);
      setModulos(uniqueModulos);
      setStudentEnrolledModules(enrolledModulesMap);

      // Fetch existing attendance for these students and modulos for the selected date
      const { data: existingAttendance } = await listAsistencias({ modulo__bloque: bloqueId, fecha: fecha });
      const grid = {};
      if (Array.isArray(existingAttendance)) {
        existingAttendance.forEach(att => {
          if (!grid[att.estudiante]) grid[att.estudiante] = {};
          grid[att.estudiante][att.modulo] = att.id; // Store attendance ID if present
        });
      }
      setAttendanceGrid(grid);

    } catch (error) {
      setFeedback({ open: true, message: 'Error al cargar estudiantes y módulos.', severity: 'error' });
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchProgramas(); }, [fetchProgramas]);
  useEffect(() => { fetchCohortes(selectedProgramaId); }, [fetchCohortes, selectedProgramaId]);
  useEffect(() => { fetchCalendario(selectedCohorteId); }, [fetchCalendario, selectedCohorteId]);
  useEffect(() => { fetchBloques(selectedProgramaId); }, [fetchBloques, selectedProgramaId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleProgramaChange = (e) => {
    setSelectedProgramaId(e.target.value);
    setSelectedCohorteId('');
    setSelectedBloqueId('');
    setSelectedClaseDate('');
    setStudents([]);
    setModulos([]);
    setAttendanceGrid({});
    setStudentEnrolledModules({});
  };

  const handleCohorteChange = (e) => {
    setSelectedCohorteId(e.target.value);
    setSelectedBloqueId('');
    setSelectedClaseDate('');
    setStudents([]);
    setModulos([]);
    setAttendanceGrid({});
    setStudentEnrolledModules({});
  };

  const handleBloqueChange = (e) => {
    setSelectedBloqueId(e.target.value);
    setSelectedClaseDate('');
  };

  const handleClaseChange = (e) => {
    setSelectedClaseDate(e.target.value);
  };

  const handleAttendanceChange = (studentId, moduloId) => {
    setAttendanceGrid(prevGrid => {
      const newGrid = { ...prevGrid };
      if (!newGrid[studentId]) newGrid[studentId] = {};
      newGrid[studentId][moduloId] = !newGrid[studentId][moduloId]; 
      return newGrid;
    });
  };

  const handleSaveAttendance = async () => {
    setLoadingData(true);
    try {
      const attendanceRecordsToSave = [];
      for (const studentId in attendanceGrid) {
        for (const moduloId in attendanceGrid[studentId]) {
          const isPresent = attendanceGrid[studentId][moduloId];
          if (isPresent) {
            attendanceRecordsToSave.push({
              estudiante: studentId,
              modulo: moduloId,
              fecha: selectedClaseDate,
              presente: true,
              id: typeof isPresent === 'string' ? isPresent : undefined
            });
          } else if (typeof isPresent === 'string') {
            await api.delete(`/asistencias/${isPresent}/`);
          }
        }
      }

      for (const record of attendanceRecordsToSave) {
        if (record.id) {
          await updateAsistencia(record.id, { presente: record.presente, fecha: record.fecha });
        } else {
          await createAsistencia(record);
        }
      }
      setFeedback({ open: true, message: 'Asistencias guardadas con éxito', severity: 'success' });
      fetchStudentsAndModulos(selectedCohorteId, selectedBloqueId, selectedClaseDate);
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar asistencias: ${errorMsg}`, severity: 'error' });
    } finally {
      setLoadingData(false);
    }
  };

  const handleCloseFeedback = (event, reason) => {
    if (reason === 'clickaway') return;
    setFeedback({ ...feedback, open: false });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" gutterBottom>Gestión de Asistencias</Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="Asistencia tabs">
          <Tab label="Tomar Asistencia" {...a11yProps(0)} />
          <Tab label="Carga por Archivo" {...a11yProps(1)} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {programas.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Programa</InputLabel>
              <Select value={selectedProgramaId} label="Programa" onChange={handleProgramaChange}>
                <MenuItem value=""><em>Seleccionar Programa</em></MenuItem>
                {programas.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={!selectedProgramaId}>
              <InputLabel>Cohorte</InputLabel>
              <Select value={selectedCohorteId} label="Cohorte" onChange={handleCohorteChange}>
                <MenuItem value=""><em>Seleccionar Cohorte</em></MenuItem>
                {cohortes.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={!selectedProgramaId}>
              <InputLabel>Bloque</InputLabel>
              <Select value={selectedBloqueId} label="Bloque" onChange={handleBloqueChange}>
                <MenuItem value=""><em>Seleccionar Bloque</em></MenuItem>
                {bloques.map(b => (
                  <MenuItem key={b.id} value={b.id}>{b.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={!selectedCohorteId}>
              <InputLabel>Clase</InputLabel>
              <Select value={selectedClaseDate} label="Clase" onChange={handleClaseChange}>
                <MenuItem value=""><em>Seleccionar Clase</em></MenuItem>
                {clases.map(c => (
                  <MenuItem key={c.orden} value={c.fecha_inicio}>{`Clase ${c.orden} - ${c.fecha_inicio}`}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" onClick={() => fetchStudentsAndModulos(selectedCohorteId, selectedBloqueId, selectedClaseDate)} disabled={!selectedBloqueId || !selectedClaseDate || loadingData}>Cargar Grilla de Asistencia</Button>
          </Grid>
        </Grid>
        )}

        {loadingData ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
        ) : (selectedBloqueId && students.length > 0 && modulos.length > 0 ? (
          <TableContainer component={Paper}>
            <Table size="small" sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Estudiante</TableCell>
                  {modulos.map(mod => (
                    <TableCell key={mod.id} sx={{ fontWeight: 'bold' }}>{mod.nombre}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {students.map(student => (
                  <TableRow key={student.id}>
                    <TableCell>{student.apellido}, {student.nombre}</TableCell>
                    {modulos.map(mod => {
                      const isEnrolled = studentEnrolledModules[student.id]?.includes(mod.id);
                      return (
                        <TableCell key={mod.id}>
                          <Checkbox
                            checked={isEnrolled && !!attendanceGrid[student.id]?.[mod.id]}
                            disabled={!isEnrolled}
                            onChange={() => handleAttendanceChange(student.id, mod.id)}
                            sx={{ color: attendanceGrid[student.id]?.[mod.id] ? 'success.main' : 'default' }}
                          />
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (selectedBloqueId && selectedClaseDate && <Typography sx={{ mt: 2 }}>No hay estudiantes inscriptos en módulos para este bloque.</Typography>))}

        {selectedBloqueId && students.length > 0 && modulos.length > 0 && (
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" onClick={handleSaveAttendance} disabled={loadingData}>Guardar Asistencias</Button>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <FileUpload
          title="Cargar asistencia semanal (Moodle)"
          description={<>Nombre recomendado <b>SemanaYYYY-MM-DD.csv/xlsx</b>. Formato normalizado: <code>DNI, Módulo, Fecha, Presente</code>.</>}
          endpoint="/api/import-asistencia/"
          doUpload={(file, onProgress) => uploadFile("/api/import-asistencia/", file, onProgress)}
          onUpload={setUploadResult}
        />
        <ResultPanel result={uploadResult} />
      </TabPanel>

      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={handleCloseFeedback} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}