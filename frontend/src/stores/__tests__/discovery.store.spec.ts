import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDiscoveryStore } from '../discovery.store';

const basePayload = {
  searchId: 'ds-1',
  businessType: 'coffee_shop',
  region: 'Kediri',
  candidates: [
    {
      rank: 1,
      name: 'Spot 1',
      latitude: -7.8167,
      longitude: 112.0117,
      demandScore: 80,
      competitionCount: 1,
      rationale: 'Real rationale.',
      businessType: 'coffee_shop',
    },
  ],
  summary: 'Found 1 candidate spot for coffee_shop in Kediri.',
  createdAt: '2026-08-11T00:00:00.000Z',
};

describe('discovery.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should add a live run to the front of the list and select it', () => {
    const store = useDiscoveryStore();

    store.addRun(basePayload);

    expect(store.runs.length).toBe(1);
    expect(store.activeRun?.id).toBe('ds-1');
    expect(store.activeRun?.candidates.length).toBe(1);
  });

  it('should clear selected candidate and nearby POIs when switching to a different run', () => {
    const store = useDiscoveryStore();
    store.addRun(basePayload);
    store.selectCandidate(basePayload.candidates[0]);

    expect(store.selectedCandidate).not.toBeNull();

    store.addRun({ ...basePayload, searchId: 'ds-2' });

    expect(store.selectedCandidate).toBeNull();
    expect(store.activeRun?.id).toBe('ds-2');
  });

  it('should clear the active run entirely', () => {
    const store = useDiscoveryStore();
    store.addRun(basePayload);

    store.clearActiveRun();

    expect(store.activeRun).toBeNull();
    expect(store.selectedCandidate).toBeNull();
  });
});
