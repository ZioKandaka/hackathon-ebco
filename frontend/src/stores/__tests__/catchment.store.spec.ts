import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCatchmentStore, type CatchmentRun } from '../catchment.store';

const baseRun: CatchmentRun = {
  id: 'run-1',
  locationName: 'Sudirman Branch',
  category: 'coffee_shop',
  radiusKm: 2,
  compositeScore: 82,
  subScores: {
    demandDensity: 80,
    trafficProxy: 70,
    areaQuality: 85,
    competitionPenalty: 24,
    networkSaturation: 0,
    operationalVitality: 95,
  },
  weights: {
    demandDensity: 0.3,
    trafficProxy: 0.2,
    areaQuality: 0.2,
    competitionPenalty: 0.15,
    networkSaturation: 0.1,
    operationalVitality: 0.05,
  },
  poiCount: 42,
  contributingPois: {
    demandDensity: [{ id: 'p1', name: 'SDN 1', category: 'school', latitude: -6.2088, longitude: 106.8456, distanceMeters: 300 }],
    trafficProxy: [],
    areaQuality: [],
    competitionPenalty: [],
    networkSaturation: [],
    operationalVitality: [],
  },
  explanations: null,
  center: { lat: -6.2088, lng: 106.8456 },
  summary: 'Catchment analysis for coffee_shop at Sudirman Branch is ready.',
  createdAt: '2026-08-11T00:00:00.000Z',
};

describe('catchment.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should add a live run to the front of the list and select it', () => {
    const store = useCatchmentStore();

    store.addRun({
      analysisId: baseRun.id,
      locationId: 'loc-1',
      locationName: baseRun.locationName,
      category: baseRun.category,
      radiusKm: baseRun.radiusKm,
      compositeScore: baseRun.compositeScore,
      subScores: baseRun.subScores,
      weights: baseRun.weights,
      poiCount: baseRun.poiCount,
      contributingPois: baseRun.contributingPois,
      explanations: baseRun.explanations,
      center: baseRun.center,
      summary: baseRun.summary,
      createdAt: baseRun.createdAt,
    });

    expect(store.runs.length).toBe(1);
    expect(store.activeRun?.id).toBe('run-1');
    expect(store.selectedSubScore).toBeNull();
  });

  it('should toggle a sub-score selection off when clicked twice', () => {
    const store = useCatchmentStore();
    store.runs.push(baseRun);
    store.selectRun(baseRun);

    store.selectSubScore('demandDensity');
    expect(store.selectedSubScore).toBe('demandDensity');

    store.selectSubScore('demandDensity');
    expect(store.selectedSubScore).toBeNull();
  });

  it('should switch selection when a different sub-score is clicked', () => {
    const store = useCatchmentStore();
    store.runs.push(baseRun);
    store.selectRun(baseRun);

    store.selectSubScore('demandDensity');
    store.selectSubScore('competitionPenalty');

    expect(store.selectedSubScore).toBe('competitionPenalty');
  });

  it('should clear the selected sub-score when switching to a different run', () => {
    const store = useCatchmentStore();
    const secondRun: CatchmentRun = { ...baseRun, id: 'run-2', category: 'book_store' };
    store.runs.push(baseRun, secondRun);

    store.selectRun(baseRun);
    store.selectSubScore('demandDensity');
    store.selectRun(secondRun);

    expect(store.activeRun?.id).toBe('run-2');
    expect(store.selectedSubScore).toBeNull();
  });

  it('should clear the active run entirely', () => {
    const store = useCatchmentStore();
    store.runs.push(baseRun);
    store.selectRun(baseRun);

    store.clearActiveRun();

    expect(store.activeRun).toBeNull();
    expect(store.selectedSubScore).toBeNull();
  });
});
