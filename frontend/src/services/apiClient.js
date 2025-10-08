import axios from 'axios';
import authService from './authService';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api',
});

// Request interceptor: Adds the auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token) {
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
    const originalRequest = error.config;

    // Check if the error is 401 and the failed request was not for token refresh
    if (error.response.status === 401 && originalRequest.url !== '/token/refresh/') {
      if (!originalRequest._retry) {
        originalRequest._retry = true; // Mark as retried to prevent infinite loops

        try {
          const refreshToken = authService.getRefreshToken();
          if (refreshToken) {
            console.log("Access token expired. Attempting to refresh...");
            const newAccessToken = await authService.refresh(refreshToken);
            
            // authService.refresh already updates localStorage. 
            // Now we retry the original request. The request interceptor will add the new token.
            return apiClient(originalRequest);
          } else {
            // No refresh token, logout user
            console.log("No refresh token found. Logging out.");
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