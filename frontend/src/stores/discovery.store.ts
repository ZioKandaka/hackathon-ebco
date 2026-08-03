import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { useGoogleMap } from '../composables/useGoogleMap';

export interface DiscoveryCandidateItem {
  rank: number;
  name: string;
  latitude: number;
  longitude: number;
  demandScore: number;
  competitionCount: number;
  rationale: string;
  regencyCode?: string;
}

export const useDiscoveryStore = defineStore('discovery', () => {
  const candidates = ref<DiscoveryCandidateItem[]>([]);
  const selectedCandidate = ref<DiscoveryCandidateItem | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const { addMarker, clearMarkers, setCenter } = useGoogleMap();

  async function searchCandidates(businessType: string, region: string) {
    loading.value = true;
    error.value = null;
    try {
      const response = await apiClient.post<{ candidates: DiscoveryCandidateItem[] }>(
        '/discovery/search',
        { businessType, region },
      );
      candidates.value = response.data.candidates || [];
      renderCandidatePins();
      return candidates.value;
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to search discovery candidates.';
      return [];
    } finally {
      loading.value = false;
    }
  }

  function setCandidates(items: DiscoveryCandidateItem[]) {
    candidates.value = items;
    renderCandidatePins();
  }

  function renderCandidatePins() {
    clearMarkers();
    if (candidates.value.length === 0) return;

    candidates.value.forEach((spot) => {
      addMarker(`spot-${spot.rank}`, {
        position: { lat: Number(spot.latitude), lng: Number(spot.longitude) },
        title: `Spot ${spot.rank}: ${spot.name} (Score: ${spot.demandScore})`,
        label: {
          text: `${spot.rank}`,
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontSize: '14px',
        },
        onClick: () => {
          selectCandidate(spot);
        },
      });
    });

    const first = candidates.value[0];
    if (first) {
      setCenter(Number(first.latitude), Number(first.longitude), 13);
    }
  }

  function selectCandidate(candidate: DiscoveryCandidateItem) {
    selectedCandidate.value = candidate;
    setCenter(Number(candidate.latitude), Number(candidate.longitude), 15);
  }

  function clearSelectedCandidate() {
    selectedCandidate.value = null;
  }

  return {
    candidates,
    selectedCandidate,
    loading,
    error,
    setCandidates,
    searchCandidates,
    renderCandidatePins,
    selectCandidate,
    clearSelectedCandidate,
  };
});
