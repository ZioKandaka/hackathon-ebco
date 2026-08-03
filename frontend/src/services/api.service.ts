import axios from 'axios';

export const apiClient = axios.create({
  baseURL: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);
