<template>
  <div v-if="availableImageTypes.length > 0" class="site-visit-gallery">
    <div class="thumbnail-grid">
      <div
        v-for="type in availableImageTypes"
        :key="type"
        class="thumb-tile"
        :class="{ satellite: type === 'satellite' }"
        @click="openLightbox(type)"
      >
        <img :src="imageUrl(type)" :alt="tileLabel(type)" />
        <span class="tile-badge" :class="{ 'sat-badge': type === 'satellite' }">{{ tileLabel(type) }}</span>
      </div>
    </div>

    <!-- Teleported to <body>: .feature-overlay has backdrop-filter, which makes it the
         containing block for any position:fixed descendant — without escaping the DOM subtree,
         this modal renders clipped inside the small 380px panel instead of over the full page. -->
    <Teleport to="body">
      <div v-if="activeLightboxType" class="lightbox-modal" @click="closeLightbox">
        <div class="lightbox-content" @click.stop>
          <header class="lightbox-header">
            <span>{{ tileLabel(activeLightboxType) }}</span>
            <button class="btn-close" @click="closeLightbox">✕</button>
          </header>
          <img :src="imageUrl(activeLightboxType)" :alt="tileLabel(activeLightboxType)" class="lightbox-img" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { apiClient } from '../../services/api.service';
import type { SiteVisitImageType } from '../../services/chat-sse.service';

const props = defineProps<{
  reportId: string;
  availableImageTypes: SiteVisitImageType[];
}>();

const activeLightboxType = ref<SiteVisitImageType | null>(null);

const LABELS: Record<SiteVisitImageType, string> = {
  north: 'North (0°)',
  east: 'East (90°)',
  south: 'South (180°)',
  west: 'West (270°)',
  satellite: 'Satellite',
};

function tileLabel(type: SiteVisitImageType): string {
  return LABELS[type];
}

// Images are proxied through the backend (never a raw Google URL with the API key) — the
// browser authenticates the request with the same httpOnly access_token cookie used for login.
function imageUrl(type: SiteVisitImageType): string {
  return `${apiClient.defaults.baseURL}/site-visit/reports/${props.reportId}/image/${type}`;
}

function openLightbox(type: SiteVisitImageType) {
  activeLightboxType.value = type;
}

function closeLightbox() {
  activeLightboxType.value = null;
}
</script>

<style scoped>
.site-visit-gallery {
  margin-top: 0.75rem;
}

.thumbnail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.375rem;
}

.thumb-tile {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #cbd5e0;
  background-color: #edf2f7;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.thumb-tile:hover {
  transform: scale(1.03);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.thumb-tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tile-badge {
  position: absolute;
  bottom: 2px;
  left: 2px;
  background-color: rgba(26, 32, 44, 0.85);
  color: white;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 600;
}

.sat-badge {
  background-color: rgba(128, 90, 213, 0.9);
}

.lightbox-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.75);
  z-index: 2000;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.lightbox-content {
  background-color: #1a202c;
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.lightbox-header {
  padding: 0.5rem 1rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #2d3748;
}

.btn-close {
  background: transparent;
  border: none;
  color: #a0aec0;
  font-size: 1rem;
  cursor: pointer;
}

.btn-close:hover {
  color: white;
}

.lightbox-img {
  max-width: 100%;
  max-height: 80vh;
  object-fit: contain;
}
</style>
