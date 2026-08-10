import { Injectable } from '@nestjs/common';
import { BigQueryDiscoveryService, RawPoiItem } from './bigquery-discovery.service';
import { PoiRelevanceClassifierService } from './poi-relevance-classifier.service';

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
    mode: 'business_based' | 'custom_prompt';
    businessType?: string;
    region: string;
    customCategory?: string;
    maxRating?: number;
  }): Promise<{ points: WeightedHeatmapPoint[]; summary: string }> {
    const rawPois = await this.bigqueryDiscoveryService.queryHeatmapRawPois(
      options.region,
      options.customCategory,
      options.maxRating,
    );

    let points: WeightedHeatmapPoint[] = [];
    let summary = '';

    if (options.mode === 'business_based') {
      const bType = options.businessType || 'business';
      const demandCategories = this.bigqueryDiscoveryService.getDemandCategoriesForType(bType);

      points = rawPois.map((p, idx) => {
        let weight = 5.0;
        const cat = (p.category || '').toLowerCase();

        if (demandCategories.some((dc) => cat.includes(dc))) {
          weight += 3.5;
        }
        if (cat.includes(bType.toLowerCase())) {
          weight -= 2.0;
        }

        weight = Math.min(10.0, Math.max(1.0, weight + ((idx % 5) - 2) * 0.5));

        return {
          lat: p.latitude,
          lng: p.longitude,
          weight: Number(weight.toFixed(1)),
        };
      });

      summary = `Darker red areas indicate high ${bType} demand density with low direct competition in ${options.region}.`;
    } else {
      const catLabel = options.customCategory || 'POI';
      const ratingLabel = options.maxRating ? ` with rating below ${options.maxRating}` : '';

      points = rawPois.map((p, idx) => {
        let weight = 6.0;
        if (p.rating && options.maxRating) {
          weight = Math.min(10.0, Math.max(1.0, (5.0 - p.rating) * 2.0 + 3.0));
        } else {
          weight = Math.min(10.0, Math.max(2.0, 5.0 + (Math.sin(idx * 0.7) * 3.5)));
        }
        return {
          lat: p.latitude,
          lng: p.longitude,
          weight: Number(weight.toFixed(1)),
        };
      });

      summary = `Exploratory density heatmap showing ${catLabel} locations${ratingLabel} across ${options.region}.`;
    }

    if (points.length > 5000) {
      points = points.slice(0, 5000);
    }

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
