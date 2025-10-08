import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box, Card, CardContent, CardHeader, Grid, TextField, Button,
  Typography, Stack, IconButton, Tooltip, Divider, Chip,
  FormGroup, FormControlLabel, Checkbox, Table, TableBody, TableCell,
  TableHead, TableRow, TableContainer, Paper, MenuItem, TableSortLabel,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Snackbar, Alert, Tabs, Tab, CircularProgress, TablePagination
} from '@mui/material';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import api from '../services/apiClient';
import FileUpload from '../components/FileUpload';
import { uploadFile } from '../services/uploadService';

const headCells = [
  { id: 'dni', label: 'DNI' },
  { id: 'apellido', label: 'Estudiante' },
  { id: 'email', label: 'Email' },
  { id: 'created_at', label: 'Fecha Inscripción' },
  { id: 'ciudad', label: 'Ciudad' },
  { id: 'estatus', label: 'Estatus' },
];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('es-AR');
};

const initialFormState = {
  apellido: '', nombre: '', email: '', dni: '', cuit: '', sexo: '', fecha_nacimiento: '',
  pais_nacimiento: '', pais_nacimiento_otro: '', nacionalidad: '', nacionalidad_otra: '', lugar_nacimiento: '',
  domicilio: '', barrio: '', ciudad: '', telefono: '',
  nivel_educativo: '', estatus: 'Regular',
  posee_pc: false, posee_conectividad: false, puede_traer_pc: false,
  trabaja: false, lugar_trabajo: '',
  dni_digitalizado: ''
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} {...other}>
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function Estudiantes() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ 
    dni: '', nombre_apellido: '', email: '', ciudad: '', 
    fecha_inscripcion_after: '', fecha_inscripcion_before: '',
    estatus: ''
  });
  const [ordering, setOrdering] = useState({ field: 'apellido', direction: 'asc' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(initialFormState);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const [currentTab, setCurrentTab] = useState(0);
  const [page, setPage] = useState(0); // 0-based for MUI
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [total, setTotal] = useState(0);
  const formCardRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
        if (value) acc[key] = value;
        return acc;
      }, {});
      const params = { ...activeFilters };
      if (ordering.field) {
        params.ordering = `${ordering.direction === 'desc' ? '-' : ''}${ordering.field}`;
      }
      params.page = page + 1; // DRF is 1-based
      params.page_size = rowsPerPage;
      const { data } = await api.get('/estudiantes/', { params });
      setRows(data.results || data || []);
      setTotal(typeof data.count === 'number' ? data.count : (data.results ? data.results.length : (Array.isArray(data) ? data.length : 0)));
    } catch (error) {
      setFeedback({ open: true, message: 'Error al cargar los estudiantes.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filters, ordering, page, rowsPerPage]);

  useEffect(() => {
    if (currentTab === 0) {
      load();
    }
  }, [load, currentTab]);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const handleSort = (field) => {
    const isAsc = ordering.field === field && ordering.direction === 'asc';
    setOrdering({ field, direction: isAsc ? 'desc' : 'asc' });
    setPage(0);
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm((f) => ({ ...f, [name]: val }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSubmit = async () => {
    const payload = {
      dni: form.dni, cuit: form.cuit, apellido: form.apellido, nombre: form.nombre, email: form.email, sexo: form.sexo,
      fecha_nacimiento: form.fecha_nacimiento || null, pais_nacimiento: form.pais_nacimiento,
      pais_nacimiento_otro: form.pais_nacimiento === 'Otro' ? form.pais_nacimiento_otro : '',
      nacionalidad: form.nacionalidad, nacionalidad_otra: form.nacionalidad === 'Otro' ? form.nacionalidad_otra : '',
      lugar_nacimiento: form.lugar_nacimiento, domicilio: form.domicilio, barrio: form.barrio, ciudad: form.ciudad, telefono: form.telefono,
      nivel_educativo: form.nivel_educativo, estatus: form.estatus, posee_pc: form.posee_pc, posee_conectividad: form.posee_conectividad,
      puede_traer_pc: form.posee_pc ? form.puede_traer_pc : false, trabaja: form.trabaja,
      lugar_trabajo: form.trabaja ? form.lugar_trabajo : '', dni_digitalizado: form.dni_digitalizado,
    };

    const apiCall = editId ? api.put(`/estudiantes/${editId}/`, payload) : api.post('/estudiantes/', payload);

    try {
      await apiCall;
      setFeedback({ open: true, message: `Estudiante ${editId ? 'actualizado' : 'creado'} con éxito`, severity: 'success' });
      setForm(initialFormState);
      setEditId(null);
      load();
    } catch (error) {
      const errorMsg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      setFeedback({ open: true, message: `Error al guardar: ${errorMsg}`, severity: 'error' });
    }
  };

  const handleStartEdit = (student) => {
    setEditId(student.id);
    const studentData = { ...initialFormState, ...student };
    setForm(studentData);
    formCardRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setForm(initialFormState);
  };

  const handleOpenDeleteDialog = (student) => setDeleteTarget(student);
  const handleCloseDeleteDialog = () => setDeleteTarget(null);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/estudiantes/${deleteTarget.id}/`);
      setFeedback({ open: true, message: 'Estudiante dado de baja con éxito', severity: 'success' });
      handleCloseDeleteDialog();
      load();
    } catch (error) {
      setFeedback({ open: true, message: 'Error al dar de baja al estudiante', severity: 'error' });
    }
  };

  const handleCloseFeedback = (event, reason) => {
    if (reason === 'clickaway') return;
    setFeedback({ ...feedback, open: false });
  };

  return (
    <>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={currentTab} onChange={handleTabChange}>
          <Tab label="Gestión de Estudiantes" />
          <Tab label="Carga Masiva" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <Card sx={{ mt: 3 }} ref={formCardRef}>
          <CardHeader title={<Typography variant="h6" fontWeight={700}>{editId ? 'Editando Estudiante' : 'Agregar Estudiante'}</Typography>} />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12}><Divider><Chip label="Datos Personales" /></Divider></Grid>
              <Grid item md={3} xs={12}><TextField name="dni" label="DNI" fullWidth value={form.dni} onChange={onChange} /></Grid>
              <Grid item md={3} xs={12}><TextField name="cuit" label="CUIT" fullWidth value={form.cuit} onChange={onChange} /></Grid>
              <Grid item md={3} xs={12}><TextField name="apellido" label="Apellido" fullWidth value={form.apellido} onChange={onChange} /></Grid>
              <Grid item md={3} xs={12}><TextField name="nombre" label="Nombres" fullWidth value={form.nombre} onChange={onChange} /></Grid>
              <Grid item md={4} xs={12}><TextField name="email" label="Email" type="email" fullWidth value={form.email} onChange={onChange} /></Grid>
              <Grid item md={4} xs={12}>
                <TextField name="sexo" label="Sexo" select fullWidth value={form.sexo} onChange={onChange}>
                  <MenuItem value="Masculino">Masculino</MenuItem><MenuItem value="Femenino">Femenino</MenuItem><MenuItem value="Otro">Otro</MenuItem>
                </TextField>
              </Grid>
              <Grid item md={4} xs={12}><TextField name="fecha_nacimiento" label="Fecha de Nacimiento" type="date" fullWidth InputLabelProps={{ shrink: true }} value={form.fecha_nacimiento || ''} onChange={onChange} /></Grid>

              <Grid item xs={12}><Divider><Chip label="Origen" /></Divider></Grid>
              <Grid item md={3} xs={12}>
                <TextField name="pais_nacimiento" label="País de Nacimiento" select fullWidth value={form.pais_nacimiento} onChange={onChange}>
                  <MenuItem value="Argentina">Argentina</MenuItem><MenuItem value="Bolivia">Bolivia</MenuItem><MenuItem value="Brasil">Brasil</MenuItem><MenuItem value="Chile">Chile</MenuItem><MenuItem value="Paraguay">Paraguay</MenuItem><MenuItem value="Uruguay">Uruguay</MenuItem><MenuItem value="Otro">Otro</MenuItem>
                </TextField>
              </Grid>
              {form.pais_nacimiento === 'Otro' && <Grid item md={3} xs={12}><TextField name="pais_nacimiento_otro" label="Especificar País" fullWidth value={form.pais_nacimiento_otro} onChange={onChange} /></Grid>}
              <Grid item md={3} xs={12}>
                <TextField name="nacionalidad" label="Nacionalidad" select fullWidth value={form.nacionalidad} onChange={onChange}>
                  <MenuItem value="Argentina">Argentina</MenuItem><MenuItem value="Bolivia">Bolivia</MenuItem><MenuItem value="Brasil">Brasil</MenuItem><MenuItem value="Chile">Chile</MenuItem><MenuItem value="Paraguay">Paraguay</MenuItem><MenuItem value="Uruguay">Uruguay</MenuItem><MenuItem value="Otro">Otro</MenuItem>
                </TextField>
              </Grid>
              {form.nacionalidad === 'Otro' && <Grid item md={3} xs={12}><TextField name="nacionalidad_otra" label="Especificar Nacionalidad" fullWidth value={form.nacionalidad_otra} onChange={onChange} /></Grid>}
              <Grid item md={3} xs={12}><TextField name="lugar_nacimiento" label="Lugar de Nacimiento (Provincia)" fullWidth value={form.lugar_nacimiento} onChange={onChange} /></Grid>

              <Grid item xs={12}><Divider><Chip label="Contacto y Domicilio" /></Divider></Grid>
              <Grid item md={4} xs={12}><TextField name="domicilio" label="Domicilio" fullWidth value={form.domicilio} onChange={onChange} /></Grid>
              <Grid item md={3} xs={12}><TextField name="barrio" label="Barrio" fullWidth value={form.barrio} onChange={onChange} /></Grid>
              <Grid item md={3} xs={12}><TextField name="ciudad" label="Ciudad" fullWidth value={form.ciudad} onChange={onChange} /></Grid>
              <Grid item md={2} xs={12}><TextField name="telefono" label="Teléfono (10 dígitos)" fullWidth value={form.telefono} onChange={onChange} /></Grid>

              <Grid item xs={12}><Divider><Chip label="Datos Académicos y Estatus" /></Divider></Grid>
              <Grid item md={6} xs={12}>
                <TextField name="nivel_educativo" label="Nivel Educativo Alcanzado" select fullWidth value={form.nivel_educativo} onChange={onChange}>
                  <MenuItem value="Primaria Completa">Primaria Completa</MenuItem><MenuItem value="Secundaria Incompleta">Secundaria Incompleta</MenuItem><MenuItem value="Secundaria Completa">Secundaria Completa</MenuItem><MenuItem value="Terciaria/Universitaria Incompleta">Terciaria/Universitaria Incompleta</MenuItem><MenuItem value="Terciaria/Universitaria Completa">Terciaria/Universitaria Completa</MenuItem>
                </TextField>
              </Grid>
              <Grid item md={6} xs={12}>
                <TextField name="estatus" label="Estatus de Regularidad" select fullWidth value={form.estatus} onChange={onChange}>
                  <MenuItem value="Regular">Regular</MenuItem><MenuItem value="Libre">Libre</MenuItem><MenuItem value="Baja">Baja</MenuItem>
                </TextField>
              </Grid>

              <Grid item xs={12}><Divider><Chip label="Recursos y Trabajo" /></Divider></Grid>
              <Grid item xs={12}><FormGroup row sx={{ justifyContent: 'space-around' }}><FormControlLabel control={<Checkbox name="posee_pc" checked={form.posee_pc} onChange={onChange} />} label="Posee PC" /><FormControlLabel control={<Checkbox name="posee_conectividad" checked={form.posee_conectividad} onChange={onChange} />} label="Posee Internet" /><FormControlLabel control={<Checkbox name="puede_traer_pc" checked={form.puede_traer_pc} onChange={onChange} disabled={!form.posee_pc} />} label="Puede traer su PC" /><FormControlLabel control={<Checkbox name="trabaja" checked={form.trabaja} onChange={onChange} />} label="Trabaja" /></FormGroup></Grid>
              <Grid item md={12} xs={12}><TextField name="lugar_trabajo" label="Lugar de Trabajo" fullWidth value={form.lugar_trabajo} onChange={onChange} disabled={!form.trabaja} /></Grid>

              <Grid item xs={12}><Divider><Chip label="Documentación" /></Divider></Grid>
              <Grid item xs={12}><TextField name="dni_digitalizado" label="DNI Digitalizado (Link a Google Drive)" fullWidth value={form.dni_digitalizado} onChange={onChange} /></Grid>

              <Grid item xs={12}><Stack direction="row" justifyContent="flex-end" spacing={2}><Button variant="contained" size="large" onClick={handleSubmit} startIcon={<AddRoundedIcon />}>{editId ? 'Guardar Cambios' : 'Agregar Estudiante'}</Button>{editId && <Button variant="outlined" size="large" onClick={handleCancelEdit}>Cancelar</Button>}</Stack></Grid>
            </Grid>
          </CardContent>
        </Card>

        <Card sx={{ mb: 2 }}>
          <CardHeader title="Filtros de Búsqueda" />
          <CardContent>
            <Grid container spacing={2} onKeyDown={(e) => e.key === 'Enter' && load()}>
              <Grid item xs={12} md={2.5}><TextField fullWidth size="small" label="DNI" name="dni" value={filters.dni} onChange={handleFilterChange}/></Grid>
              <Grid item xs={12} md={2.5}><TextField fullWidth size="small" label="Nombre o Apellido" name="nombre_apellido" value={filters.nombre_apellido} onChange={handleFilterChange}/></Grid>
              <Grid item xs={12} md={2.5}><TextField fullWidth size="small" label="Email" name="email" value={filters.email} onChange={handleFilterChange}/></Grid>
              <Grid item xs={12} md={2.5}><TextField fullWidth size="small" label="Ciudad" name="ciudad" value={filters.ciudad} onChange={handleFilterChange}/></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Inscripto desde" name="fecha_inscripcion_after" value={filters.fecha_inscripcion_after} onChange={handleFilterChange} type="date" InputLabelProps={{ shrink: true }}/></Grid>
              <Grid item xs={12} md={3}><TextField fullWidth size="small" label="Inscripto hasta" name="fecha_inscripcion_before" value={filters.fecha_inscripcion_before} onChange={handleFilterChange} type="date" InputLabelProps={{ shrink: true }}/></Grid>
              <Grid item xs={12} md={3}>
                <TextField fullWidth size="small" label="Estatus" name="estatus" value={filters.estatus} onChange={handleFilterChange} select>
                  <MenuItem value="">Activos</MenuItem>
                  <MenuItem value="Todos">Todos</MenuItem>
                  <MenuItem value="Regular">Regular</MenuItem>
                  <MenuItem value="Libre">Libre</MenuItem>
                  <MenuItem value="Baja">Baja</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </CardContent>
          <Divider />
          <CardContent><Button variant="contained" onClick={load} startIcon={<SearchRoundedIcon />}>Buscar</Button></CardContent>
        </Card>

        <Card>
          <CardHeader title={<Typography variant="h6" fontWeight={700}>Lista de Estudiantes</Typography>} />
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    {headCells.map((headCell) => (
                      <TableCell key={headCell.id} sortDirection={ordering.field === headCell.id ? ordering.direction : false}>
                        <TableSortLabel active={ordering.field === headCell.id} direction={ordering.direction} onClick={() => handleSort(headCell.id)}>{headCell.label}</TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell align="right">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={headCells.length + 1} align="center">
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell><strong>{r.dni}</strong></TableCell>
                      <TableCell>{r.apellido}, {r.nombre}</TableCell>
                      <TableCell>{r.email || '-'}</TableCell>
                      <TableCell>{formatDate(r.created_at)}</TableCell>
                      <TableCell>{r.ciudad || '-'}</TableCell>
                      <TableCell><Chip label={r.estatus} size="small" color={r.estatus === 'Baja' ? 'error' : r.estatus === 'Libre' ? 'warning' : 'success'} /></TableCell>
                      <TableCell align="right">
                        <Tooltip title="Editar"><IconButton size="small" color="primary" onClick={() => handleStartEdit(r)}><EditOutlinedIcon /></IconButton></Tooltip>
                        <Tooltip title="Dar de Baja"><IconButton size="small" color="error" onClick={() => handleOpenDeleteDialog(r)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && !rows.length && (
                    <TableRow><TableCell colSpan={headCells.length + 1}><Typography color="text.secondary">No hay estudiantes cargados.</Typography></TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(e, p) => setPage(p)}
              onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              labelRowsPerPage="Filas por página:"
            />
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <FileUpload 
          title="Carga Masiva de Inscripciones"
          description="Sube un archivo .csv o .xlsx para inscribir o actualizar estudiantes masivamente. Asegúrate de que el formato coincida con la plantilla."
          doUpload={(file, onProgress) => uploadFile('/import-inscripciones/', file, onProgress)}
          onUpload={() => {
            setFeedback({ open: true, message: 'Archivo procesado. Refrescando lista...', severity: 'info' });
            load(); // Recarga la lista de estudiantes después de la subida
          }}
        />
      </TabPanel>

      <Dialog open={!!deleteTarget} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirmar Baja de Estudiante</DialogTitle>
        <DialogContent><DialogContentText>¿Estás seguro de que quieres dar de baja al estudiante <strong>{deleteTarget?.apellido}, {deleteTarget?.nombre}</strong>? El estudiante no aparecerá en las listas activas pero su historial se conservará.</DialogContentText></DialogContent>
        <DialogActions><Button onClick={handleCloseDeleteDialog}>Cancelar</Button><Button onClick={handleConfirmDelete} color="error" variant="contained">Dar de Baja</Button></DialogActions>
      </Dialog>

      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={handleCloseFeedback} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={handleCloseFeedback} severity={feedback.severity} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </>
  );
}
