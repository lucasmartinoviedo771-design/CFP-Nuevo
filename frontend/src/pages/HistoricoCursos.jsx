import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import apiClient from '../services/apiClient'; // Asegúrate que la ruta sea correcta

export default function HistoricoCursos() {
  const [cohortes, setCohortes] = useState([]);
  const [selectedCohorte, setSelectedCohorte] = useState('');
  const [tipoDato, setTipoDato] = useState('notas');
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Cargar las cohortes para el selector
    apiClient.get('/cohortes/')
      .then(response => {
        setCohortes(response.data.results || response.data);
      })
      .catch(err => {
        console.error("Error al cargar cohortes:", err);
        setError("No se pudieron cargar las cohortes.");
      });
  }, []);

  const handleBuscar = () => {
    if (!selectedCohorte) {
      setError("Por favor, selecciona una cohorte.");
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);

    apiClient.get(`/historico-cursos/?cohorte_id=${selectedCohorte}&tipo_dato=${tipoDato}`)
      .then(response => {
        setData(response.data);
      })
      .catch(err => {
        console.error("Error al buscar datos:", err);
        setError("Ocurrió un error al obtener los datos.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Histórico por Cursos y Capacitaciones</Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 240 }}>
          <InputLabel id="cohorte-select-label">Cohorte</InputLabel>
          <Select
            labelId="cohorte-select-label"
            value={selectedCohorte}
            label="Cohorte"
            onChange={e => setSelectedCohorte(e.target.value)}
          >
            {cohortes.map(cohorte => (
              <MenuItem key={cohorte.id} value={cohorte.id}>{cohorte.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="tipo-dato-select-label">Tipo de Dato</InputLabel>
          <Select
            labelId="tipo-dato-select-label"
            value={tipoDato}
            label="Tipo de Dato"
            onChange={e => setTipoDato(e.target.value)}
          >
            <MenuItem value="notas">Notas</MenuItem>
            <MenuItem value="asistencia">Asistencia</MenuItem>
          </Select>
        </FormControl>

        <Button variant="contained" onClick={handleBuscar} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : 'Buscar'}
        </Button>
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      {data && (
        <TableContainer component={Paper}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                {data.headers && data.headers.map(header => (
                  <TableCell key={header}>{header}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {data.rows && data.rows.map(row => (
                <TableRow key={row.ID}>
                  {data.headers.map(header => (
                    <TableCell key={`${row.ID}-${header}`}>
                      {row[header] !== null && row[header] !== undefined ? String(row[header]) : '-'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}