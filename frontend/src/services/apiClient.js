import axios from 'axios';
import authService from './authService';

// En desarrollo, usa el proxy de CRA (package.json -> proxy)
// Fallback a "/api" para evitar CORS;
// en producción, sobreescribe con REACT_APP_API_BASE_URL si es necesario.
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || '/api',
});

// Request interceptor: Adds the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const url = config?.url || '';
    const isAuthRoute = url.includes('/token');
    const token = authService.getAccessToken();
    if (!isAuthRoute && token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handles expired tokens and refresh logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};

    // If request was aborted (navigation), don't spam errors
    if (error.code === 'ECONNABORTED' || error.message === 'Request aborted') {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = originalRequest.url || '';
    const isRefreshCall = url.includes('/token/refresh');

    // Handle 401 with refresh logic, but never for the refresh endpoint itself
    if (status === 401 && !isRefreshCall) {
      if (!originalRequest._retry) {
        originalRequest._retry = true; // Mark as retried to prevent infinite loops

        try {
          const refreshToken = authService.getRefreshToken();
          if (refreshToken) {
            // console.log("Access token expired. Attempting to refresh...");
            const newAccessToken = await authService.refresh(refreshToken);

            // Aseguramos que el nuevo token se use inmediatamente en el reintento
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

            // Reintentamos la solicitud original
            return apiClient(originalRequest);
          } else {
            // No refresh token, logout user
            // console.log("No refresh token found. Logging out.");
            authService.logout();
            window.location.href = '/login';
            return Promise.reject(error);
          }
        } catch (refreshError) {
          // Refresh token is invalid or expired
          console.error("Refresh token is invalid. Logging out.", refreshError);
          authService.logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }

    // For all other errors, just reject the promise
    return Promise.reject(error);
  }
);

export default apiClient;
