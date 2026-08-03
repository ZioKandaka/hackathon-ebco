<template>
  <div class="status-card">
    <span class="status-spinner"></span>
    <span class="status-text">{{ stepText }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  stepText: string;
}>();
</script>

<style scoped>
.status-card {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.875rem;
  margin: 0.5rem 0;
  background-color: #ebf8ff;
  border: 1px solid #bee3f8;
  border-radius: 6px;
  color: #2b6cb0;
  font-size: 0.8125rem;
  font-weight: 500;
}

.status-spinner {
  width: 0.875rem;
  height: 0.875rem;
  border: 2px solid #90cdf4;
  border-top-color: #2b6cb0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
