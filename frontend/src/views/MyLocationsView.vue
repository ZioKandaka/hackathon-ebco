<template>
  <div class="view-container">
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
        <li v-for="loc in locationsStore.locations" :key="loc.id" class="location-card">
          <template v-if="editingId === loc.id">
            <div class="edit-form">
              <label>Name</label>
              <input v-model="editDraft.name" type="text" />
              <label>Business type</label>
              <input v-model="editDraft.businessType" type="text" />
              <label>Address</label>
              <input v-model="editDraft.fullAddress" type="text" />
              <div class="edit-actions">
                <button class="btn-save" @click="saveEdit(loc.id)">Save</button>
                <button class="btn-cancel" @click="cancelEdit">Cancel</button>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="card-header" @click="selectLocation(loc)">
              <span class="location-name">{{ loc.name }}</span>
              <span class="type-tag">{{ loc.businessType }}</span>
            </div>
            <p class="address-text" @click="selectLocation(loc)">{{ loc.fullAddress }}</p>

            <div v-if="latestCatchment(loc.id) || latestSiteVisit(loc.id) || latestHeatmap(loc.id)" class="badge-row">
              <span v-if="latestCatchment(loc.id)" class="badge badge-catchment">
                Catchment: {{ latestCatchment(loc.id)!.compositeScore }}
              </span>
              <span v-if="latestSiteVisit(loc.id)" class="badge badge-visit">
                Visit: {{ latestSiteVisit(loc.id)!.overallVisualScore }}
              </span>
              <span v-if="latestHeatmap(loc.id)" class="badge badge-heatmap">
                Heatmap: {{ latestHeatmap(loc.id)!.category }}
              </span>
            </div>

            <div class="card-actions">
              <button class="btn-link" @click.stop="toggleDashboard(loc.id)">
                {{ dashboardLocationId === loc.id ? 'Hide history' : 'View history' }}
              </button>
              <button class="btn-link" @click.stop="startEdit(loc)">Edit</button>
              <button
                v-if="confirmDeleteId !== loc.id"
                class="btn-link btn-danger"
                @click.stop="confirmDeleteId = loc.id"
              >
                Delete
              </button>
              <template v-else>
                <span class="confirm-text">Delete?</span>
                <button class="btn-link btn-danger" @click.stop="removeLocation(loc.id)">Yes</button>
                <button class="btn-link" @click.stop="confirmDeleteId = null">No</button>
              </template>
            </div>

            <div v-if="dashboardLocationId === loc.id" class="dashboard-box">
              <div v-if="dashboardEntries(loc.id).length === 0" class="dashboard-empty">
                No catchment, site visit, or heatmap runs recorded for this location yet.
              </div>
              <ul v-else class="dashboard-list">
                <li
                  v-for="entry in dashboardEntries(loc.id)"
                  :key="`${entry.type}-${entry.id}`"
                  class="dashboard-entry"
                  :class="entry.type"
                  @click="entry.onClick()"
                >
                  <span class="entry-label">{{ entry.label }}</span>
                  <span class="entry-date">{{ formatDate(entry.createdAt) }}</span>
                </li>
              </ul>
            </div>
          </template>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useLocationsStore, UserLocationItem } from '../stores/locations.store';
import { useCatchmentStore } from '../stores/catchment.store';
import { useSiteVisitStore } from '../stores/siteVisit.store';
import { useHeatmapStore } from '../stores/heatmap.store';
import { useGoogleMap } from '../composables/useGoogleMap';

const locationsStore = useLocationsStore();
const catchmentStore = useCatchmentStore();
const siteVisitStore = useSiteVisitStore();
const heatmapStore = useHeatmapStore();
const { setCenter } = useGoogleMap();

const editingId = ref<string | null>(null);
const confirmDeleteId = ref<string | null>(null);
const dashboardLocationId = ref<string | null>(null);
const editDraft = reactive({ name: '', businessType: '', fullAddress: '' });

function selectLocation(loc: UserLocationItem) {
  // Re-render all location pins first: the map's marker registry is shared across every
  // feature, and navigating through Discover/Heatmap/Catchment/Site Visit in between visits
  // can clear it via their own clearMarkers() calls, silently dropping these pins.
  locationsStore.renderLocationPins();
  setCenter(Number(loc.latitude), Number(loc.longitude), 15);
}

function startEdit(loc: UserLocationItem) {
  editingId.value = loc.id;
  editDraft.name = loc.name;
  editDraft.businessType = loc.businessType;
  editDraft.fullAddress = loc.fullAddress;
}

function cancelEdit() {
  editingId.value = null;
}

