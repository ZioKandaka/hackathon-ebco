import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { googleMapService } from '../services/google-map.service';
import type { HeatmapDataPayload, HeatmapPoint } from '../services/chat-sse.service';

const CENTER_MARKER_ID = 'heatmap-center';

export interface HeatmapRun {
  id: string;
  locationId?: string;
  category: string;
  locationName: string;
  radiusKm: number;
  center: { lat: number; lng: number };
  pointCount: number;
  points: HeatmapPoint[];
  summary: string;
  createdAt: string;
}

// Raw shape returned by GET /heatmap/history (the Postgres entity), distinct from the live SSE
// HeatmapDataPayload shape — both get normalized into HeatmapRun below.
interface RawHistoryRun {
  id: string;
  locationId?: string;
  locationName: string;
  category: string;
  latitude: string | number;
  longitude: string | number;
  radiusKm: number;
  pointCount: number;
  points: HeatmapPoint[];
  summary: string;
  createdAt: string;
}

function normalizeHistoryRun(raw: RawHistoryRun): HeatmapRun {
  return {
    id: raw.id,
    locationId: raw.locationId,
    category: raw.category,
    locationName: raw.locationName,
    radiusKm: raw.radiusKm,
    center: { lat: Number(raw.latitude), lng: Number(raw.longitude) },
    pointCount: raw.pointCount,
    points: raw.points,
    summary: raw.summary,
    createdAt: raw.createdAt,
  };
}

function normalizeLiveRun(payload: HeatmapDataPayload): HeatmapRun {
  return {
    id: payload.queryId,
    locationId: payload.locationId,
    category: payload.category,
    locationName: payload.locationName,
    radiusKm: payload.radiusKm,
    center: payload.center,
    pointCount: payload.pointCount,
    points: payload.points,
    summary: payload.summary,
    createdAt: payload.createdAt,
  };
}

export const useHeatmapStore = defineStore('heatmap', () => {
  const runs = ref<HeatmapRun[]>([]);
  const activeRun = ref<HeatmapRun | null>(null);
  const loading = ref(false);
  const historyLoaded = ref(false);

  async function fetchHistory() {
    loading.value = true;
    try {
      const response = await apiClient.get<{ runs: RawHistoryRun[] }>('/heatmap/history');
      runs.value = (response.data.runs || []).map(normalizeHistoryRun);
      historyLoaded.value = true;
    } catch (err) {
      runs.value = [];
    } finally {
      loading.value = false;
    }
  }

  function addRun(payload: HeatmapDataPayload) {
    const run = normalizeLiveRun(payload);
    runs.value.unshift(run);
    selectRun(run);
  }

  function selectRun(run: HeatmapRun) {
    activeRun.value = run;
    googleMapService.renderHeatmap(run.points, { fitBounds: true });
    googleMapService.addMarker(CENTER_MARKER_ID, {
      position: run.center,
      title: `${run.category} — ${run.locationName}`,
    });
  }

  function clearActiveRun() {
    activeRun.value = null;
    googleMapService.removeHeatmap();
    googleMapService.removeMarker(CENTER_MARKER_ID);
  }

  return {
    runs,
    activeRun,
    loading,
    historyLoaded,
    fetchHistory,
    addRun,
    selectRun,
    clearActiveRun,
  };
});
