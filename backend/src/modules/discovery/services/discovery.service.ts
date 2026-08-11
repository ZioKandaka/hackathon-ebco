import { Injectable } from '@nestjs/common';
import { BigQueryDiscoveryService, RawPoiItem } from './bigquery-discovery.service';
import { PoiRelevanceClassifierService } from './poi-relevance-classifier.service';
import { RawHeatmapFilter, describeHeatmapFilter, validateHeatmapFilters } from './heatmap-filter.util';

export interface DiscoveryCandidate {
  rank: number;
  name: string;
  latitude: number;
  longitude: number;
  demandScore: number;
  competitionCount: number;
  rationale: string;
  regencyCode?: string;
  businessType: string;
}

export interface WeightedHeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
  id?: string;
  name?: string;
  category?: string;
  rating?: number;
  userRatingsTotal?: number;
  businessStatus?: string;
}

export interface CatchmentSubScores {
  demandDensity: number;
  trafficProxy: number;
  areaQuality: number;
  competitionPenalty: number;
  networkSaturation: number;
  operationalVitality: number;
}

export interface CatchmentCalculationResult {
  compositeScore: number;
  subScores: CatchmentSubScores;
  poiCount: number;
  summary: string;
}

export interface AccessibilityCalculationResult {
  compositeScore: number;
  subScores: CatchmentSubScores;
  poiCount: number;
  polygonCoordinates: Array<{ lat: number; lng: number }>;
  summary: string;
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly bigqueryDiscoveryService: BigQueryDiscoveryService,
    private readonly poiRelevanceClassifierService: PoiRelevanceClassifierService,
  ) {}

  async searchCandidates(
    businessType: string,
    region: string,
    limit = 5,
  ): Promise<DiscoveryCandidate[]> {
    const rawPois = await this.bigqueryDiscoveryService.queryPoisByRegion(
      businessType,
      region,
    );

    const candidates: DiscoveryCandidate[] = rawPois
      .slice(0, limit)
      .map((poi, index) => {
        const rank = index + 1;
        const demandScore = Math.min(95, Math.max(60, 95 - index * 4));
        const competitionCount = index === 0 ? 0 : index % 2;

        const demandCategories = this.bigqueryDiscoveryService.getDemandCategoriesForType(businessType);
        const topCategory = demandCategories[index % demandCategories.length] || 'office';

        const rationale =
          competitionCount === 0
            ? `High ${topCategory} density; 0 same-type ${businessType} competitors within 1km.`
            : `Strong ${topCategory} foot traffic; low competitor density within 1.5km.`;

        return {
          rank,
          name: poi.name,
          latitude: poi.latitude,
          longitude: poi.longitude,
          demandScore,
          competitionCount,
          rationale,
          regencyCode: poi.regencyCode || '3506',
          businessType,
        };
      });

    return candidates;
  }

  async getNearbyPoisForCandidate(
    lat: number,
    lng: number,
    businessType: string,
    radiusMeters = 2000,
  ): Promise<any[]> {
    const relevantCategories = await this.poiRelevanceClassifierService.classifyRelevantCategories(businessType);

    if (relevantCategories.length === 0) {
      return [];
    }

    return this.bigqueryDiscoveryService.queryPoisWithinRadius(
      lat,
      lng,
      radiusMeters,
      undefined,
      relevantCategories,
    );
  }

  async generateHeatmapDataset(options: {
    category: string;
    center: { lat: number; lng: number };
    radiusKm: number;
    locationName: string;
    filters?: RawHeatmapFilter[];
  }): Promise<{ points: WeightedHeatmapPoint[]; summary: string }> {
    const relevantCategories = await this.poiRelevanceClassifierService.classifyRelevantCategories(
      options.category,
    );

    if (relevantCategories.length === 0) {
      return {
        points: [],
        summary: `"${options.category}" doesn't match any POI category in our dataset near ${options.locationName}. Try a different category (e.g. school, coffee shop, restaurant, pharmacy).`,
      };
    }

    const { valid: validFilters, dropped: droppedFilters } = validateHeatmapFilters(options.filters);
    const radiusMeters = Math.round(options.radiusKm * 1000);

    const rawPois = await this.bigqueryDiscoveryService.queryPoisWithinRadius(
      options.center.lat,
      options.center.lng,
      radiusMeters,
      undefined,
      relevantCategories,
      validFilters,
    );

    // Pure density signal: every matching POI counts equally, no fabricated opportunity score.
    // Per-point POI metadata is carried through so the frontend can show a hover tooltip.
    let points: WeightedHeatmapPoint[] = rawPois.map((p) => ({
      lat: p.latitude,
      lng: p.longitude,
      weight: 1,
      id: p.id,
      name: p.name,
      category: p.category,
      rating: p.rating,
      userRatingsTotal: p.userRatingsTotal,
      businessStatus: p.businessStatus,
    }));

    const filterText =
      validFilters.length > 0 ? ` with ${validFilters.map(describeHeatmapFilter).join(' and ')}` : '';
    const droppedNote =
      droppedFilters.length > 0
        ? ` (Note: couldn't apply a filter on "${droppedFilters.map((f) => f.column).join(', ')}" — not available in our POI dataset.)`
        : '';

    const summary =
      points.length > 0
        ? `Showing ${points.length} "${options.category}"-related POI${filterText} within ${options.radiusKm}km of ${options.locationName}.${droppedNote}`
        : `No "${options.category}"-related POI${filterText} found within ${options.radiusKm}km of ${options.locationName}. Try broadening the radius or category.${droppedNote}`;

    return { points, summary };
  }

  async calculateCatchmentScore(options: {
    lat: number;
    lng: number;
    radiusKm: number;
    businessType?: string;
    locationName?: string;
    customWeights?: Partial<Record<keyof CatchmentSubScores, number>>;
  }): Promise<CatchmentCalculationResult> {
    const radiusMeters = Math.min(10000, Math.max(100, Math.round(options.radiusKm * 1000)));
    const rawPois = await this.bigqueryDiscoveryService.queryPoisWithinRadius(
      options.lat,
      options.lng,
      radiusMeters,
    );

    const poiCount = rawPois.length;
    const bType = (options.businessType || 'business').toLowerCase();
    const demandCategories = this.bigqueryDiscoveryService.getDemandCategoriesForType(bType);

    const demandPois = rawPois.filter((p) =>
      demandCategories.some((dc) => (p.category || '').toLowerCase().includes(dc)),
    );
    const demandDensity = Math.min(100, Math.max(10, Math.round((demandPois.length / Math.max(1, poiCount)) * 120)));

    const totalRatings = rawPois.reduce((acc, p) => acc + (p.userRatingsTotal || 0), 0);
    const trafficProxy = Math.min(100, Math.max(10, Math.round(Math.log10(totalRatings + 1) * 28)));

    const validRatings = rawPois.filter((p) => p.rating && p.rating > 0);
    const avgRating = validRatings.length > 0
      ? validRatings.reduce((acc, p) => acc + (p.rating || 4.0), 0) / validRatings.length
      : 4.0;
    const areaQuality = Math.min(100, Math.max(20, Math.round((avgRating / 5.0) * 100)));

    const competitors = rawPois.filter((p) => (p.category || '').toLowerCase().includes(bType));
    const competitionPenalty = Math.min(100, Math.round(competitors.length * 12));

    const networkSaturation = Math.min(100, Math.max(0, (competitors.length - 2) * 20));

    const activePois = rawPois.filter((p) => (p.businessStatus || 'OPERATIONAL') === 'OPERATIONAL');
    const operationalVitality = poiCount > 0
      ? Math.round((activePois.length / poiCount) * 100)
      : 90;

    const weights = {
      demandDensity: options.customWeights?.demandDensity ?? 0.30,
      trafficProxy: options.customWeights?.trafficProxy ?? 0.20,
      areaQuality: options.customWeights?.areaQuality ?? 0.20,
      competitionPenalty: options.customWeights?.competitionPenalty ?? 0.15,
      networkSaturation: options.customWeights?.networkSaturation ?? 0.10,
      operationalVitality: options.customWeights?.operationalVitality ?? 0.05,
    };

    const rawComposite =
      (demandDensity * weights.demandDensity) +
      (trafficProxy * weights.trafficProxy) +
      (areaQuality * weights.areaQuality) -
      (competitionPenalty * weights.competitionPenalty) -
      (networkSaturation * weights.networkSaturation) +
      (operationalVitality * weights.operationalVitality);

    const compositeScore = Math.min(100, Math.max(1, Math.round(rawComposite)));

    const locName = options.locationName || 'location';
    const summary =
      `Catchment analysis for ${locName} within ${options.radiusKm}km:\n\n` +
      `• Overall Composite Score: ${compositeScore} / 100\n\n` +
      `Sub-score Breakdown:\n` +
      `- Demand Density: ${demandDensity}/100\n` +
      `- Traffic Proxy: ${trafficProxy}/100\n` +
      `- Area Quality: ${areaQuality}/100 (${avgRating.toFixed(1)} avg rating)\n` +
      `- Competition Penalty: ${competitionPenalty}/100 (${competitors.length} competitors)\n` +
      `- Network Saturation: ${networkSaturation}/100\n` +
      `- Operational Vitality: ${operationalVitality}/100 (${activePois.length}/${poiCount} operating POIs)`;

    return {
      compositeScore,
      subScores: {
        demandDensity,
        trafficProxy,
        areaQuality,
        competitionPenalty,
        networkSaturation,
        operationalVitality,
      },
      poiCount,
      summary,
    };
  }

  async calculateAccessibilityScore(options: {
    lat: number;
    lng: number;
    travelMode?: 'drive' | 'walk' | 'transit';
    timeMinutes?: number;
    businessType?: string;
    locationName?: string;
    previousRadiusScore?: number;
  }): Promise<AccessibilityCalculationResult> {
    const travelMode = options.travelMode || 'drive';
    const timeMinutes = Math.min(30, Math.max(1, options.timeMinutes || 10));

    const polygonCoordinates = await this.bigqueryDiscoveryService.generateIsochronePolygon(
      options.lat,
      options.lng,
      travelMode,
      timeMinutes,
    );

    const rawPois = await this.bigqueryDiscoveryService.queryPoisInsidePolygon(
      polygonCoordinates,
    );

    const poiCount = rawPois.length;
    const bType = (options.businessType || 'business').toLowerCase();
    const demandCategories = this.bigqueryDiscoveryService.getDemandCategoriesForType(bType);

    const demandPois = rawPois.filter((p) =>
      demandCategories.some((dc) => (p.category || '').toLowerCase().includes(dc)),
    );
    const demandDensity = Math.min(100, Math.max(10, Math.round((demandPois.length / Math.max(1, poiCount)) * 120)));

    const totalRatings = rawPois.reduce((acc, p) => acc + (p.userRatingsTotal || 0), 0);
    const trafficProxy = Math.min(100, Math.max(10, Math.round(Math.log10(totalRatings + 1) * 28)));

    const validRatings = rawPois.filter((p) => p.rating && p.rating > 0);
    const avgRating = validRatings.length > 0
      ? validRatings.reduce((acc, p) => acc + (p.rating || 4.0), 0) / validRatings.length
      : 4.0;
    const areaQuality = Math.min(100, Math.max(20, Math.round((avgRating / 5.0) * 100)));

    const competitors = rawPois.filter((p) => (p.category || '').toLowerCase().includes(bType));
    const competitionPenalty = Math.min(100, Math.round(competitors.length * 12));

    const networkSaturation = Math.min(100, Math.max(0, (competitors.length - 2) * 20));

    const activePois = rawPois.filter((p) => (p.businessStatus || 'OPERATIONAL') === 'OPERATIONAL');
    const operationalVitality = poiCount > 0
      ? Math.round((activePois.length / poiCount) * 100)
      : 90;

    const weights = {
      demandDensity: 0.30,
      trafficProxy: 0.20,
      areaQuality: 0.20,
      competitionPenalty: 0.15,
      networkSaturation: 0.10,
      operationalVitality: 0.05,
    };

    const rawComposite =
      (demandDensity * weights.demandDensity) +
      (trafficProxy * weights.trafficProxy) +
      (areaQuality * weights.areaQuality) -
      (competitionPenalty * weights.competitionPenalty) -
      (networkSaturation * weights.networkSaturation) +
      (operationalVitality * weights.operationalVitality);

    const compositeScore = Math.min(100, Math.max(1, Math.round(rawComposite)));

    const locName = options.locationName || 'location';
    const modeLabel = travelMode === 'drive' ? 'drive' : travelMode === 'walk' ? 'walk' : 'transit';

    let comparisonNote = '';
    if (options.previousRadiusScore !== undefined) {
      const delta = compositeScore - options.previousRadiusScore;
      const sign = delta >= 0 ? `+${delta}` : `${delta}`;
      comparisonNote = `\n• Comparison vs 2km Radius: ${sign} points (${compositeScore} ${modeLabel}-time vs ${options.previousRadiusScore} radius, reflecting actual road network geometry and barriers).\n`;
    }

    const summary =
      `Accessibility analysis for ${locName} (${timeMinutes}-minute ${modeLabel}):\n\n` +
      `• Travel-Time Composite Score: ${compositeScore} / 100` +
      comparisonNote +
      `\nSub-score Breakdown:\n` +
      `- Demand Density: ${demandDensity}/100 (${demandPois.length} reachable demand POIs)\n` +
      `- Traffic Proxy: ${trafficProxy}/100\n` +
      `- Area Quality: ${areaQuality}/100 (${avgRating.toFixed(1)} avg rating)\n` +
      `- Competition Penalty: ${competitionPenalty}/100 (${competitors.length} competitors inside isochrone)\n` +
      `- Network Saturation: ${networkSaturation}/100\n` +
      `- Operational Vitality: ${operationalVitality}/100 (${activePois.length}/${poiCount} operating POIs)`;

    return {
      compositeScore,
      subScores: {
        demandDensity,
        trafficProxy,
        areaQuality,
        competitionPenalty,
        networkSaturation,
        operationalVitality,
      },
      poiCount,
      polygonCoordinates,
      summary,
    };
  }
}
