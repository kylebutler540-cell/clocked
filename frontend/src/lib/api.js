import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://backend-production-7798f.up.railway.app/api/',
  timeout: 20000, // increased — Railway backend can be slow on cold start
});

// Always attach latest token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('clocked-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry failed requests up to 2 times on network errors or 5xx
api.interceptors.response.use(
  res => res,
  async err => {
    const config = err.config;
    if (!config || config._retryCount >= 2) return Promise.reject(err);
    // Only retry on network errors or server errors (not 401/403/404)
    const status = err.response?.status;
    if (status && status < 500 && status !== undefined) return Promise.reject(err);
    config._retryCount = (config._retryCount || 0) + 1;
    await new Promise(r => setTimeout(r, 800 * config._retryCount));
    return api(config);
  }
);

export default api;
