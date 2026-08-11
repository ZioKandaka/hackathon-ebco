import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { useGoogleMap } from '../composables/useGoogleMap';

export interface UserLocationItem {
  id: string;
  name: string;
  businessType: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  regency?: string;
  subDistrict?: string;
  postalCode?: string;
  confidence?: number;
  createdAt?: string;
}

export const useLocationsStore = defineStore('locations', () => {
  const locations = ref<UserLocationItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const { addMarker, clearMarkers, setCenter } = useGoogleMap();

  async function fetchLocations() {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get<{ locations: UserLocationItem[] }>('/locations');
      locations.value = response.data.locations || [];
      renderLocationPins();
      return locations.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch user locations.';
      return [];
    } finally {
      loading.value = false;
    }
  }

  function renderLocationPins() {
    clearMarkers();
    if (locations.value.length === 0) return;

    locations.value.forEach((loc) => {
      addMarker(loc.id, {
        position: { lat: Number(loc.latitude), lng: Number(loc.longitude) },
        title: `${loc.name} (${loc.businessType})`,
      });
    });

    // Center on newest location if available
    const latest = locations.value[0];
    if (latest) {
      setCenter(Number(latest.latitude), Number(latest.longitude), 13);
    }
  }

  async function updateLocation(id: string, patch: Partial<UserLocationItem>) {
    error.value = null;
    try {
      const response = await apiClient.patch<{ location: UserLocationItem }>(`/locations/${id}`, patch);
      const updated = response.data.location;
      const idx = locations.value.findIndex((l) => l.id === id);
      if (idx !== -1) {
        locations.value[idx] = updated;
      }
      renderLocationPins();
      return updated;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to update location.';
      throw err;
    }
  }

  async function deleteLocation(id: string) {
    error.value = null;
    try {
      await apiClient.delete(`/locations/${id}`);
      locations.value = locations.value.filter((l) => l.id !== id);
      renderLocationPins();
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to delete location.';
      throw err;
    }
  }

  // Called on logout/login — clears this account's saved locations and their map pins.
  function resetStore() {
    locations.value = [];
    error.value = null;
    clearMarkers();
  }

  return {
    locations,
    loading,
    error,
    fetchLocations,
    renderLocationPins,
    updateLocation,
    deleteLocation,
    resetStore,
  };
});
