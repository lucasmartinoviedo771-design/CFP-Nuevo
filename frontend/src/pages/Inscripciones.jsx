import { useEffect, useState } from "react";
import {
  createInscripcion,
  deleteInscripcion,
} from "../services/inscripcionesService";
import api from "../services/apiClient";
import {
  Box, Button, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress, Select, MenuItem,
  FormControl, InputLabel, Checkbox, FormControlLabel, Accordion, AccordionSummary, AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

export default function Inscripciones() {
  const [inscripciones, setInscripciones] = useState([]);
  const [students, setStudents] = useState([]);
  const [cohortes, setCohortes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedCohortes, setSelectedCohortes] = useState([]);
  const [selectedModulos, setSelectedModulos] = useState({}); // { cohorteId: [moduloId1, ...] }
  const [bloques, setBloques] = useState({}); // { cohorteId: [bloque1, ...] }
  const [approvedBloques, setApprovedBloques] = useState([]); // [bloqueId1, ...]
  const [errorMsg, setErrorMsg] = useState(null);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [inscripcionesData, studentsData, cohortesData] = await Promise.all([
          api.get('/inscripciones/'),
          api.get('/estudiantes/'),
          api.get('/cohortes/'),
        ]);
        setInscripciones(inscripcionesData.data.results || inscripcionesData.data);
        setStudents(studentsData.data.results || studentsData.data);
        setCohortes(cohortesData.data.results || cohortesData.data);
      } catch (e) {
        console.error("Error fetching data for Inscripciones:", e?.response?.status, e?.response?.data || e?.message);
        setErrorMsg("Error al cargar los datos iniciales.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleStudentChange = async (event) => {
    const studentId = event.target.value;
    setSelectedStudent(studentId);
    setSelectedCohortes([]);
    setSelectedModulos({});
    if (studentId) {
      try {
        const { data: approved } = await api.get(`/estudiantes/${studentId}/approved_bloques/`);
        setApprovedBloques(approved.map(b => b.id));
      } catch (error) {
        console.error(`Error fetching approved bloques for student ${studentId}:`, error);
        setApprovedBloques([]);
      }
    } else {
      setApprovedBloques([]);
    }
  };

  const handleModuloToggle = async (cohorteId, moduloId) => {
    const isSelected = selectedModulos[cohorteId]?.includes(moduloId);
    const allBloques = bloques[cohorteId] || [];
    const parentBloque = allBloques.find(b => b.modulos.some(m => m.id === moduloId));

    if (!isSelected && parentBloque) {
      // Prerequisite check
      if (parentBloque.correlativas && parentBloque.correlativas.length > 0) {
        try {
          const { data: prereqCheck } = await api.get(`/bloques/${parentBloque.id}/verificar_correlativas/?student_id=${selectedStudent}`);
          if (!prereqCheck.requisitos_cumplidos) {
            const faltantes = prereqCheck.bloques_faltantes.map(b => b.nombre).join(', ');
            if (!window.confirm(`Advertencia: Faltan correlativas del bloque padre (${parentBloque.nombre}) por aprobar: ${faltantes}. ¿Desea inscribir de todas formas?`)) {
              return;
            }
          }
        } catch (error) {
          console.error(`Error checking prerequisites for bloque ${parentBloque.id}:`, error);
        }
      }
    }

    setSelectedModulos(prev => {
      const cohorteModulos = prev[cohorteId] || [];
      const newModulos = cohorteModulos.includes(moduloId)
        ? cohorteModulos.filter(id => id !== moduloId)
        : [...cohorteModulos, moduloId];
      return { ...prev, [cohorteId]: newModulos };
    });
  };

  const handleCohorteToggle = async (cohorteId) => {
    const isSelected = selectedCohortes.includes(cohorteId);
    if (isSelected) {
      setSelectedCohortes(prev => prev.filter(id => id !== cohorteId));
      setBloques(prev => { const newState = { ...prev }; delete newState[cohorteId]; return newState; });
      setSelectedModulos(prev => { const newState = { ...prev }; delete newState[cohorteId]; return newState; });
    } else {
      setSelectedCohortes(prev => [...prev, cohorteId]);
      try {
        const cohorte = cohortes.find(c => c.id === cohorteId);
        const programaId = cohorte.programa.id;
        const { data: programaData } = await api.get(`/programas/${programaId}/`);
        const cohorteBloques = programaData.baterias.flatMap(b => b.bloques);
        setBloques(prev => ({ ...prev, [cohorteId]: cohorteBloques }));
      } catch (error) {
        console.error(`Error fetching bloques for cohorte ${cohorteId}:`, error);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!selectedStudent || Object.keys(selectedModulos).length === 0 || Object.values(selectedModulos).every(arr => arr.length === 0)) {
      setErrorMsg("Por favor, selecciona un estudiante y al menos un módulo en una cohorte.");
      return;
    }

    try {
      const inscripcionesACrear = [];
      for (const cohorteId in selectedModulos) {
        for (const moduloId of selectedModulos[cohorteId]) {
          inscripcionesACrear.push({
            estudiante_id: selectedStudent,
            cohorte_id: cohorteId,
            modulo_id: moduloId,
            estado: 'ACTIVO',
          });
        }
      }

      if (inscripcionesACrear.length === 0) {
        setErrorMsg("No se ha seleccionado ningún módulo válido para inscribir.");
        return;
      }

      await Promise.all(inscripcionesACrear.map(inscripcion => createInscripcion(inscripcion)));

      alert('Inscripción/es creada/s con éxito!');
      
      // Reset form state
      setSelectedStudent('');
      setSelectedCohortes([]);
      setSelectedModulos({});
      
      // Refetch inscriptions
      const updatedInscripciones = await api.get('/inscripciones/');
      setInscripciones(updatedInscripciones.data.results || updatedInscripciones.data);

    } catch (e) {
      console.error("Error creating inscripciones:", e?.response?.status, e?.response?.data || e?.message);
      const errorData = e.response?.data ? JSON.stringify(e.response.data) : (e.message || e);
      setErrorMsg(`Error al crear inscripciones: ${errorData}`);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Está seguro de que desea eliminar esta inscripción?")) {
      try {
        await deleteInscripcion(id);
        const updatedInscripciones = await api.get('/inscripciones/');
        setInscripciones(updatedInscripciones.data.results || updatedInscripciones.data);
      } catch (e) {
        console.error("Error deleting inscripcion:", e?.response?.status, e?.response?.data || e?.message);
        setErrorMsg("Error al eliminar la inscripción.");
      }
    }
  };

  return (
    <>
      <Box>
        <Typography variant="h4" gutterBottom>Gestionar Inscripciones</Typography>

        {errorMsg && (
          <Typography color="error" sx={{ mb: 2 }}>
            Error: {errorMsg}
          </Typography>
        )}

        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>Inscribir Estudiante a Módulos</Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="student-select-label">Estudiante</InputLabel>
              <Select
                labelId="student-select-label"
                value={selectedStudent}
                label="Estudiante"
                onChange={handleStudentChange}
              >
                <MenuItem value="">
                  <em>Selecciona un estudiante</em>
                </MenuItem>
                {students.map((student) => (
                  <MenuItem key={student.id} value={student.id}>
                    {student.apellido}, {student.nombre} ({student.dni})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedStudent && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1">Selecciona Cohortes:</Typography>
                {cohortes.map((cohorte) => (
                  <FormControlLabel
                    key={cohorte.id}
                    control={
                      <Checkbox
                        checked={selectedCohortes.includes(cohorte.id)}
                        onChange={() => handleCohorteToggle(cohorte.id)}
                      />
                    }
                    label={`${cohorte.programa.nombre} - ${cohorte.nombre}`}
                  />
                ))}
              </Box>
            )}

            {selectedCohortes.map(cohorteId => (
              <Box key={cohorteId} sx={{ mt: 2, ml: 4 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Módulos para {cohortes.find(c => c.id === cohorteId)?.nombre}:
                </Typography>
                {bloques[cohorteId]?.map(bloque => (
                  <Accordion key={bloque.id} sx={{ mt: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>{bloque.nombre}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ display: 'flex', flexDirection: 'column' }}>
                      {bloque.modulos?.map(modulo => {
                        const isEnrolledInModule = inscripciones.some(
                          (insc) => insc.modulo?.id === modulo.id && insc.estudiante.id === selectedStudent
                        );
                        return (
                          <FormControlLabel
                            key={modulo.id}
                            sx={{ ml: 2 }}
                            control={
                              <Checkbox
                                checked={isEnrolledInModule || selectedModulos[cohorteId]?.includes(modulo.id) || false}
                                onChange={() => handleModuloToggle(cohorteId, modulo.id)}
                                disabled={isEnrolledInModule}
                              />
                            }
                            label={modulo.nombre}
                          />
                        );
                      })}
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            ))}

            <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={!selectedStudent || selectedCohortes.length === 0}>
              Inscribir
            </Button>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>Inscripciones Existentes</Typography>
        {loading ? (
          <CircularProgress />
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Estudiante</TableCell>
                  <TableCell>Cohorte</TableCell>
                  <TableCell>Módulo Inscrito</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inscripciones.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.estudiante ? `${r.estudiante.apellido}, ${r.estudiante.nombre}` : 'N/A'}</TableCell>
                    <TableCell>{r.cohorte?.nombre || 'N/A'}</TableCell>
                    <TableCell>{r.modulo?.nombre || 'N/A'}</TableCell>
                    <TableCell>{r.estado}</TableCell>
                    <TableCell>
                      <Button size="small" color="error" onClick={() => handleDelete(r.id)}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </>
  );
}
