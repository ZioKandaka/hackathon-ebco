<template>
  <div class="radar-wrap">
    <svg :viewBox="`0 0 ${size} ${size}`" class="radar-svg">
      <!-- Grid rings -->
      <polygon
        v-for="ring in 4"
        :key="ring"
        :points="ringPoints(ring / 4)"
        class="radar-ring"
      />
      <!-- Axis lines -->
      <line
        v-for="(axis, i) in axes"
        :key="axis.key"
        :x1="center"
        :y1="center"
        :x2="pointFor(i, 1).x"
        :y2="pointFor(i, 1).y"
        class="radar-axis"
      />
      <!-- Data polygon -->
      <polygon :points="dataPoints" class="radar-data" />
      <circle
        v-for="(axis, i) in axes"
        :key="`dot-${axis.key}`"
        :cx="pointFor(i, normalize(axis.key)).x"
        :cy="pointFor(i, normalize(axis.key)).y"
        r="3"
        class="radar-dot"
      />
      <!-- Labels -->
      <text
        v-for="(axis, i) in axes"
        :key="`label-${axis.key}`"
        :x="labelPoint(i).x"
        :y="labelPoint(i).y"
        :text-anchor="labelAnchor(i)"
        class="radar-label"
      >
        {{ axis.label }}
      </text>
    </svg>
    <p class="radar-caption">Bigger shape = better on every axis (competition &amp; saturation shown inverted).</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CatchmentSubScores, CatchmentSubScoreKey } from '../../services/chat-sse.service';

const props = defineProps<{
  subScores: CatchmentSubScores;
  size?: number;
}>();

const size = computed(() => props.size || 240);
const center = computed(() => size.value / 2);
// Leave a generous margin for the label text runs (see comment on `axes` below) — the ring
// itself only needs to stop well short of the viewBox edge, not right up against it.
const maxRadius = computed(() => size.value / 2 - 50);

// Competition Penalty and Network Saturation are "lower is better" — invert them for the chart
// so every axis reads bigger-shape-is-better, matching how the composite score treats them.
// Kept short deliberately: each label is drawn as a single SVG text run anchored at the axis
// tip, and a long string (e.g. "Area Quality") extends past the chart's own viewBox edge and
// gets hard-clipped by the SVG's default overflow:hidden — this is not just a font-size tweak.
const axes: { key: CatchmentSubScoreKey; label: string; invert: boolean }[] = [
  { key: 'demandDensity', label: 'Demand', invert: false },
  { key: 'trafficProxy', label: 'Traffic', invert: false },
  { key: 'areaQuality', label: 'Quality', invert: false },
  { key: 'competitionPenalty', label: 'Low Comp.', invert: true },
  { key: 'networkSaturation', label: 'Low Sat.', invert: true },
  { key: 'operationalVitality', label: 'Vitality', invert: false },
];

function normalize(key: CatchmentSubScoreKey): number {
  const axis = axes.find((a) => a.key === key)!;
  const raw = props.subScores[key] ?? 0;
  const value = axis.invert ? 100 - raw : raw;
  return Math.min(1, Math.max(0, value / 100));
}

function angleFor(index: number): number {
  return (Math.PI * 2 * index) / axes.length - Math.PI / 2;
}

function pointFor(index: number, fraction: number): { x: number; y: number } {
  const angle = angleFor(index);
  return {
    x: center.value + Math.cos(angle) * maxRadius.value * fraction,
    y: center.value + Math.sin(angle) * maxRadius.value * fraction,
  };
}

function ringPoints(fraction: number): string {
  return axes.map((_, i) => { const p = pointFor(i, fraction); return `${p.x},${p.y}`; }).join(' ');
}

const dataPoints = computed(() =>
  axes.map((axis, i) => { const p = pointFor(i, normalize(axis.key)); return `${p.x},${p.y}`; }).join(' '),
);

function labelPoint(index: number): { x: number; y: number } {
  return pointFor(index, 1.16);
}

function labelAnchor(index: number): string {
  const angle = angleFor(index);
  const cos = Math.cos(angle);
  if (cos > 0.3) return 'start';
  if (cos < -0.3) return 'end';
  return 'middle';
}
</script>

<style scoped>
.radar-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
}

.radar-svg {
  width: 100%;
  max-width: 280px;
  height: auto;
  /* Safety net on top of the geometry fix above: never hard-clip a label that still runs
     slightly past the viewBox edge (e.g. at very small panel widths). */
  overflow: visible;
}

.radar-ring {
  fill: none;
  stroke: #e2e8f0;
  stroke-width: 1;
}

.radar-axis {
  stroke: #e2e8f0;
  stroke-width: 1;
}

.radar-data {
  fill: rgba(49, 130, 206, 0.35);
  stroke: #3182ce;
  stroke-width: 2;
}

.radar-dot {
  fill: #3182ce;
}

.radar-label {
  font-size: 8.5px;
  fill: #4a5568;
  font-family: system-ui, -apple-system, sans-serif;
}

.radar-caption {
  margin: 0;
  font-size: 0.6875rem;
  color: #a0aec0;
  text-align: center;
}
</style>
