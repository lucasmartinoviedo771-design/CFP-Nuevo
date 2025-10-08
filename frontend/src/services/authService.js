
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
        console.error("Error fetching user details:", err);
        return null;
    }
};

const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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
