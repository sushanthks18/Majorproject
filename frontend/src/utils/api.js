import axios from 'axios';

export const getApiBaseUrl = () => {
  // 1. Highest priority: Explicit environment variable for cloud/production backend
  if (import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== '') {
    return import.meta.env.VITE_API_URL.trim();
  }
  // 2. Custom manual IP configured in dashboard for offline LAN mode
  const customIp = typeof window !== 'undefined' ? localStorage.getItem('krishi_custom_server_ip') : null;
  if (customIp && customIp.trim() !== '') {
    const clean = customIp.trim().replace(/^https?:\/\//i, '').replace(/:\d+$/, '').replace(/\/.*$/, '');
    return `http://${clean}:5001/api`;
  }
  // 3. Localhost development fallback
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5001/api';
  }
  // 4. Dynamic hostname resolution (e.g. krishisakha.local or LAN IP accessing frontend)
  if (typeof window !== 'undefined' && window.location.hostname) {
    return `http://${window.location.hostname}:5001/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests and ensure dynamic baseURL
api.interceptors.request.use(
  (config) => {
    config.baseURL = getApiBaseUrl();
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
