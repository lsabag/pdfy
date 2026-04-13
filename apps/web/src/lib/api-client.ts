import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://pdfy-api.lsabag.workers.dev/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pdfy-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('pdfy-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
