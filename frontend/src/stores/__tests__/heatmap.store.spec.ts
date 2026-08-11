import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useHeatmapStore } from '../heatmap.store';

const basePayload = {
  queryId: 'hm-1',
  locationId: 'loc-1',
  category: 'school',
  locationName: 'Sudirman Branch',
  radiusKm: 5,
  center: { lat: -6.2088, lng: 106.8456 },
  pointCount: 2,
  points: [
    { lat: -6.2088, lng: 106.8456, weight: 1 },
    { lat: -6.2090, lng: 106.8460, weight: 1 },
  ],
  summary: 'Showing 2 school-related POI within 5km.',
  createdAt: '2026-08-11T00:00:00.000Z',
};

describe('heatmap.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should add a live run to the front of the list and select it', () => {
    const store = useHeatmapStore();

    store.addRun(basePayload);

    expect(store.runs.length).toBe(1);
    expect(store.activeRun?.id).toBe('hm-1');
    expect(store.activeRun?.locationId).toBe('loc-1');
  });

  it('should not throw when selecting a run without a live map instance', () => {
    const store = useHeatmapStore();
    const run = { ...basePayload, id: basePayload.queryId };

    expect(() => store.selectRun(run as any)).not.toThrow();
    expect(store.activeRun?.id).toBe('hm-1');
  });

  it('should clear the active run entirely', () => {
    const store = useHeatmapStore();
    store.addRun(basePayload);

    store.clearActiveRun();

    expect(store.activeRun).toBeNull();
  });
});
