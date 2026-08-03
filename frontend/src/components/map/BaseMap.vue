<template>
  <div class="map-viewport-wrapper">
    <div ref="mapContainer" class="map-container"></div>

    <MapErrorCard
      v-if="mapError"
      :error-message="mapError"
      @retry="handleRetry"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGoogleMap } from '../../composables/useGoogleMap';
import MapErrorCard from './MapErrorCard.vue';

const mapContainer = ref<HTMLElement | null>(null);
const { mapError, initMap, triggerResize } = useGoogleMap();

let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

function onWindowResize() {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    triggerResize();
  }, 200);
}

async function handleRetry() {
  if (mapContainer.value) {
    await initMap(mapContainer.value);
  }
}

onMounted(async () => {
  if (mapContainer.value) {
    await initMap(mapContainer.value);
  }
  window.addEventListener('resize', onWindowResize);
});

onUnmounted(() => {
  window.removeEventListener('resize', onWindowResize);
  if (resizeTimeout) clearTimeout(resizeTimeout);
});
</script>

<style scoped>
.map-viewport-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 0;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
  background-color: #e2e8f0;
}
</style>
