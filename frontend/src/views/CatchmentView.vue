<template>
  <div class="view-container">
    <div class="feature-overlay">
      <h1>Catchment Score</h1>
      <p class="subtitle">AI-scored location performance, 6 dimensions, grounded in real nearby POIs</p>

      <div v-if="catchmentStore.loading && !catchmentStore.historyLoaded" class="loading-state">
        Loading catchment history...
      </div>

      <div v-else-if="catchmentStore.runs.length === 0" class="empty-state">
        <p>No catchment analysis yet.</p>
        <small>
          Ask the AI Assistant, e.g. "Analyze the catchment for my Sudirman branch" or
          "How good is catchment scoring at Jl. Braga No. 1, Bandung for a coffee shop?"
        </small>
      </div>

      <template v-else>
        <!-- History strip -->
        <div class="history-strip">
          <button
            v-for="run in catchmentStore.runs"
            :key="run.id"
            class="history-chip"
            :class="{ active: catchmentStore.activeRun?.id === run.id }"
            @click="catchmentStore.selectRun(run)"
          >
            <span class="chip-category">{{ run.category }}</span>
            <span class="chip-score">{{ run.compositeScore }}</span>
          </button>
        </div>

        <div v-if="catchmentStore.activeRun" class="run-detail">
          <div class="run-header">
            <p class="run-location">{{ catchmentStore.activeRun.locationName }}</p>
            <p class="run-meta">
              {{ catchmentStore.activeRun.category }} &middot; {{ catchmentStore.activeRun.radiusKm }}km radius &middot;
              {{ catchmentStore.activeRun.poiCount }} POIs found
            </p>
            <div v-if="catchmentStore.activeRun.poiCount < 10" class="low-data-warning">
              Low sample size ({{ catchmentStore.activeRun.poiCount }} POIs) — treat this score as low-confidence.
            </div>
          </div>

          <div class="composite-score">
            <span class="composite-number">{{ catchmentStore.activeRun.compositeScore }}</span>
            <span class="composite-max">/100</span>
          </div>

          <CatchmentRadarChart :sub-scores="catchmentStore.activeRun.subScores" />

          <ul class="subscore-list">
            <li
              v-for="item in subScoreItems"
              :key="item.key"
              class="subscore-row"
              :class="{ active: catchmentStore.selectedSubScore === item.key }"
              @click="catchmentStore.selectSubScore(item.key)"
            >
              <div class="subscore-top">
                <span class="subscore-label">{{ item.label }}</span>
                <span class="subscore-value">{{ item.value }}/100</span>
              </div>
              <div class="subscore-weight">Weight: {{ item.weightPct }}%</div>
              <p class="subscore-explanation">
                {{ item.explanation || 'Explanation unavailable.' }}
              </p>
              <div v-if="catchmentStore.selectedSubScore === item.key" class="subscore-hint">
                Showing contributing POIs on the map
              </div>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useCatchmentStore } from '../stores/catchment.store';
import CatchmentRadarChart from '../components/catchment/CatchmentRadarChart.vue';
import type { CatchmentSubScoreKey } from '../services/chat-sse.service';

const catchmentStore = useCatchmentStore();

const SUB_SCORE_LABELS: Record<CatchmentSubScoreKey, string> = {
  demandDensity: 'Demand Density',
  trafficProxy: 'Traffic Proxy',
  areaQuality: 'Area Quality',
  competitionPenalty: 'Competition Penalty',
  networkSaturation: 'Network Saturation',
  operationalVitality: 'Operational Vitality',
};

const subScoreItems = computed(() => {
  const run = catchmentStore.activeRun;
  if (!run) return [];
  return (Object.keys(SUB_SCORE_LABELS) as CatchmentSubScoreKey[]).map((key) => ({
    key,
    label: SUB_SCORE_LABELS[key],
    value: run.subScores[key],
    weightPct: Math.round(run.weights[key] * 100),
    explanation: run.explanations ? run.explanations[key] : undefined,
  }));
});

onMounted(() => {
  catchmentStore.fetchHistory();
});
</script>

<style scoped>
.view-container {
  position: relative;
  width: 100vw;
  height: calc(100vh - 60px);
  overflow: hidden;
  pointer-events: none;
}

.feature-overlay {
  position: absolute;
  top: 1.5rem;
  left: 2rem;
  z-index: 10;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  width: 380px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
}

h1 {
  flex-shrink: 0;
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: #1a202c;
  font-weight: 700;
}

.subtitle {
  flex-shrink: 0;
  margin: 0 0 1rem 0;
  font-size: 0.8125rem;
  color: #718096;
}

.loading-state,
.empty-state {
  padding: 1.5rem 0;
  text-align: center;
  color: #718096;
  font-size: 0.875rem;
}

.empty-state small {
  display: block;
  margin-top: 0.5rem;
  line-height: 1.5;
}

.history-strip {
  display: flex;
  flex-shrink: 0;
  gap: 0.5rem;
  overflow-x: auto;
  padding-top: 0.125rem;
  padding-bottom: 0.5rem;
  margin-bottom: 0.75rem;
}

.history-chip {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.125rem;
  padding: 0.375rem 0.75rem;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}

.history-chip.active {
  border-color: #3182ce;
  background: #ebf8ff;
}

.chip-category {
  font-size: 0.6875rem;
  color: #4a5568;
  white-space: nowrap;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-score {
  font-size: 0.875rem;
  font-weight: 700;
  color: #2b6cb0;
}

.run-header {
  margin-bottom: 0.75rem;
}

.run-location {
  margin: 0;
  font-weight: 700;
  font-size: 0.9375rem;
  color: #2d3748;
}

.run-meta {
  margin: 0.125rem 0 0 0;
  font-size: 0.75rem;
  color: #718096;
}

.low-data-warning {
  margin-top: 0.5rem;
  padding: 0.5rem 0.625rem;
  background: #fffaf0;
  border: 1px solid #fbd38d;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #9c4221;
}

.composite-score {
  text-align: center;
  margin: 0.5rem 0;
}

.composite-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #2b6cb0;
}

.composite-max {
  font-size: 1.125rem;
  color: #a0aec0;
}

.subscore-list {
  list-style: none;
  margin: 0.75rem 0 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subscore-row {
  padding: 0.625rem 0.75rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.subscore-row:hover,
.subscore-row.active {
  border-color: #3182ce;
  background: #ebf8ff;
}

.subscore-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.subscore-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #2d3748;
}

.subscore-value {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #2b6cb0;
}

.subscore-weight {
  font-size: 0.6875rem;
  color: #a0aec0;
  margin-top: 0.125rem;
}

.subscore-explanation {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #4a5568;
  line-height: 1.4;
}

.subscore-hint {
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #3182ce;
}
</style>
