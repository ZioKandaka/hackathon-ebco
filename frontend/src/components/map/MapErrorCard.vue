<template>
  <div class="map-error-card">
    <div class="error-icon">⚠️</div>
    <h3>Map Loading Failed</h3>
    <p class="error-message">{{ errorMessage }}</p>
    <button @click="$emit('retry')" class="btn-retry">Retry Loading Map</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  errorMessage: string;
}>();

defineEmits<{
  (e: 'retry'): void;
}>();
</script>

<style scoped>
.map-error-card {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 500;
  padding: 2rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
  text-align: center;
  max-width: 400px;
  font-family: system-ui, -apple-system, sans-serif;
}

.error-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

h3 {
  margin: 0 0 0.5rem 0;
  color: #2d3748;
  font-size: 1.25rem;
}

.error-message {
  margin: 0 0 1.5rem 0;
  color: #718096;
  font-size: 0.875rem;
  line-height: 1.5;
}

.btn-retry {
  padding: 0.625rem 1.25rem;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-retry:hover {
  background-color: #2b6cb0;
}
</style>
