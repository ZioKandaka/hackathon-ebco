<template>
  <div class="view-container">
    <div class="feature-overlay">
      <h1>AI Site Visit</h1>
      <p class="subtitle">AI-scored visual inspection from real Street View and satellite imagery</p>

      <div v-if="siteVisitStore.loading && !siteVisitStore.historyLoaded" class="loading-state">
        Loading site visit history...
      </div>

      <div v-else-if="siteVisitStore.runs.length === 0" class="empty-state">
        <p>No site visits yet.</p>
        <small>
          Ask the AI Assistant, e.g. "Do an AI site visit on my Sudirman branch" or "What does spot 2 look like?"
        </small>
      </div>

      <template v-else>
        <!-- History strip -->
        <div class="history-strip">
          <button
            v-for="run in siteVisitStore.runs"
            :key="run.id"
            class="history-chip"
            :class="{ active: siteVisitStore.activeRun?.id === run.id }"
            @click="siteVisitStore.selectRun(run)"
          >
            <span class="chip-location">{{ run.locationName }}</span>
            <span class="chip-score">{{ run.overallVisualScore }}</span>
          </button>
        </div>

        <div v-if="siteVisitStore.activeRun" class="run-detail">
          <div class="run-header">
            <p class="run-location">{{ siteVisitStore.activeRun.locationName }}</p>
            <p class="run-meta">
              {{ siteVisitStore.activeRun.hasStreetViewCoverage ? 'Street View + satellite imagery' : 'Satellite imagery only (no Street View coverage)' }}
            </p>
          </div>

          <div class="composite-score">
            <span class="composite-number">{{ siteVisitStore.activeRun.overallVisualScore }}</span>
            <span class="composite-max">/100</span>
          </div>

          <SiteVisitGallery
            :report-id="siteVisitStore.activeRun.id"
            :available-image-types="siteVisitStore.activeRun.availableImageTypes"
          />

          <ul class="criteria-list">
            <li v-for="item in criteriaItems" :key="item.key" class="criteria-row">
              <div class="criteria-top">
                <span class="criteria-label">{{ item.label }}</span>
                <span class="criteria-value">{{ item.score }}/100</span>
              </div>
              <p class="criteria-justification">{{ item.justification }}</p>
            </li>
          </ul>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useSiteVisitStore } from '../stores/siteVisit.store';
import SiteVisitGallery from '../components/site-visit/SiteVisitGallery.vue';
import type { SiteVisitCriteria } from '../services/chat-sse.service';

const siteVisitStore = useSiteVisitStore();

const CRITERIA_LABELS: Record<keyof SiteVisitCriteria, string> = {
  storefrontVisibility: 'Storefront Visibility',
  roadWidthAccess: 'Road Width & Access',
  trafficVisibility: 'Foot / Vehicle Traffic',
  buildingTypes: 'Surrounding Building Types',
  areaCondition: 'General Area Condition',
};

const criteriaItems = computed(() => {
  const run = siteVisitStore.activeRun;
  if (!run) return [];
  return (Object.keys(CRITERIA_LABELS) as (keyof SiteVisitCriteria)[]).map((key) => ({
    key,
    label: CRITERIA_LABELS[key],
    score: run.criteria[key].score,
    justification: run.criteria[key].justification,
  }));
});

onMounted(() => {
  siteVisitStore.fetchHistory();
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

.chip-location {
  font-size: 0.6875rem;
  color: #4a5568;
  white-space: nowrap;
  max-width: 110px;
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

.criteria-list {
  list-style: none;
  margin: 0.75rem 0 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.criteria-row {
  padding: 0.625rem 0.75rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.criteria-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.criteria-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #2d3748;
}

.criteria-value {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #2b6cb0;
}

.criteria-justification {
  margin: 0.375rem 0 0 0;
  font-size: 0.75rem;
  color: #4a5568;
  line-height: 1.4;
}
</style>
