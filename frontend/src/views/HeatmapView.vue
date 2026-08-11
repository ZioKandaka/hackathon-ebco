<template>
  <div class="view-container">
    <div class="feature-overlay">
      <h1>Density Heatmap</h1>
      <p class="subtitle">POI density visualization, history of past queries</p>

      <div v-if="heatmapStore.loading && !heatmapStore.historyLoaded" class="loading-state">
        Loading heatmap history...
      </div>

      <div v-else-if="heatmapStore.runs.length === 0" class="empty-state">
        <p>No heatmaps generated yet.</p>
        <small>Ask the AI Assistant, e.g. "Show a heatmap of schools near my Sudirman branch".</small>
      </div>

      <template v-else>
        <!-- History strip -->
        <div class="history-strip">
          <button
            v-for="run in heatmapStore.runs"
            :key="run.id"
            class="history-chip"
            :class="{ active: heatmapStore.activeRun?.id === run.id }"
            @click="heatmapStore.selectRun(run)"
          >
            <span class="chip-category">{{ run.category }}</span>
            <span class="chip-count">{{ run.pointCount }} pts</span>
          </button>
        </div>

        <div v-if="heatmapStore.activeRun" class="run-detail">
          <p class="run-location">{{ heatmapStore.activeRun.locationName }}</p>
          <p class="run-meta">
            {{ heatmapStore.activeRun.category }} &middot; {{ heatmapStore.activeRun.radiusKm }}km radius &middot;
            {{ heatmapStore.activeRun.pointCount }} POIs
          </p>
          <p class="run-summary">{{ heatmapStore.activeRun.summary }}</p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useHeatmapStore } from '../stores/heatmap.store';

const heatmapStore = useHeatmapStore();

onMounted(() => {
  heatmapStore.fetchHistory();
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
  width: 340px;
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
  max-width: 110px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chip-count {
  font-size: 0.75rem;
  font-weight: 700;
  color: #2b6cb0;
}

.run-detail {
  padding: 0.75rem 0.875rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
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

.run-summary {
  margin: 0.625rem 0 0 0;
  font-size: 0.8125rem;
  color: #4a5568;
  line-height: 1.4;
}
</style>
