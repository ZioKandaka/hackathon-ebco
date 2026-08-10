<template>
  <div class="view-container">
    <!-- Discover Control Overlay -->
    <div class="feature-overlay">
      <h1>Discover Candidates</h1>
      <p class="subtitle">AI-assisted site selection & POI density analysis</p>

      <div v-if="discoveryStore.loading" class="loading-state">
        Analyzing BigQuery POI datasets...
      </div>

      <div v-else-if="discoveryStore.candidates.length === 0" class="empty-state">
        <p>No active search results.</p>
        <small>Use the AI Chat Assistant to "Find top 5 spots for a coffee shop in Kediri"!</small>
      </div>

      <ul v-else class="candidate-list">
        <li
          v-for="spot in discoveryStore.candidates"
          :key="spot.rank"
          @click="discoveryStore.selectCandidate(spot)"
          class="candidate-card"
          :class="{ active: discoveryStore.selectedCandidate?.rank === spot.rank }"
        >
          <div class="card-header">
            <span class="spot-rank">Spot #{{ spot.rank }}</span>
            <span class="score-badge">Score: {{ spot.demandScore }}</span>
          </div>
          <p class="spot-name">{{ spot.name }}</p>
          <p class="rationale-text">{{ spot.rationale }}</p>

          <!-- Show Nearby POI Toggle Button (US1) -->
          <div class="card-actions">
            <button
              class="btn-nearby-poi"
              :class="{ active: discoveryStore.activePoiCandidateRank === spot.rank }"
              @click.stop="discoveryStore.toggleNearbyPois(spot)"
            >
              <span v-if="discoveryStore.nearbyPoiLoading && discoveryStore.activePoiCandidateRank === spot.rank">
                Loading POIs...
              </span>
              <span v-else-if="discoveryStore.activePoiCandidateRank === spot.rank">
                Hide Nearby POI
              </span>
              <span v-else>
                Show Nearby POI
              </span>
            </button>
          </div>

          <!-- Zero POI Notice (T014) -->
          <div
            v-if="discoveryStore.activePoiCandidateRank === spot.rank && !discoveryStore.nearbyPoiLoading && discoveryStore.nearbyPois.length === 0"
            class="zero-poi-notice"
          >
            No relevant nearby POIs found within 2km.
          </div>

          <!-- Nearby POIs List with Names & Metrics -->
          <div
            v-if="discoveryStore.activePoiCandidateRank === spot.rank && discoveryStore.nearbyPois.length > 0"
            class="nearby-poi-box"
          >
            <div class="nearby-box-title">
              Nearby POIs ({{ discoveryStore.nearbyPois.length }} within 2km):
            </div>
            <ul class="nearby-poi-list">
              <li
                v-for="poi in discoveryStore.nearbyPois.slice(0, 6)"
                :key="poi.id"
                class="nearby-poi-row"
              >
                <span class="poi-name">{{ poi.name }}</span>
                <span class="poi-meta">
                  ★ {{ poi.rating || '4.0' }} • {{ poi.distanceMeters }}m
                </span>
              </li>
            </ul>
            <div v-if="discoveryStore.nearbyPois.length > 6" class="nearby-more-text">
              + {{ discoveryStore.nearbyPois.length - 6 }} more pins on map
            </div>
          </div>
        </li>
      </ul>
    </div>

    <!-- Candidate Detail Modal on Pin Click (US2) -->
    <div v-if="discoveryStore.selectedCandidate" class="detail-modal">
      <header class="modal-header">
        <h3>Spot #{{ discoveryStore.selectedCandidate.rank }} Details</h3>
        <button @click="discoveryStore.clearSelectedCandidate" class="btn-close">×</button>
      </header>
      <div class="modal-body">
        <p class="spot-title">{{ discoveryStore.selectedCandidate.name }}</p>
        <div class="metric-row">
          <span>Demand Score:</span>
          <strong>{{ discoveryStore.selectedCandidate.demandScore }} / 100</strong>
        </div>
        <div class="metric-row">
          <span>Competitors (1km):</span>
          <strong>{{ discoveryStore.selectedCandidate.competitionCount }} nearby</strong>
        </div>
        <div class="rationale-box">
          <p>{{ discoveryStore.selectedCandidate.rationale }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDiscoveryStore } from '../stores/discovery.store';

const discoveryStore = useDiscoveryStore();
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
  width: 360px;
  max-height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
}

h1 {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: #1a202c;
  font-weight: 700;
}

.subtitle {
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

.candidate-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.candidate-card {
  padding: 0.875rem 1rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.candidate-card:hover,
.candidate-card.active {
  border-color: #3182ce;
  background-color: #ebf8ff;
  box-shadow: 0 2px 8px rgba(49, 130, 206, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.spot-rank {
  font-size: 0.75rem;
  font-weight: 700;
  color: #3182ce;
  background: #ebf8ff;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.score-badge {
  font-size: 0.75rem;
  font-weight: 600;
  color: #2b6cb0;
}

.spot-name {
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  font-size: 0.9375rem;
  color: #2d3748;
}

.rationale-text {
  margin: 0;
  font-size: 0.8125rem;
  color: #4a5568;
  line-height: 1.4;
}

.card-actions {
  margin-top: 0.625rem;
  display: flex;
  justify-content: flex-end;
}

.btn-nearby-poi {
  background-color: #e6fffa;
  color: #2c7a7b;
  border: 1px solid #319795;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-nearby-poi:hover,
.btn-nearby-poi.active {
  background-color: #319795;
  color: #ffffff;
}

.zero-poi-notice {
  margin-top: 0.5rem;
  padding: 0.375rem 0.5rem;
  background-color: #fffaf0;
  border: 1px solid #feebc8;
  border-radius: 4px;
  color: #dd6b20;
  font-size: 0.75rem;
  font-weight: 500;
}

.nearby-poi-box {
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  background-color: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.nearby-box-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #2c7a7b;
  margin-bottom: 0.375rem;
}

.nearby-poi-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nearby-poi-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
}

.poi-name {
  font-weight: 600;
  color: #2d3748;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.poi-meta {
  color: #718096;
  font-size: 0.6875rem;
  white-space: nowrap;
}

.nearby-more-text {
  margin-top: 0.375rem;
  font-size: 0.6875rem;
  color: #319795;
  font-weight: 600;
  text-align: right;
}

/* Detail Modal */
.detail-modal {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  z-index: 20;
  background: white;
  padding: 1.25rem 1.5rem;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  width: 320px;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1rem;
  color: #1a202c;
}

.btn-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #a0aec0;
}

.spot-title {
  margin: 0 0 0.75rem 0;
  font-weight: 600;
  color: #2b6cb0;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #4a5568;
}

.rationale-box {
  margin-top: 0.75rem;
  padding: 0.625rem 0.875rem;
  background-color: #f7fafc;
  border-radius: 6px;
  font-size: 0.8125rem;
  color: #2d3748;
}
</style>
