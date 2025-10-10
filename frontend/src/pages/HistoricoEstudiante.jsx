import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Grid, TextField } from '@mui/material';
import apiClient from '../services/apiClient';
import HistorialAcademico from '../components/HistorialAcademico';

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

export default function HistoricoEstudiante() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [selEstudiante, setSelEstudiante] = useState('');
  const [historial, setHistorial] = useState([]);

  useEffect(() => {
    (async () => {
      setEstudiantes(await fetchEstudiantes());
    })();
  }, []);

  useEffect(() => {
    if (!selEstudiante) {
      setHistorial([]);
      return;
    }
    (async () => {
      const { data } = await apiClient.get('/notas/', { params: { estudiante: selEstudiante } });
      setHistorial(data.results || data);
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
          setHistorial={setHistorial} // Prop might not be used in readOnly, but good to pass
          selEstudiante={selEstudiante} 
          cursos={[]} // Cursos are only needed for the Create modal, not needed in read-only
          readOnly={true}
        />
      }
    </>
  );
}
