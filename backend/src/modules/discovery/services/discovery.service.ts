import { Injectable } from '@nestjs/common';
import { BigQueryDiscoveryService, RawPoiItem, RadiusPoiItem, LatLngPoint } from './bigquery-discovery.service';
import { PoiRelevanceClassifierService } from './poi-relevance-classifier.service';
import { RawHeatmapFilter, describeHeatmapFilter, validateHeatmapFilters } from './heatmap-filter.util';
import {
  CatchmentExplanationService,
  CatchmentSubScoreKey,
  ContributingPoiFact,
} from './catchment-explanation.service';

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
  weights: CatchmentSubScores;
  poiCount: number;
  contributingPois: Record<CatchmentSubScoreKey, ContributingPoiFact[]>;
  explanations: Record<CatchmentSubScoreKey, string> | null;
  boundaryType: 'radius' | 'time';
  radiusKm?: number;
  travelMode?: 'drive' | 'walk' | 'transit';
  timeMinutes?: number;
  polygonCoordinates?: LatLngPoint[];
  summary: string;
}

@Injectable()
export class DiscoveryService {
  constructor(
    private readonly bigqueryDiscoveryService: BigQueryDiscoveryService,
    private readonly poiRelevanceClassifierService: PoiRelevanceClassifierService,
    private readonly catchmentExplanationService: CatchmentExplanationService,
  ) {}

