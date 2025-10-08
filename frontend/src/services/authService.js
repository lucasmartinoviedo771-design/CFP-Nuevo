
import apiClient from './apiClient';

const login = async (username, password) => {
    try {
        const response = await apiClient.post('/token/', {
            username,
            password,
        });
        if (response.data.access) {
            localStorage.setItem('accessToken', response.data.access);
            localStorage.setItem('refreshToken', response.data.refresh);
        }
        return response.data;
    } catch (err) {
        throw new Error(err.response?.data?.detail || 'Login failed');
    }
};

const refresh = async (refreshToken) => {
    try {
        const response = await apiClient.post('/token/refresh/', {
            refresh: refreshToken,
        });
        if (response.data.access) {
            localStorage.setItem('accessToken', response.data.access);
        }
        return response.data.access;
    } catch (err) {
        throw new Error(err.response?.data?.detail || 'Token refresh failed');
    }
};

const getUserDetails = async () => {
    try {
        const response = await apiClient.get('/user/');
        return response.data;
    } catch (err) {
        // Silently ignore aborted/canceled requests to avoid noisy logs during redirects
        if (err?.code === 'ECONNABORTED' || err?.message === 'Request aborted') {
            return null;
        }
        return null;
    }
};

const logout = async () => {
    try {
        const refresh = localStorage.getItem('refreshToken');
        if (refresh) {
            await apiClient.post('/logout/', { refresh });
        }
    } catch (e) {
        // Ignore server-side logout errors; proceed to clear local state
    } finally {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    }
};

const getAccessToken = () => {
    return localStorage.getItem('accessToken');
};

const getRefreshToken = () => {
    return localStorage.getItem('refreshToken');
};

const authService = {
    login,
    refresh,
    getUserDetails,
    logout,
    getAccessToken,
    getRefreshToken,
};

export default authService;
