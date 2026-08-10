<template>
  <div v-if="siteVisitData && siteVisitData.images" class="site-visit-gallery">
    <div class="gallery-title">Site Imagery Gallery:</div>
    <div class="thumbnail-grid">
      <div
        v-if="siteVisitData.images.hasStreetViewCoverage && siteVisitData.images.streetViewNorthUrl"
        class="thumb-tile"
        @click="openLightbox(siteVisitData.images.streetViewNorthUrl, 'Street View - 0° North')"
      >
        <img :src="siteVisitData.images.streetViewNorthUrl" alt="North Heading" />
        <span class="tile-badge">North (0°)</span>
      </div>

      <div
        v-if="siteVisitData.images.hasStreetViewCoverage && siteVisitData.images.streetViewEastUrl"
        class="thumb-tile"
        @click="openLightbox(siteVisitData.images.streetViewEastUrl, 'Street View - 90° East')"
      >
        <img :src="siteVisitData.images.streetViewEastUrl" alt="East Heading" />
        <span class="tile-badge">East (90°)</span>
      </div>

      <div
        v-if="siteVisitData.images.hasStreetViewCoverage && siteVisitData.images.streetViewSouthUrl"
        class="thumb-tile"
        @click="openLightbox(siteVisitData.images.streetViewSouthUrl, 'Street View - 180° South')"
      >
        <img :src="siteVisitData.images.streetViewSouthUrl" alt="South Heading" />
        <span class="tile-badge">South (180°)</span>
      </div>

      <div
        v-if="siteVisitData.images.hasStreetViewCoverage && siteVisitData.images.streetViewWestUrl"
        class="thumb-tile"
        @click="openLightbox(siteVisitData.images.streetViewWestUrl, 'Street View - 270° West')"
      >
        <img :src="siteVisitData.images.streetViewWestUrl" alt="West Heading" />
        <span class="tile-badge">West (270°)</span>
      </div>

      <div
        v-if="siteVisitData.images.satelliteUrl"
        class="thumb-tile satellite"
        @click="openLightbox(siteVisitData.images.satelliteUrl, 'Satellite Snapshot')"
      >
        <img :src="siteVisitData.images.satelliteUrl" alt="Satellite Overhead" />
        <span class="tile-badge sat-badge">Satellite</span>
      </div>
    </div>

    <!-- Lightbox Modal (T013) -->
    <div v-if="activeLightboxImage" class="lightbox-modal" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <header class="lightbox-header">
          <span>{{ activeLightboxTitle }}</span>
          <button class="btn-close" @click="closeLightbox">✕</button>
        </header>
        <img :src="activeLightboxImage" :alt="activeLightboxTitle" class="lightbox-img" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  siteVisitData: any;
}>();

const activeLightboxImage = ref<string | null>(null);
const activeLightboxTitle = ref<string>('');

function openLightbox(url: string, title: string) {
  activeLightboxImage.value = url;
  activeLightboxTitle.value = title;
}

function closeLightbox() {
  activeLightboxImage.value = null;
  activeLightboxTitle.value = '';
}
</script>

<style scoped>
.site-visit-gallery {
  margin-top: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.gallery-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #4a5568;
  margin-bottom: 0.375rem;
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