  async searchCandidates(
    businessType: string,
    region: string,
    limit = 5,
  ): Promise<DiscoveryCandidate[]> {
    const [peerCategories, demandCategories] = await Promise.all([
      this.poiRelevanceClassifierService.classifyRelevantCategories(businessType),
      this.poiRelevanceClassifierService.classifyDemandDriverCategories(businessType),
    ]);

    const rawPois = await this.bigqueryDiscoveryService.queryPoisByRegion(businessType, region);
    const candidateSpots = rawPois.slice(0, limit);

    const candidates: DiscoveryCandidate[] = [];
    for (const [index, poi] of candidateSpots.entries()) {
      const rank = index + 1;

      // Real 1km-radius signal per candidate — same demand/competitor category classifiers and
      // the same ratio-based demand formula already established for Catchment's demandDensity
      // sub-score, so a "demand score" means the same thing across features.
      const nearby = await this.bigqueryDiscoveryService.queryPoisWithinRadius(
        poi.latitude,
        poi.longitude,
        1000,
      );
      const nearbyDemand = nearby.filter((p) => demandCategories.includes(p.standardizedCategory));
      const nearbyCompetitors = nearby.filter((p) => peerCategories.includes(p.standardizedCategory));

      const demandScore = nearby.length > 0
        ? Math.min(100, Math.max(10, Math.round((nearbyDemand.length / nearby.length) * 120)))
        : 10;
      const competitionCount = nearbyCompetitors.length;

      const topDemandCategory = demandCategories[0]?.replace(/_/g, ' ');
      const rationale = topDemandCategory
        ? `${nearbyDemand.length} real ${topDemandCategory}-type demand POI${nearbyDemand.length === 1 ? '' : 's'} and ${competitionCount} same-type competitor${competitionCount === 1 ? '' : 's'} within 1km.`
        : `${competitionCount} same-type competitor${competitionCount === 1 ? '' : 's'} within 1km.`;

      candidates.push({
        rank,
        name: poi.name,
        latitude: poi.latitude,
        longitude: poi.longitude,
        demandScore,
        competitionCount,
        rationale,
        regencyCode: poi.regencyCode || '3506',
        businessType,
      });
    }

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
    category: string;
    locationName?: string;
    regionFilter?: string;
    boundaryType: 'radius' | 'time';
    radiusKm?: number;
    travelMode?: 'drive' | 'walk' | 'transit';
    timeMinutes?: number;
    customWeights?: Partial<Record<keyof CatchmentSubScores, number>>;
  }): Promise<CatchmentCalculationResult> {
    const locName = options.locationName || 'location';

    const [peerCategories, demandCategories] = await Promise.all([
      this.poiRelevanceClassifierService.classifyRelevantCategories(options.category),
      this.poiRelevanceClassifierService.classifyDemandDriverCategories(options.category),
    ]);

    let rawPois: RadiusPoiItem[];
    let radiusKm: number | undefined;
    let travelMode: 'drive' | 'walk' | 'transit' | undefined;
    let timeMinutes: number | undefined;
    let polygonCoordinates: LatLngPoint[] | undefined;
    let boundaryDescription: string;
    let expandSuggestion: string;

    if (options.boundaryType === 'time') {
      travelMode = options.travelMode || 'drive';
      timeMinutes = Math.min(30, Math.max(1, options.timeMinutes ?? 10));

      polygonCoordinates = await this.bigqueryDiscoveryService.generateIsochronePolygon(
        options.lat,
        options.lng,
        travelMode,
        timeMinutes,
      );

      rawPois = await this.bigqueryDiscoveryService.queryPoisInsidePolygon(
        polygonCoordinates,
        options.lat,
        options.lng,
        options.regionFilter,
      );

      boundaryDescription = `${timeMinutes}-minute ${travelMode}`;
      expandSuggestion = `Try increasing the time to ${timeMinutes + 5} or ${timeMinutes + 10} minutes.`;
    } else {
      radiusKm = Math.min(10, Math.max(0.1, options.radiusKm ?? 2.0));
      const radiusMeters = Math.round(radiusKm * 1000);

      rawPois = await this.bigqueryDiscoveryService.queryPoisWithinRadius(
        options.lat,
        options.lng,
        radiusMeters,
        options.regionFilter,
      );

      boundaryDescription = `${radiusKm}km radius`;
      expandSuggestion = `Try expanding the radius to ${(radiusKm * 1.5).toFixed(1)}km or ${(radiusKm * 2.5).toFixed(1)}km.`;
    }

    const poiCount = rawPois.length;

    const demandPois = rawPois.filter((p) => demandCategories.includes(p.standardizedCategory));
    const demandDensity = poiCount > 0
      ? Math.min(100, Math.max(10, Math.round((demandPois.length / poiCount) * 120)))
      : 10;

    const totalRatings = rawPois.reduce((acc, p) => acc + (p.userRatingsTotal || 0), 0);
    const trafficProxy = Math.min(100, Math.max(10, Math.round(Math.log10(totalRatings + 1) * 28)));

    const validRatings = rawPois.filter((p) => p.rating && p.rating > 0);
    const avgRating = validRatings.length > 0
      ? validRatings.reduce((acc, p) => acc + (p.rating || 4.0), 0) / validRatings.length
      : 4.0;
    const areaQuality = Math.min(100, Math.max(20, Math.round((avgRating / 5.0) * 100)));

    // Competitors: POIs matching this business's own peer category set (exact poi_type_strd
    // match, not substring-matching noisy free-text) — same-type/adjacent businesses, i.e. real
    // market competition.
    const competitors = rawPois.filter((p) => peerCategories.includes(p.standardizedCategory));
    const competitionPenalty = Math.min(100, Math.round(competitors.length * 12));

    // Network Saturation is deliberately NOT a restatement of Competition Penalty's count: the
    // source POI dataset has no brand/chain column, so true same-brand cannibalization can't be
    // measured. Instead this measures CONCENTRATION — what fraction of competitors are clustered
    // tightly near the exact site vs. spread across the wider catchment area. Two spots can have
    // the identical competitor count but very different saturation if one is a tight cluster right
    // at the site and the other is spread thinly across the whole area. Penalty only kicks in past
    // the same >2 competitor threshold the original spec called for.
    //
    // A flat real-world distance (not a fraction of the boundary) on purpose: "clustered right on
    // top of this spot" is a fixed physical concept independent of whether the outer boundary is a
    // 2km circle or an irregular 10-minute-drive isochrone, and using a flat constant keeps the
    // metric comparable between a radius run and a time run for the same location.
    const NETWORK_SATURATION_INNER_RING_METERS = 750;
    const competitorsInInnerRing = competitors.filter((p) => p.distanceMeters <= NETWORK_SATURATION_INNER_RING_METERS);
    const concentrationRatio = competitors.length > 0 ? competitorsInInnerRing.length / competitors.length : 0;
    const networkSaturation = competitors.length <= 2 ? 0 : Math.min(100, Math.round(concentrationRatio * 100));

    const activePois = rawPois.filter((p) => (p.businessStatus || 'OPERATIONAL') === 'OPERATIONAL');
    const inactivePois = rawPois.filter((p) => (p.businessStatus || 'OPERATIONAL') !== 'OPERATIONAL');
    const operationalVitality = poiCount > 0
      ? Math.round((activePois.length / poiCount) * 100)
      : 90;

    const weights: CatchmentSubScores = {
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

    const toFacts = (pois: RadiusPoiItem[]): ContributingPoiFact[] =>
      [...pois]
        .sort((a, b) => a.distanceMeters - b.distanceMeters)
        .slice(0, 5)
        .map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category,
          latitude: p.latitude,
          longitude: p.longitude,
          distanceMeters: p.distanceMeters,
          rating: p.rating,
          businessStatus: p.businessStatus,
        }));

    const contributingPois: Record<CatchmentSubScoreKey, ContributingPoiFact[]> = {
      demandDensity: toFacts(demandPois),
      trafficProxy: toFacts([...rawPois].sort((a, b) => (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0)).slice(0, 5)),
      areaQuality: toFacts([...validRatings].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5)),
      competitionPenalty: toFacts(competitors),
      networkSaturation: toFacts(competitorsInInnerRing),
      operationalVitality: toFacts(inactivePois.length > 0 ? inactivePois : activePois),
    };

    const explanations = poiCount > 0
      ? await this.catchmentExplanationService.generateExplanations({
          category: options.category,
          locationName: locName,
          boundaryDescription,
          subScores: { demandDensity, trafficProxy, areaQuality, competitionPenalty, networkSaturation, operationalVitality },
          weights,
          contributingPois,
        })
      : null;

    const summary = poiCount === 0
      ? `No POIs found within ${boundaryDescription} of ${locName}. ${expandSuggestion}`
      : `Catchment analysis for ${locName} (${options.category}), ${boundaryDescription}:\n\n` +
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
      weights,
      poiCount,
      contributingPois,
      explanations,
      boundaryType: options.boundaryType,
      radiusKm,
      travelMode,
      timeMinutes,
      polygonCoordinates,
      summary,
    };
  }

  /** Computes and renders a travel-time boundary shape only — no BigQuery POI query, no scoring. */
  async generateTravelBoundary(options: {
    lat: number;
    lng: number;
    travelMode?: 'drive' | 'walk' | 'transit';
    timeMinutes?: number;
  }): Promise<{ travelMode: 'drive' | 'walk' | 'transit'; timeMinutes: number; polygonCoordinates: LatLngPoint[] }> {
    const travelMode = options.travelMode || 'drive';
    const timeMinutes = Math.min(30, Math.max(1, options.timeMinutes ?? 10));

    const polygonCoordinates = await this.bigqueryDiscoveryService.generateIsochronePolygon(
      options.lat,
      options.lng,
      travelMode,
      timeMinutes,
    );

    return { travelMode, timeMinutes, polygonCoordinates };
  }
}
