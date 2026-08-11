import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { googleMapService } from '../services/google-map.service';
import type { CatchmentDataPayload, CatchmentSubScores, CatchmentSubScoreKey, ContributingPoi } from '../services/chat-sse.service';

const CENTER_MARKER_ID = 'catchment-center';

export interface CatchmentRun {
  id: string;
  locationId?: string;
  locationName: string;
  category: string;
  boundaryType: 'radius' | 'time';
  radiusKm?: number;
  travelMode?: 'drive' | 'walk' | 'transit';
  timeMinutes?: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
  compositeScore: number;
  subScores: CatchmentSubScores;
  weights: CatchmentSubScores;
  poiCount: number;
  contributingPois: Record<CatchmentSubScoreKey, ContributingPoi[]>;
  explanations: Record<CatchmentSubScoreKey, string> | null;
  center: { lat: number; lng: number };
  summary: string;
  createdAt: string;
}

// Raw shape returned by GET /catchment/history (the Postgres entity), distinct from the live
// SSE CatchmentDataPayload shape — both get normalized into CatchmentRun below.
interface RawHistoryRun {
  id: string;
  locationId?: string;
  locationName: string;
  category: string;
  latitude: string | number;
  longitude: string | number;
  boundaryType: 'radius' | 'time';
  radiusKm?: number;
  travelMode?: 'drive' | 'walk' | 'transit';
  timeMinutes?: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
  compositeScore: number;
  subScores: CatchmentSubScores;
  weights: CatchmentSubScores;
  poiCount: number;
  contributingPois: Record<CatchmentSubScoreKey, ContributingPoi[]>;
  explanations: Record<CatchmentSubScoreKey, string> | null;
  summary: string;
  createdAt: string;
}

function normalizeHistoryRun(raw: RawHistoryRun): CatchmentRun {
  return {
    id: raw.id,
    locationId: raw.locationId,
    locationName: raw.locationName,
    category: raw.category,
    boundaryType: raw.boundaryType,
    radiusKm: raw.radiusKm,
    travelMode: raw.travelMode,
    timeMinutes: raw.timeMinutes,
    polygonCoordinates: raw.polygonCoordinates,
    compositeScore: raw.compositeScore,
    subScores: raw.subScores,
    weights: raw.weights,
    poiCount: raw.poiCount,
    contributingPois: raw.contributingPois,
    explanations: raw.explanations,
    center: { lat: Number(raw.latitude), lng: Number(raw.longitude) },
    summary: raw.summary,
    createdAt: raw.createdAt,
  };
}

function normalizeLiveRun(payload: CatchmentDataPayload): CatchmentRun {
  return {
    id: payload.analysisId,
    locationId: payload.locationId,
    locationName: payload.locationName,
    category: payload.category,
    boundaryType: payload.boundaryType,
    radiusKm: payload.radiusKm,
    travelMode: payload.travelMode,
    timeMinutes: payload.timeMinutes,
    polygonCoordinates: payload.polygonCoordinates,
    compositeScore: payload.compositeScore,
    subScores: payload.subScores,
    weights: payload.weights,
    poiCount: payload.poiCount,
    contributingPois: payload.contributingPois,
    explanations: payload.explanations,
    center: payload.center,
    summary: payload.summary,
    createdAt: payload.createdAt,
  };
}

export const useCatchmentStore = defineStore('catchment', () => {
  const runs = ref<CatchmentRun[]>([]);
  const activeRun = ref<CatchmentRun | null>(null);
  const selectedSubScore = ref<CatchmentSubScoreKey | null>(null);
  const loading = ref(false);
  const historyLoaded = ref(false);

  async function fetchHistory() {
    loading.value = true;
    try {
      const response = await apiClient.get<{ runs: RawHistoryRun[] }>('/catchment/history');
      runs.value = (response.data.runs || []).map(normalizeHistoryRun);
      historyLoaded.value = true;
    } catch (err) {
      runs.value = [];
    } finally {
      loading.value = false;
    }
  }

  function addRun(payload: CatchmentDataPayload) {
    const run = normalizeLiveRun(payload);
    runs.value.unshift(run);
    selectRun(run);
  }

  function selectRun(run: CatchmentRun) {
    activeRun.value = run;
    selectedSubScore.value = null;
    googleMapService.clearNearbyPoiMarkers();

    // Only one boundary shape at a time — a circle for a distance-radius run, the real
    // road-network isochrone polygon for a time-boundary run. Each renderer already clears the
    // other type internally, so switching between run types on the map is always clean.
    if (run.boundaryType === 'time' && run.polygonCoordinates && run.polygonCoordinates.length > 0) {
      googleMapService.renderIsochronePolygon(run.polygonCoordinates, { fitBounds: true });
    } else if (run.radiusKm) {
      googleMapService.renderCatchmentCircle(run.center, run.radiusKm * 1000, { fitBounds: true });
    }

    googleMapService.addMarker(CENTER_MARKER_ID, {
      position: run.center,
      title: `${run.category} — ${run.locationName}`,
    });
  }

  function selectSubScore(key: CatchmentSubScoreKey) {
    if (!activeRun.value) return;

    if (selectedSubScore.value === key) {
      selectedSubScore.value = null;
      googleMapService.clearNearbyPoiMarkers();
      return;
    }

    selectedSubScore.value = key;
    const pois = activeRun.value.contributingPois[key] || [];
    googleMapService.renderNearbyPoiMarkers(pois);
  }

  function clearActiveRun() {
    activeRun.value = null;
    selectedSubScore.value = null;
    googleMapService.clearNearbyPoiMarkers();
    googleMapService.removeCatchmentCircle();
    googleMapService.removeIsochronePolygon();
    googleMapService.removeMarker(CENTER_MARKER_ID);
  }

  return {
    runs,
    activeRun,
    selectedSubScore,
    loading,
    historyLoaded,
    fetchHistory,
    addRun,
    selectRun,
    selectSubScore,
    clearActiveRun,
  };
});
