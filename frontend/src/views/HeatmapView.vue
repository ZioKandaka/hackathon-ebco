<template>
  <div class="view-container">
    <BaseMap />
    <div class="feature-overlay">
      <h1>Density Heatmap</h1>
      <p>Visualize POI density and traffic distribution layers on the map.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import BaseMap from '../components/map/BaseMap.vue';
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
  padding: 1.25rem 1.75rem;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  max-width: 360px;
  font-family: system-ui, -apple-system, sans-serif;
  pointer-events: auto;
}

h1 {
  margin: 0 0 0.375rem 0;
  font-size: 1.25rem;
  color: #1a202c;
}

p {
  margin: 0;
  font-size: 0.875rem;
  color: #4a5568;
}
</style>
