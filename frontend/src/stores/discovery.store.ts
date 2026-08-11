import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { useGoogleMap } from '../composables/useGoogleMap';
import { googleMapService } from '../services/google-map.service';
import type { DiscoveryDataPayload, DiscoveryCandidate } from '../services/chat-sse.service';

export interface DiscoveryRun {
  id: string;
  businessType: string;
  region: string;
  candidates: DiscoveryCandidate[];
  summary: string;
  createdAt: string;
}

// Raw shape returned by GET /discovery/history (the Postgres entity), distinct from the live
// SSE DiscoveryDataPayload shape — both get normalized into DiscoveryRun below.
interface RawHistoryRun {
  id: string;
  businessType: string;
  region: string;
  candidates: DiscoveryCandidate[];
  summary: string;
  createdAt: string;
}

function normalizeHistoryRun(raw: RawHistoryRun): DiscoveryRun {
  return {
    id: raw.id,
    businessType: raw.businessType,
    region: raw.region,
    candidates: raw.candidates,
    summary: raw.summary,
    createdAt: raw.createdAt,
  };
}

function normalizeLiveRun(payload: DiscoveryDataPayload): DiscoveryRun {
  return {
    id: payload.searchId,
    businessType: payload.businessType,
    region: payload.region,
    candidates: payload.candidates,
    summary: payload.summary,
    createdAt: payload.createdAt,
  };
}

export const useDiscoveryStore = defineStore('discovery', () => {
  const runs = ref<DiscoveryRun[]>([]);
  const activeRun = ref<DiscoveryRun | null>(null);
  const loading = ref(false);
  const historyLoaded = ref(false);
  const error = ref<string | null>(null);

  const selectedCandidate = ref<DiscoveryCandidate | null>(null);
  const activePoiCandidateRank = ref<number | null>(null);
  const nearbyPois = ref<any[]>([]);
  const nearbyPoiLoading = ref(false);

  const { addMarker, clearMarkers, setCenter } = useGoogleMap();

  async function fetchHistory() {
    loading.value = true;
    try {
      const response = await apiClient.get<{ runs: RawHistoryRun[] }>('/discovery/history');
      runs.value = (response.data.runs || []).map(normalizeHistoryRun);
      historyLoaded.value = true;
    } catch (err) {
      runs.value = [];
    } finally {
      loading.value = false;
    }
  }

  function addRun(payload: DiscoveryDataPayload) {
    const run = normalizeLiveRun(payload);
    runs.value.unshift(run);
    selectRun(run);
  }

  function selectRun(run: DiscoveryRun) {
    activeRun.value = run;
    clearSelectedCandidate();
    clearNearbyPois();
    renderCandidatePins();
  }

  function renderCandidatePins() {
    clearMarkers();
    const candidates = activeRun.value?.candidates || [];
    if (candidates.length === 0) return;

    candidates.forEach((spot) => {
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

    const first = candidates[0];
    if (first) {
      setCenter(Number(first.latitude), Number(first.longitude), 13);
    }
  }

  function selectCandidate(candidate: DiscoveryCandidate) {
    selectedCandidate.value = candidate;
    setCenter(Number(candidate.latitude), Number(candidate.longitude), 15);
  }

  function clearSelectedCandidate() {
    selectedCandidate.value = null;
  }

  async function toggleNearbyPois(candidate: DiscoveryCandidate, businessType?: string) {
    if (activePoiCandidateRank.value === candidate.rank) {
      clearNearbyPois();
      return;
    }

    clearNearbyPois();
    activePoiCandidateRank.value = candidate.rank;
    nearbyPoiLoading.value = true;

    const targetType = businessType || candidate.businessType || activeRun.value?.businessType || 'coffee_shop';

    try {
      googleMapService.renderCatchmentCircle(
        { lat: Number(candidate.latitude), lng: Number(candidate.longitude) },
        2000,
        { fitBounds: true },
      );

      const response = await apiClient.post<{ pois: any[] }>('/discovery/nearby-pois', {
        lat: Number(candidate.latitude),
        lng: Number(candidate.longitude),
        businessType: targetType,
        radiusMeters: 2000,
      });

      nearbyPois.value = response.data.pois || [];

      googleMapService.renderNearbyPoiMarkers(nearbyPois.value);
    } catch (err: any) {
      console.warn('Failed to fetch nearby POIs:', err);
    } finally {
      nearbyPoiLoading.value = false;
    }
  }

  function clearNearbyPois() {
    activePoiCandidateRank.value = null;
    nearbyPois.value = [];
    googleMapService.removeCatchmentCircle();
    googleMapService.clearNearbyPoiMarkers();
  }

  function clearActiveRun() {
    activeRun.value = null;
    clearSelectedCandidate();
    clearNearbyPois();
    clearMarkers();
  }

  // Called on logout/login — clears this account's runs/history flag and its map pins/overlays.
  function resetStore() {
    clearActiveRun();
    runs.value = [];
    historyLoaded.value = false;
    error.value = null;
  }

  return {
    runs,
    activeRun,
    loading,
    historyLoaded,
    error,
    selectedCandidate,
    activePoiCandidateRank,
    nearbyPois,
    nearbyPoiLoading,
    fetchHistory,
    addRun,
    selectRun,
    renderCandidatePins,
    selectCandidate,
    clearSelectedCandidate,
    toggleNearbyPois,
    clearNearbyPois,
    clearActiveRun,
    resetStore,
  };
});
