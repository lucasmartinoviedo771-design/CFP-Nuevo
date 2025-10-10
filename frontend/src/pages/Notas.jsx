import React, { useEffect, useState } from 'react';
import { Card, CardContent, Grid, TextField } from '@mui/material';
import apiClient from '../services/apiClient';
import HistorialAcademico from '../components/HistorialAcademico'; // Import the new component

// These functions remain here as they are specific to the page's primary purpose
async function fetchEstudiantes() {
  const { data } = await apiClient.get('/estudiantes/');
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  if (Array.isArray(data)) {
    return data;
  }
  return []; // Always return an array
}

export default function Notas() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [selEstudiante, setSelEstudiante] = useState('');
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    (async () => {
      setEstudiantes(await fetchEstudiantes());
    })();
  }, []);

  useEffect(() => {
    if (!selEstudiante) {
      setCursos([]);
      setHistorial([]);
      return;
    }
    // Fetch student's full academic history
    (async () => {
      const { data } = await apiClient.get('/notas/', { params: { estudiante: selEstudiante } });
      setHistorial(data.results || data);
    })();

    // Fetch courses for the selected student (for filtering, etc.)
    (async () => {
      // Since inscriptions are now by module, we need to get the program from the module's block's bateria
      // This is complex, so for now, we'll fetch all programs as a workaround to populate the modal.
      // A better solution would be to have a specific endpoint or adjust the inscription serializer.
      const { data: allProgramas } = await apiClient.get('/programas/');
      setCursos(allProgramas.results || allProgramas);
    })();
  }, [selEstudiante]);


  return (
    <>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                SelectProps={{ native: true }}
                label="Estudiante"
                value={selEstudiante}
                onChange={(e)=>setSelEstudiante(e.target.value)}
              >
                <option value=""></option>
                {estudiantes.map(e=> <option key={e.id} value={e.id}>{e.apellido}, {e.nombre}</option>)}
              </TextField>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {selEstudiante && 
        <HistorialAcademico 
          historial={historial} 
          setHistorial={setHistorial} 
          selEstudiante={selEstudiante} 
          cursos={cursos} 
          readOnly={false} // Explicitly set to false for clarity
        />
      }
    </>
  );
}