import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../services/api.service';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!user.value);

  async function register(email: string, password: string, passwordConfirm: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<{ user: User }>('/auth/register', {
        email,
        password,
        passwordConfirm,
      });
      user.value = response.data.user;
      return user.value;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message[0]
          : 'Registration failed. Please check your inputs.');
      error.value = Array.isArray(message) ? message.join(', ') : message;
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<{ user: User }>('/auth/login', {
        email,
        password,
      });
      user.value = response.data.user;
      return user.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Invalid email or password.';
      throw new Error(error.value);
    } finally {
      loading.value = false;
    }
  }

  async function logout() {
    loading.value = true;
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      user.value = null;
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    loading.value = true;
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      user.value = response.data.user;
      return user.value;
    } catch (err) {
      user.value = null;
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    fetchCurrentUser,
  };
});
