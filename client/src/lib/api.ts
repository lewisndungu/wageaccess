import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add default timeout
  timeout: 30000,
});

// Add request interceptor for auth
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage or auth store
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

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common error cases
    if (error.response) {
      // Server responded with error status
      if (error.response.status === 401) {
        // Handle unauthorized - clear auth and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      // Return error with server message if available
      return Promise.reject(error.response.data?.message || error);
    }
    if (error.request) {
      // Request made but no response
      return Promise.reject('No response from server. Please check your connection.');
    }
    // Something else went wrong
    return Promise.reject(error.message || 'An unexpected error occurred');
  }
);

export { api }; 