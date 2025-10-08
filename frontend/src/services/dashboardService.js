import apiClient from './apiClient';

export const getDashboardStats = async () => {
  try {
    const response = await apiClient.get('/dashboard-stats/');
    console.log('Dashboard Service - Data received:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};
