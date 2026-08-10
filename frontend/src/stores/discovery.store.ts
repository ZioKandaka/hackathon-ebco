import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { useGoogleMap } from '../composables/useGoogleMap';
import { googleMapService } from '../services/google-map.service';

export interface DiscoveryCandidateItem {
  rank: number;
  name: string;
  latitude: number;
  longitude: number;
  demandScore: number;
  competitionCount: number;
  rationale: string;
  regencyCode?: string;
  businessType: string;
}

export const useDiscoveryStore = defineStore('discovery', () => {
  const candidates = ref<DiscoveryCandidateItem[]>([]);
  const selectedCandidate = ref<DiscoveryCandidateItem | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeBusinessType = ref<string>('coffee_shop');
  const activePoiCandidateRank = ref<number | null>(null);
  const nearbyPois = ref<any[]>([]);
  const nearbyPoiLoading = ref(false);

  const { addMarker, clearMarkers, setCenter } = useGoogleMap();

  async function searchCandidates(businessType: string, region: string) {
    activeBusinessType.value = businessType;
    loading.value = true;
    error.value = null;
    clearNearbyPois();
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
    clearNearbyPois();
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

  async function toggleNearbyPois(candidate: DiscoveryCandidateItem, businessType?: string) {
    if (activePoiCandidateRank.value === candidate.rank) {
      clearNearbyPois();
      return;
    }

    clearNearbyPois();
    activePoiCandidateRank.value = candidate.rank;
    nearbyPoiLoading.value = true;

    const targetType = businessType || candidate.businessType || activeBusinessType.value || 'coffee_shop';

    try {
      // 1. Draw 2km catchment circle (Feature 007 reuse)
      googleMapService.renderCatchmentCircle(
        { lat: Number(candidate.latitude), lng: Number(candidate.longitude) },
        2000,
        { fitBounds: true },
      );

      // 2. Query nearby relevant POIs
      const response = await apiClient.post<{ pois: any[] }>('/discovery/nearby-pois', {
        lat: Number(candidate.latitude),
        lng: Number(candidate.longitude),
        businessType: targetType,
        radiusMeters: 2000,
      });

      nearbyPois.value = response.data.pois || [];

      // 3. Render cyan POI markers with InfoWindow hover tooltips
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

  return {
    candidates,
    selectedCandidate,
    loading,
    error,
    activePoiCandidateRank,
    nearbyPois,
    nearbyPoiLoading,
    setCandidates,
    searchCandidates,
    renderCandidatePins,
    selectCandidate,
    clearSelectedCandidate,
    toggleNearbyPois,
    clearNearbyPois,
  };
});