async function saveEdit(id: string) {
  await locationsStore.updateLocation(id, {
    name: editDraft.name,
    businessType: editDraft.businessType,
    fullAddress: editDraft.fullAddress,
  });
  editingId.value = null;
}

async function removeLocation(id: string) {
  await locationsStore.deleteLocation(id);
  confirmDeleteId.value = null;
  if (dashboardLocationId.value === id) dashboardLocationId.value = null;
}

function toggleDashboard(id: string) {
  dashboardLocationId.value = dashboardLocationId.value === id ? null : id;
}

function latestCatchment(locationId: string) {
  return catchmentStore.runs.find((r) => r.locationId === locationId) || null;
}

function latestSiteVisit(locationId: string) {
  return siteVisitStore.runs.find((r) => r.locationId === locationId) || null;
}

function latestHeatmap(locationId: string) {
  return heatmapStore.runs.find((r) => r.locationId === locationId) || null;
}

interface DashboardEntry {
  type: 'catchment' | 'siteVisit' | 'heatmap';
  id: string;
  label: string;
  createdAt: string;
  onClick: () => void;
}

function dashboardEntries(locationId: string): DashboardEntry[] {
  const entries: DashboardEntry[] = [];

  catchmentStore.runs
    .filter((r) => r.locationId === locationId)
    .forEach((r) =>
      entries.push({
        type: 'catchment',
        id: r.id,
        label: `Catchment score: ${r.compositeScore} (${r.category})`,
        createdAt: r.createdAt,
        onClick: () => catchmentStore.selectRun(r),
      }),
    );

  siteVisitStore.runs
    .filter((r) => r.locationId === locationId)
    .forEach((r) =>
      entries.push({
        type: 'siteVisit',
        id: r.id,
        label: `Site visit score: ${r.overallVisualScore}`,
        createdAt: r.createdAt,
        onClick: () => siteVisitStore.selectRun(r),
      }),
    );

  heatmapStore.runs
    .filter((r) => r.locationId === locationId)
    .forEach((r) =>
      entries.push({
        type: 'heatmap',
        id: r.id,
        label: `Heatmap: ${r.category} (${r.pointCount} pts, ${r.radiusKm}km)`,
        createdAt: r.createdAt,
        onClick: () => heatmapStore.selectRun(r),
      }),
    );

  return entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

onMounted(async () => {
  await Promise.all([
    locationsStore.fetchLocations(),
    catchmentStore.fetchHistory(),
    siteVisitStore.fetchHistory(),
    heatmapStore.fetchHistory(),
  ]);
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

.locations-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.location-card {
  padding: 0.875rem 1rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s;
}

.location-card:hover {
  border-color: #3182ce;
  box-shadow: 0 2px 8px rgba(49, 130, 206, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
  cursor: pointer;
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
  cursor: pointer;
}

.badge-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.badge {
  font-size: 0.6875rem;
  font-weight: 600;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.badge-catchment {
  background-color: #ebf8ff;
  color: #2b6cb0;
}

.badge-visit {
  background-color: #faf5ff;
  color: #6b46c1;
}

.badge-heatmap {
  background-color: #fffaf0;
  color: #c05621;
}

.card-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.625rem;
  padding-top: 0.5rem;
  border-top: 1px solid #edf2f7;
}

.btn-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: #3182ce;
  cursor: pointer;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-danger {
  color: #c53030;
}

.confirm-text {
  font-size: 0.75rem;
  color: #718096;
}

.edit-form {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.edit-form label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: #718096;
  margin-top: 0.25rem;
}

.edit-form input {
  padding: 0.375rem 0.5rem;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  font-size: 0.8125rem;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn-save {
  background-color: #3182ce;
  color: white;
  border: none;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-cancel {
  background: transparent;
  border: 1px solid #cbd5e0;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

.dashboard-box {
  margin-top: 0.625rem;
  padding: 0.625rem 0.75rem;
  background-color: #f7fafc;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.dashboard-empty {
  font-size: 0.75rem;
  color: #a0aec0;
  text-align: center;
  padding: 0.5rem 0;
}

.dashboard-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.dashboard-entry {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.75rem;
}

.dashboard-entry:hover {
  border-color: #3182ce;
}

.dashboard-entry.catchment {
  border-left: 3px solid #2b6cb0;
}

.dashboard-entry.siteVisit {
  border-left: 3px solid #6b46c1;
}

.dashboard-entry.heatmap {
  border-left: 3px solid #c05621;
}

.entry-label {
  color: #2d3748;
  font-weight: 500;
}

.entry-date {
  color: #a0aec0;
  white-space: nowrap;
  font-size: 0.6875rem;
}
</style>
