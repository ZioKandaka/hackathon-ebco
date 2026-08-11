import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { apiClient } from '../services/api.service';
import { useChatStore } from './chat.store';
import { useCatchmentStore } from './catchment.store';
import { useSiteVisitStore } from './siteVisit.store';
import { useDiscoveryStore } from './discovery.store';
import { useHeatmapStore } from './heatmap.store';
import { useLocationsStore } from './locations.store';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

// Every feature store is a singleton that lives for the whole tab session — without this, logging
// out and into a different account leaves the previous account's messages/runs/map pins sitting
// in memory (and chat.store's historyLoaded guard would permanently skip re-fetching them).
function resetFeatureStores() {
  useChatStore().resetStore();
  useCatchmentStore().resetStore();
  useSiteVisitStore().resetStore();
  useDiscoveryStore().resetStore();
  useHeatmapStore().resetStore();
  useLocationsStore().resetStore();
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => !!user.value);

  async function register(email: string, password: string, passwordConfirm: string) {
    loading.value = true;
    error.value = null;
    resetFeatureStores();
    try {
      const response = await apiClient.post<{ user: User; accessToken?: string }>('/auth/register', {
        email,
        password,
        passwordConfirm,
      });
      user.value = response.data.user;
      if (response.data.accessToken) {
        localStorage.setItem('access_token', response.data.accessToken);
      }
      initialized.value = true;
      return user.value;
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (Array.isArray(err.response?.data?.message)
          ? err.response.data.message[0]
          : 'Registration failed. Please check your inputs.');
      error.value = Array.isArray(message) ? message.join(', ') : message;
      throw new Error(error.value || 'Registration failed.');
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;
    resetFeatureStores();
    try {
      const response = await apiClient.post<{ user: User; accessToken?: string }>('/auth/login', {
        email,
        password,
      });
      user.value = response.data.user;
      if (response.data.accessToken) {
        localStorage.setItem('access_token', response.data.accessToken);
      }
      initialized.value = true;
      return user.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Invalid email or password.';
      throw new Error(error.value || 'Login failed.');
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
      localStorage.removeItem('access_token');
      resetFeatureStores();
      loading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (initialized.value && user.value) {
      return user.value;
    }
    loading.value = true;
    try {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      user.value = response.data.user;
      return user.value;
    } catch (err) {
      user.value = null;
      localStorage.removeItem('access_token');
      resetFeatureStores();
      return null;
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  return {
    user,
    loading,
    error,
    initialized,
    isAuthenticated,
    register,
    login,
    logout,
    fetchCurrentUser,
  };
});
