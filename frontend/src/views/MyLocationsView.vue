<template>
  <div class="view-container">
    <BaseMap />
    <div class="feature-overlay">
      <h1>My Saved Locations</h1>
      <p class="subtitle">Your registered business branches and locations</p>

      <div v-if="locationsStore.loading" class="loading-state">
        Loading saved locations...
      </div>

      <div v-else-if="locationsStore.locations.length === 0" class="empty-state">
        <p>No locations registered yet.</p>
        <small>Use the AI Chat Assistant to "Add a new branch"!</small>
      </div>

      <ul v-else class="locations-list">
        <li
          v-for="loc in locationsStore.locations"
          :key="loc.id"
          @click="selectLocation(loc)"
          class="location-card"
        >
          <div class="card-header">
            <span class="location-name">{{ loc.name }}</span>
            <span class="type-tag">{{ loc.businessType }}</span>
          </div>
          <p class="address-text">{{ loc.fullAddress }}</p>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import BaseMap from '../components/map/BaseMap.vue';
import { useLocationsStore, UserLocationItem } from '../stores/locations.store';
import { useGoogleMap } from '../composables/useGoogleMap';

const locationsStore = useLocationsStore();
const { setCenter } = useGoogleMap();

function selectLocation(loc: UserLocationItem) {
  setCenter(Number(loc.latitude), Number(loc.longitude), 15);
}

onMounted(async () => {
  await locationsStore.fetchLocations();
});
</script>

<style scoped>
.view-container {
  position: relative;
  width: 100vw;
  height: calc(100vh - 60px);
  overflow: hidden;
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

.locations-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.location-card {
  padding: 0.875rem 1rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.location-card:hover {
  border-color: #3182ce;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(49, 130, 206, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
}

.location-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: #2d3748;
}

.type-tag {
  background-color: #ebf8ff;
  color: #2b6cb0;
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
}

.address-text {
  margin: 0;
  font-size: 0.8125rem;
  color: #4a5568;
  line-height: 1.4;
}
</style>
