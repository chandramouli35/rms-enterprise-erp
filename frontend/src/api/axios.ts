import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { usePlantStore } from '../store/plantStore';

const API_URL = import.meta.env.VITE_RMS_BACKEND_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  const { activePlant } = usePlantStore.getState();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  if (activePlant) {
    config.headers['x-plant-id'] = activePlant.id;
  }

  return config;
});

// Simple response interceptor for 401s (To be expanded in future)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
