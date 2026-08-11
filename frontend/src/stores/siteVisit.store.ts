import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiClient } from '../services/api.service';
import { googleMapService } from '../services/google-map.service';
import type { SiteVisitDataPayload, SiteVisitCriteria, SiteVisitImageType } from '../services/chat-sse.service';

export interface SiteVisitRun {
  id: string;
  locationName: string;
  hasStreetViewCoverage: boolean;
  overallVisualScore: number;
  criteria: SiteVisitCriteria;
  availableImageTypes: SiteVisitImageType[];
  center: { lat: number; lng: number };
  summary: string;
  createdAt: string;
}

// Raw shape returned by GET /site-visit/history (the Postgres entity), distinct from the live
// SSE SiteVisitDataPayload shape — both get normalized into SiteVisitRun below.
interface RawHistoryReport {
  id: string;
  locationName: string;
  latitude: string | number;
  longitude: string | number;
  hasStreetViewCoverage: boolean;
  overallVisualScore: number;
  criteria: SiteVisitCriteria;
  availableImageTypes: SiteVisitImageType[];
  summary: string;
  createdAt: string;
}

function normalizeHistoryReport(raw: RawHistoryReport): SiteVisitRun {
  return {
    id: raw.id,
    locationName: raw.locationName,
    hasStreetViewCoverage: raw.hasStreetViewCoverage,
    overallVisualScore: raw.overallVisualScore,
    criteria: raw.criteria,
    availableImageTypes: raw.availableImageTypes,
    center: { lat: Number(raw.latitude), lng: Number(raw.longitude) },
    summary: raw.summary,
    createdAt: raw.createdAt,
  };
}

const CENTER_MARKER_ID = 'site-visit-center';

function normalizeLiveRun(payload: SiteVisitDataPayload): SiteVisitRun {
  return {
    id: payload.reportId,
    locationName: payload.locationName,
    hasStreetViewCoverage: payload.hasStreetViewCoverage,
    overallVisualScore: payload.overallVisualScore,
    criteria: payload.criteria,
    availableImageTypes: payload.availableImageTypes,
    center: payload.center,
    summary: payload.summary,
    createdAt: payload.createdAt,
  };
}

export const useSiteVisitStore = defineStore('siteVisit', () => {
  const runs = ref<SiteVisitRun[]>([]);
  const activeRun = ref<SiteVisitRun | null>(null);
  const loading = ref(false);
  const historyLoaded = ref(false);

  async function fetchHistory() {
    loading.value = true;
    try {
      const response = await apiClient.get<{ reports: RawHistoryReport[] }>('/site-visit/history');
      runs.value = (response.data.reports || []).map(normalizeHistoryReport);
      historyLoaded.value = true;
    } catch (err) {
      runs.value = [];
    } finally {
      loading.value = false;
    }
  }

  function addRun(payload: SiteVisitDataPayload) {
    const run = normalizeLiveRun(payload);
    runs.value.unshift(run);
    selectRun(run);
  }

  function selectRun(run: SiteVisitRun) {
    activeRun.value = run;
    googleMapService.setCenterAndZoom(run.center, 17);
    googleMapService.addMarker(CENTER_MARKER_ID, {
      position: run.center,
      title: run.locationName,
    });
  }

  function clearActiveRun() {
    activeRun.value = null;
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
