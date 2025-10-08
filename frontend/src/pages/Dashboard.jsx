import React, { useEffect, useState } from 'react';
import { getDashboardStats } from '../services/dashboardService';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Grid, Card, CardContent, Typography, CircularProgress, Alert } from '@mui/material';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('Dashboard - useEffect triggered');
    const fetchStats = async () => {
      try {
        setLoading(true);
        console.log('Dashboard - Fetching stats...');
        const data = await getDashboardStats();
        console.log('Dashboard - Data received from service:', data);
        setStats(data);
        console.log('Dashboard - Stats state set:', data);
        setError(null);
      } catch (err) {
        console.error('Dashboard - Error fetching data:', err);
        setError('Failed to fetch dashboard data. Please make sure you are logged in.');
      } finally {
        setLoading(false);
        console.log('Dashboard - Loading finished');
      }
    };

    fetchStats();
  }, []);

  console.log('Dashboard - Current loading state:', loading);
  console.log('Dashboard - Current error state:', error);
  console.log('Dashboard - Current stats state:', stats);

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const chartData = {
    labels: stats?.programs_chart?.labels || [],
    datasets: [
      {
        label: '# de Estudiantes',
        data: stats?.programs_chart?.counts || [],
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Inscripciones por Programa',
      },
    },
    scales: {
        y: {
            beginAtZero: true,
            ticks: {
                stepSize: 1
            }
        }
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard title="Estudiantes Activos" value={stats.active_students_count} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard title="Egresados" value={stats.graduated_students_count} />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard title="Asistencia General" value={stats.attendance_rate} suffix="%" />
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <KPICard title="Tasa de Aprobación" value={stats.pass_rate} suffix="%" />
      </Grid>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Bar options={chartOptions} data={chartData} />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default Dashboard;
