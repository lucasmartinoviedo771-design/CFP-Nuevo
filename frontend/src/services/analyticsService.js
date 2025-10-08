import apiClient from './apiClient';

export async function getEnrollments(params) {
  const { data } = await apiClient.get('/analytics/enrollments/', { params });
  return data;
}

export async function getAttendance(params) {
  const { data } = await apiClient.get('/analytics/attendance/', { params });
  return data;
}

export async function getGrades(params) {
  const { data } = await apiClient.get('/analytics/grades/', { params });
  return data;
}

export async function getDropout(params) {
  const { data } = await apiClient.get('/analytics/dropout/', { params });
  return data;
}

export async function getGraduates(params) {
  const { data } = await apiClient.get('/analytics/graduates/', { params });
  return data;
}

export default {
  getEnrollments,
  getAttendance,
  getGrades,
  getDropout,
  getGraduates,
};
