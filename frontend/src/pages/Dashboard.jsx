import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getDashboardStats } from '../services/dashboardService';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Grid, Card, CardContent, Typography, CircularProgress, Alert, Box, TextField, MenuItem, Select, InputLabel, FormControl, Button } from '@mui/material';
import { listProgramas } from '../services/programasService';
import api from '../services/apiClient';
import analytics from '../services/analyticsService';
import PptxGenJS from 'pptxgenjs';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const KPICard = ({ title, value, suffix = '' }) => (
  <Card sx={{ textAlign: 'center' }}>
    <CardContent>
      <Typography variant="h3" component="div" fontWeight="bold">
        {value}{suffix}
      </Typography>
      <Typography variant="body1" color="text.secondary">
        {title}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [programas, setProgramas] = useState([]);
  const [cohortes, setCohortes] = useState([]);
  const [filters, setFilters] = useState({ programa_id: '', cohorte_id: '', from: '', to: '' });
  const [attendanceGroupBy, setAttendanceGroupBy] = useState('module');

  const [enrollSeries, setEnrollSeries] = useState([]);
  const [attendanceData, setAttendanceData] = useState({ overall: null, series: [] });
  const [gradesData, setGradesData] = useState({ overall: null, aprobacion_por_tipo: [], histograma: [] });
  const [dropoutData, setDropoutData] = useState({ overall: null, series: [], at_risk: [] });
  const [dropoutRule, setDropoutRule] = useState('A');
  const [lookbackWeeks, setLookbackWeeks] = useState(3);

  // Refs for PNG/PPT
  const programsChartRef = useRef(null);
  const enrollChartRef = useRef(null);
  const attendanceChartRef = useRef(null);
  const approvalChartRef = useRef(null);
  const histChartRef = useRef(null);

  const downloadDataUrl = (dataUrl, filename) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportChartPng = (chartRef, filename) => {
    try {
      const chart = chartRef?.current;
      if (!chart) return;
      const url = chart.toBase64Image();
      downloadDataUrl(url, filename);
    } catch (e) {
      console.error('PNG export error', filename, e);
    }
  };

  const exportDashboardPptx = async () => {
    const pptx = new PptxGenJS();
    const today = new Date().toLocaleDateString('es-AR');

    // Portada
    let slide = pptx.addSlide();
    slide.addText('Dashboard CFP', { x:0.5, y:1.0, fontSize:28, bold:true });
    slide.addText(`Fecha: ${today}`, { x:0.5, y:1.6, fontSize:14 });

    const progName = (() => {
      if (!filters.programa_id) return null;
      const p = (programas || []).find(x => String(x.id) === String(filters.programa_id));
      return p ? p.nombre : `ID ${filters.programa_id}`;
    })();
    const cohName = (() => {
      if (!filters.cohorte_id) return null;
      const c = (cohortes || []).find(x => String(x.id) === String(filters.cohorte_id));
      return c ? c.nombre : `ID ${filters.cohorte_id}`;
    })();

    const metaLines = [
      progName ? `Programa: ${progName}` : null,
      cohName ? `Cohorte: ${cohName}` : null,
      filters.from ? `Desde: ${filters.from}` : null,
      filters.to ? `Hasta: ${filters.to}` : null,
      `Asistencia por: ${attendanceGroupBy === 'module' ? 'Modulo' : 'Semana'}`, 
      `Desercion: ${dropoutRule === 'A' ? 'Baja/Pausado' : `Inactividad (${lookbackWeeks} semanas)`}`,
    ].filter(Boolean).join('\n');
    slide.addText(metaLines || 'Sin filtros aplicados', { x:0.5, y:2.0, fontSize:12 });

    // KPIs
    slide.addText(`Estudiantes Activos: ${stats?.active_students_count ?? '-' }`, { x:0.5, y:3.0, fontSize:16 });
    slide.addText(`Egresados: ${stats?.graduated_students_count ?? '-' }`, { x:0.5, y:3.5, fontSize:16 });
    slide.addText(`Asistencia Global: ${Math.round((attendanceData.overall?.rate||0)*100)}%`, { x:0.5, y:4.0, fontSize:16 });
    slide.addText(`Aprobacion Global: ${Math.round((gradesData.overall?.rate||0)*100)}%`, { x:0.5, y:4.5, fontSize:16 });
    slide.addText(`Desercion: ${Math.round(((dropoutData.overall?.rate||0)*100))}%`, { x:0.5, y:5.0, fontSize:16 });

    // Helper to add chart slide
    const addChartSlide = (title, ref) => {
      try {
        const chart = ref?.current;
        if (!chart) return;
        const img = chart.toBase64Image();
        const s = pptx.addSlide();
        s.addText(title, { x:0.5, y:0.5, fontSize:18, bold:true });
        s.addImage({ data: img, x:0.5, y:1.0, w:9 });
      } catch (e) {
        console.error('PPTX image add error', title, e);
      }
    };

    addChartSlide('Inscripciones por Programa', programsChartRef);
    addChartSlide('Inscriptos por Mes', enrollChartRef);
    addChartSlide(`Asistencia (${attendanceGroupBy === 'module' ? 'por Modulo' : 'por Semana'})`, attendanceChartRef);
    addChartSlide('Aprobacion por Tipo de Examen', approvalChartRef);
    addChartSlide('Distribucion de Calificaciones', histChartRef);

    // Riesgo (Regla B)
    if (dropoutRule === 'B' && dropoutData?.at_risk?.length) {
      const s = pptx.addSlide();
      s.addText('Estudiantes en Riesgo (sin asistencia)', { x:0.5, y:0.5, fontSize:18, bold:true });
      const items = dropoutData.at_risk.slice(0, 25).map((st) => `• ${st.apellido}, ${st.nombre} — DNI ${st.dni}`);
      const mid = Math.ceil(items.length / 2);
      const col1 = items.slice(0, mid).join('\n');
      const col2 = items.slice(mid).join('\n');
      s.addText(col1, { x:0.5, y:1.1, fontSize:12, w:4.5, h:5.0 });
      if (col2) s.addText(col2, { x:5.2, y:1.1, fontSize:12, w:4.5, h:5.0 });
    }

    await pptx.writeFile(`dashboard-${new Date().toISOString().slice(0,10)}.pptx`);
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await getDashboardStats();
        setStats(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch dashboard data. Please make sure you are logged in.');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Inicializar filtros desde URL
  useEffect(() => {
    const p = searchParams.get('programa_id') || '';
    const c = searchParams.get('cohorte_id') || '';
    const f = searchParams.get('from') || '';
    const t = searchParams.get('to') || '';
    const attg = searchParams.get('attg') || 'module';
    const drop = searchParams.get('drop') || 'A';
    const weeks = searchParams.get('weeks');
    setFilters({ programa_id: p, cohorte_id: c, from: f, to: t });
    setAttendanceGroupBy(attg);
    setDropoutRule(drop);
    if (drop === 'B' && weeks) {
      const n = parseInt(weeks, 10);
      if (!Number.isNaN(n)) setLookbackWeeks(n);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Escribir filtros en URL
  useEffect(() => {
    const params = {};
    if (filters.programa_id) params.programa_id = filters.programa_id;
    if (filters.cohorte_id) params.cohorte_id = filters.cohorte_id;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    if (attendanceGroupBy && attendanceGroupBy !== 'module') params.attg = attendanceGroupBy;
    if (dropoutRule && dropoutRule !== 'A') params.drop = dropoutRule;
    if (dropoutRule === 'B') params.weeks = String(lookbackWeeks);
    setSearchParams(params, { replace: true });
  }, [filters.programa_id, filters.cohorte_id, filters.from, filters.to, attendanceGroupBy, dropoutRule, lookbackWeeks, setSearchParams]);

  // Cargar listas
  useEffect(() => {
    const boot = async () => {
      try {
        const [progsRes, cohsRes] = await Promise.all([
          listProgramas({ page: 1, page_size: 200 }),
          api.get('/cohortes/', { params: { page: 1, page_size: 200 } }),
        ]);
        setProgramas(progsRes.results || progsRes);
        setCohortes(cohsRes.data.results || cohsRes.data);
      } catch (e) {
        // ignore
      }
    };
    boot();
  }, []);

  const runAnalytics = async () => {
    try {
      const params = { ...filters };
      if (!params.programa_id) delete params.programa_id;
      if (!params.cohorte_id) delete params.cohorte_id;
      if (!params.from) delete params.from;
      if (!params.to) delete params.to;

      const [enr, att, grd, drp] = await Promise.all([
        analytics.getEnrollments({ ...params, group_by: 'month' }),
        analytics.getAttendance({ ...params, group_by: attendanceGroupBy }),
        analytics.getGrades(params),
        analytics.getDropout({ ...params, rule: dropoutRule, lookback_weeks: lookbackWeeks }),
      ]);
      setEnrollSeries(enr.series || []);
      setAttendanceData(att || { overall: null, series: [] });
      setGradesData(grd || { overall: null, aprobacion_por_tipo: [], histograma: [] });
      setDropoutData(drp || { overall: null, series: [], at_risk: [] });
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    runAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.programa_id, filters.cohorte_id, filters.from, filters.to, attendanceGroupBy, dropoutRule, lookbackWeeks]);

  if (loading) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const chartData = {
    labels: stats?.programs_chart?.labels || [],
    datasets: [{
      label: '# de Estudiantes',
      data: stats?.programs_chart?.counts || [],
      backgroundColor: 'rgba(0, 123, 255, 0.5)',
      borderColor: 'rgba(0, 123, 255, 1)',
      borderWidth: 1,
    }],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Inscripciones por Programa' },
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } },
  };

  return (
    <Grid container spacing={3}>
      {/* Filtros */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="prog-label">Programa</InputLabel>
                <Select labelId="prog-label" label="Programa" value={filters.programa_id}
                  onChange={(e) => setFilters(f => ({ ...f, programa_id: e.target.value }))}>
                  <MenuItem value=""><em>Todos</em></MenuItem>
                  {(programas || []).map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel id="coh-label">Cohorte</InputLabel>
                <Select labelId="coh-label" label="Cohorte" value={filters.cohorte_id}
                  onChange={(e) => setFilters(f => ({ ...f, cohorte_id: e.target.value }))}>
                  <MenuItem value=""><em>Todas</em></MenuItem>
                  {(cohortes || []).map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" type="date" label="Desde" InputLabelProps={{ shrink: true }}
                value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
              <TextField size="small" type="date" label="Hasta" InputLabelProps={{ shrink: true }}
                value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} />
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="attg-label">Asistencia por</InputLabel>
                <Select labelId="attg-label" label="Asistencia por" value={attendanceGroupBy}
                  onChange={(e) => setAttendanceGroupBy(e.target.value)}>
                  <MenuItem value="module">Modulo</MenuItem>
                  <MenuItem value="week">Semana</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" size="small" onClick={runAnalytics}>Actualizar</Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mt: 2 }}>
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel id="dropout-label">Desercion (Regla)</InputLabel>
                <Select labelId="dropout-label" label="Desercion (Regla)" value={dropoutRule}
                  onChange={(e) => setDropoutRule(e.target.value)}>
                  <MenuItem value="A">Regla A (Baja/Pausado)</MenuItem>
                  <MenuItem value="B">Regla B (Inactividad)</MenuItem>
                </Select>
              </FormControl>
              {dropoutRule === 'B' && (
                <TextField size="small" type="number" label="Semanas sin asistir" InputLabelProps={{ shrink: true }}
                  value={lookbackWeeks} onChange={(e) => setLookbackWeeks(parseInt(e.target.value || '3', 10))} />
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>

        {/* KPI cards */}
        <Grid item xs={12} sm={6} md={3}><KPICard title="Estudiantes Activos" value={stats.active_students_count} /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard title="Egresados" value={stats.graduated_students_count} /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard title="Asistencia General" value={Math.round((attendanceData.overall?.rate || 0) * 100)} suffix="%" /></Grid>
        <Grid item xs={12} sm={6} md={3}><KPICard title="Tasa de Aprobacion" value={Math.round((gradesData.overall?.rate || 0) * 100)} suffix="%" /></Grid>

        {/* Programs chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display:'flex', justifyContent:'flex-end', mb:1 }}>
                <Button size="small" onClick={() => exportChartPng(programsChartRef, 'inscripciones-por-programa.png')}>Descargar PNG</Button>
                <Button size="small" variant="outlined" sx={{ ml:1 }} onClick={exportDashboardPptx}>Exportar a PPTX</Button>
              </Box>
              <Bar ref={programsChartRef} options={chartOptions} data={chartData} />
            </CardContent>
          </Card>
        </Grid>

        {/* Enrollments */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Inscriptos por Mes</Typography>
              <Box sx={{ display:'flex', justifyContent:'flex-end', mb:1 }}>
                <Button size="small" onClick={() => exportChartPng(enrollChartRef, 'inscriptos-por-mes.png')}>Descargar PNG</Button>
              </Box>
              <Line ref={enrollChartRef}
                data={{ labels: (enrollSeries || []).map(p => p.period || ''), datasets: [{ label: 'Inscriptos', data: (enrollSeries || []).map(p => p.count || 0), borderColor: 'rgba(13,110,253,1)', backgroundColor: 'rgba(13,110,253,0.3)', tension: 0.2 }] }}
                options={{ responsive: true, plugins: { legend: { display: false } } }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Attendance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Asistencia ({attendanceGroupBy === 'module' ? 'por Modulo' : 'por Semana'})</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Global: {Math.round((attendanceData.overall?.rate || 0) * 100)}% de asistencia</Typography>
              <Box sx={{ display:'flex', justifyContent:'flex-end', mb:1 }}>
                <Button size="small" onClick={() => exportChartPng(attendanceChartRef, `asistencia-${attendanceGroupBy}.png`)}>Descargar PNG</Button>
              </Box>
              <Bar ref={attendanceChartRef}
                data={{ labels: (attendanceData.series || []).map(s => attendanceGroupBy === 'module' ? s.modulo_nombre : s.period), datasets: [{ label: 'Asistencia %', data: (attendanceData.series || []).map(s => Math.round((s.rate || 0) * 100)), backgroundColor: 'rgba(25, 135, 84, 0.5)', borderColor: 'rgba(25, 135, 84, 1)' }] }}
                options={{ responsive: true, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Grades by tipo */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Aprobacion por Tipo de Examen</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Global: {Math.round((gradesData.overall?.rate || 0) * 100)}% ({gradesData.overall?.aprobados || 0} / {gradesData.overall?.total || 0})</Typography>
              <Box sx={{ display:'flex', justifyContent:'flex-end', mb:1 }}>
                <Button size="small" onClick={() => exportChartPng(approvalChartRef, 'aprobacion-por-tipo.png')}>Descargar PNG</Button>
              </Box>
              <Bar ref={approvalChartRef}
                data={{ labels: (gradesData.aprobacion_por_tipo || []).map(i => i.tipo_examen), datasets: [{ label: 'Aprobacion %', data: (gradesData.aprobacion_por_tipo || []).map(i => Math.round((i.rate || 0) * 100)), backgroundColor: 'rgba(255, 159, 64, 0.5)', borderColor: 'rgba(255, 159, 64, 1)' }] }}
                options={{ responsive: true, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Histogram */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Distribucion de Calificaciones</Typography>
              <Box sx={{ display:'flex', justifyContent:'flex-end', mb:1 }}>
                <Button size="small" onClick={() => exportChartPng(histChartRef, 'histograma-calificaciones.png')}>Descargar PNG</Button>
              </Box>
              <Bar ref={histChartRef}
                data={{ labels: (gradesData.histograma || []).map(h => String(h.bin)), datasets: [{ label: 'Cantidad', data: (gradesData.histograma || []).map(h => h.count), backgroundColor: 'rgba(153, 102, 255, 0.5)', borderColor: 'rgba(153, 102, 255, 1)' }] }}
                options={{ responsive: true, plugins: { legend: { display: false } } }}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Dropout */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>Desercion {dropoutRule === 'A' ? '(Baja/Pausado)' : `(Inactividad ${lookbackWeeks} semanas)`}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Tasa: {Math.round(((dropoutData.overall?.rate || 0) * 100))}% ({dropoutData.overall?.dropout || 0} / {dropoutData.overall?.total_inscripciones || 0})</Typography>
              <Bar
                data={{ labels: (dropoutData.series || []).map(s => s.period), datasets: [{ label: 'Deserciones', data: (dropoutData.series || []).map(s => s.count), backgroundColor: 'rgba(220,53,69,0.5)', borderColor: 'rgba(220,53,69,1)' }] }}
                options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }}
              />
            </CardContent>
          </Card>
        </Grid>

        {dropoutRule === 'B' && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 1 }}>Estudiantes en Riesgo (sin asistencia)</Typography>
                {(!dropoutData.at_risk || dropoutData.at_risk.length === 0) ? (
                  <Typography color="text.secondary">Sin casos detectados con los filtros actuales.</Typography>
                ) : (
                  <Box component="ul" sx={{ pl: 3, mb: 0 }}>
                    {dropoutData.at_risk.map(s => (
                      <li key={s.id}>{s.apellido}, {s.nombre} — DNI {s.dni}</li>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}
</Grid>
);
};

export default Dashboard;