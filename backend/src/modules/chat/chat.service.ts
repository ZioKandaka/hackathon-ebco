import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService, DiscoveryCandidate } from '../discovery/services/discovery.service';
import { DiscoveryHistoryService } from '../discovery/services/discovery-history.service';
import { SiteVisitService, VisualCriteriaMap, SiteVisitImageType } from '../discovery/services/site-visit.service';
import { SiteVisitHistoryService } from '../discovery/services/site-visit-history.service';
import { CatchmentHistoryService } from '../discovery/services/catchment-history.service';
import { HeatmapHistoryService } from '../discovery/services/heatmap-history.service';
import { CatchmentSubScoreKey, ContributingPoiFact } from '../discovery/services/catchment-explanation.service';
import { VertexAiOrchestratorService } from './vertexai-orchestrator.service';

export interface HeatmapPoint {
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

export interface HeatmapDataPayload {
  queryId: string;
  locationId?: string;
  category: string;
  locationName: string;
  radiusKm: number;
  center: { lat: number; lng: number };
  pointCount: number;
  points: HeatmapPoint[];
  summary: string;
  createdAt: string;
}

export interface CatchmentSubScores {
  demandDensity: number;
  trafficProxy: number;
  areaQuality: number;
  competitionPenalty: number;
  networkSaturation: number;
  operationalVitality: number;
}

export interface CatchmentDataPayload {
  analysisId: string;
  locationId: string;
  locationName: string;
  category: string;
  boundaryType: 'radius' | 'time';
  radiusKm?: number;
  travelMode?: 'drive' | 'walk' | 'transit';
  timeMinutes?: number;
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
  compositeScore: number;
  subScores: CatchmentSubScores;
  weights: CatchmentSubScores;
  poiCount: number;
  contributingPois: Record<CatchmentSubScoreKey, ContributingPoiFact[]>;
  explanations: Record<CatchmentSubScoreKey, string> | null;
  center: { lat: number; lng: number };
  summary: string;
  createdAt: string;
}

export interface TravelBoundaryDataPayload {
  locationName: string;
  travelMode: 'drive' | 'walk' | 'transit';
  timeMinutes: number;
  polygonCoordinates: Array<{ lat: number; lng: number }>;
  center: { lat: number; lng: number };
  summary: string;
}

export interface SiteVisitDataPayload {
  reportId: string;
  locationId?: string;
  locationName: string;
  hasStreetViewCoverage: boolean;
  overallVisualScore: number;
  criteria: VisualCriteriaMap;
  availableImageTypes: SiteVisitImageType[];
  center: { lat: number; lng: number };
  summary: string;
  createdAt: string;
}

export interface DiscoveryDataPayload {
  searchId: string;
  businessType: string;
  region: string;
  candidates: DiscoveryCandidate[];
  summary: string;
  createdAt: string;
}

export interface LocationDataPayload {
  id: string;
  name: string;
  businessType: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  province?: string;
  regency?: string;
  subDistrict?: string;
  postalCode?: string;
  confidence?: number;
  createdAt: string;
}

export interface ChatStreamEvent {
  type: 'status' | 'message' | 'error' | 'done';
  step?: string;
  content?: string;
  discoveryData?: DiscoveryDataPayload;
  heatmapData?: HeatmapDataPayload;
  catchmentData?: CatchmentDataPayload;
  travelBoundaryData?: TravelBoundaryDataPayload;
  siteVisitData?: SiteVisitDataPayload;
  locationData?: LocationDataPayload;
  error?: string;
  timestamp: string;
}

export interface LocationArgs {
  locationNameOrId?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface ResolvedLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  businessType?: string;
  province?: string;
  regency?: string;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly geocodingService: GeocodingService,
    private readonly locationsService: LocationsService,
    private readonly discoveryService: DiscoveryService,
    private readonly discoveryHistoryService: DiscoveryHistoryService,
    private readonly siteVisitService: SiteVisitService,
    private readonly siteVisitHistoryService: SiteVisitHistoryService,
    private readonly catchmentHistoryService: CatchmentHistoryService,
    private readonly heatmapHistoryService: HeatmapHistoryService,
    private readonly vertexAiOrchestratorService: VertexAiOrchestratorService,
  ) {}

  async getHistory(userId: string): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
      take: 100,
    });
  }

  async saveMessage(
    userId: string,
    sender: MessageSender,
    content: string,
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      userId,
      sender,
      content,
    });
    return this.chatMessageRepository.save(message);
  }

  streamChatResponse(userId: string, userMessage: string): Observable<{ data: ChatStreamEvent }> {
    const subject = new Subject<{ data: ChatStreamEvent }>();

    setTimeout(async () => {
      try {
        await this.saveMessage(userId, MessageSender.USER, userMessage);

        const historyMessages = await this.getHistory(userId);
        const chatHistory = historyMessages.map((m) => ({
          sender: m.sender as 'user' | 'assistant',
          content: m.content,
        }));

        const userLocations = await this.locationsService.getUserLocations(userId);

        const result = await this.vertexAiOrchestratorService.processUserMessage(
          userMessage,
          chatHistory,
          userLocations.map((l) => ({ id: l.id, name: l.name })),
          {
            add_business: (args) => this.executeAddBranchSkill(userId, args, subject),
            discover_locations: (args) => this.executeDiscoverySkill(userId, args, subject),
            generate_heatmap: (args) => this.executeHeatmapSkill(userId, args, userLocations, subject),
            catchment_score: (args) => this.executeCatchmentSkill(userId, args, userLocations, subject),
            show_travel_boundary: (args) => this.executeShowTravelBoundarySkill(userId, args, userLocations, subject),
            ai_site_visit: (args) => this.executeSiteVisitSkill(userId, args, userLocations, subject),
          },
          subject,
        );

        await this.saveMessage(userId, MessageSender.ASSISTANT, result.textResponse);

        subject.next({
          data: {
            type: 'message',
            content: result.textResponse,
            discoveryData: result.accumulatedPayloads.discoveryData,
            heatmapData: result.accumulatedPayloads.heatmapData,
            catchmentData: result.accumulatedPayloads.catchmentData,
            travelBoundaryData: result.accumulatedPayloads.travelBoundaryData,
            siteVisitData: result.accumulatedPayloads.siteVisitData,
            locationData: result.accumulatedPayloads.locationData,
            timestamp: new Date().toISOString(),
          },
        });

        subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
        subject.complete();
      } catch (err: any) {
        subject.next({
          data: {
            type: 'error',
            error: err.message || 'An unexpected error occurred while processing your request.',
            timestamp: new Date().toISOString(),
          },
        });
        subject.complete();
      }
    }, 10);

    return subject.asObservable();
  }

  async executeSiteVisitSkill(
    userId: string,
    args: { locationNameOrId?: string; latitude?: number; longitude?: number; address?: string },
    userLocations: any[],
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const matchedLocation = await this.resolveLocationContext(args, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const summary = userLocations.length === 0
        ? "Which location would you like me to inspect? You can specify a saved location name, a candidate spot, a street address, or coordinates."
        : `I couldn't locate "${args.locationNameOrId || args.address || 'that location'}". Your saved locations are: ${availableNames}. Please specify a saved location, candidate spot, or full street address!`;
      return { summary };
    }

    const result = await this.siteVisitService.analyzeSite(
      Number(matchedLocation.latitude),
      Number(matchedLocation.longitude),
      matchedLocation.name,
    );

    const center = { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) };

    // Unlike catchment history, persistence here isn't just for refresh-durability — the images
    // are served by report ID through the proxy endpoint, so a failed save would leave a run with
    // no way to load its imagery. Let a save failure propagate as a real error instead of
    // returning a payload that can't actually render.
    const saved = await this.siteVisitHistoryService.saveRun(userId, {
      locationId: matchedLocation.id,
      locationName: matchedLocation.name,
      latitude: center.lat,
      longitude: center.lng,
      ...result,
    });

    const siteVisitData: SiteVisitDataPayload = {
      reportId: saved.id,
      locationId: matchedLocation.id,
      locationName: matchedLocation.name,
      hasStreetViewCoverage: result.hasStreetViewCoverage,
      overallVisualScore: result.overallVisualScore,
      criteria: result.criteria,
      availableImageTypes: result.availableImageTypes,
      center,
      summary: `AI site visit for ${matchedLocation.name} is ready — see the Site Visit panel on the left.`,
      createdAt: saved.createdAt.toISOString(),
    };

    return siteVisitData;
  }

  async executeCatchmentSkill(
    userId: string,
    args: {
      category?: string;
      locationNameOrId?: string;
      latitude?: number;
      longitude?: number;
      address?: string;
      boundaryType?: 'radius' | 'time';
      radiusKm?: number;
      travelMode?: 'drive' | 'walk' | 'transit';
      timeMinutes?: number;
      ignoreCompetition?: boolean;
      ignoreSaturation?: boolean;
    },
    userLocations: any[],
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const matchedLocation = await this.resolveLocationContext(args, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const summary = userLocations.length === 0
        ? "Which location would you like to analyze for catchment score? You can specify a saved location name, a candidate spot, a street address, or coordinates."
        : `I couldn't locate "${args.locationNameOrId || args.address || 'that location'}". Your saved locations are: ${availableNames}. Please specify a saved location, candidate spot, or full street address!`;
      return { summary };
    }

    // Only default the category from a real saved business match — never from an ad-hoc
    // geocoded address or a candidate-spot pin, both of which carry the generic 'business'
    // placeholder rather than an actual saved business type (same rule as generate_heatmap).
    const isSavedBusiness = Boolean(matchedLocation.id && matchedLocation.businessType && matchedLocation.businessType !== 'business');
    const category = args.category || (isSavedBusiness ? matchedLocation.businessType : undefined);

    if (!category) {
      return {
        summary: `What business category would you like to analyze catchment for at ${matchedLocation.name}? (e.g. coffee shop, book store, pharmacy)`,
      };
    }

    // Defaults to a 10-minute drive isochrone, not a radius — real road-network reachability is
    // the better default; a plain distance circle is only used when the user explicitly asks for
    // one (e.g. "within 2km").
    const boundaryType: 'radius' | 'time' = args.boundaryType || (args.radiusKm !== undefined ? 'radius' : 'time');

    const customWeights: any = {};
    if (args.ignoreCompetition) customWeights.competitionPenalty = 0;
    if (args.ignoreSaturation) customWeights.networkSaturation = 0;

    const result = await this.discoveryService.calculateCatchmentScore({
      lat: Number(matchedLocation.latitude),
      lng: Number(matchedLocation.longitude),
      category,
      locationName: matchedLocation.name,
      regionFilter: matchedLocation.regency || matchedLocation.province,
      boundaryType,
      radiusKm: args.radiusKm,
      travelMode: args.travelMode,
      timeMinutes: args.timeMinutes,
      customWeights,
    });

    const analysisId = `cs-${Date.now().toString(36)}`;
    const createdAt = new Date().toISOString();
    const center = { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) };
    const boundaryLabel = boundaryType === 'time' ? `a ${result.timeMinutes}-minute ${result.travelMode}` : `${result.radiusKm}km`;

    const catchmentData: CatchmentDataPayload = {
      analysisId,
      locationId: matchedLocation.id || 'adhoc-loc',
      locationName: matchedLocation.name,
      category,
      boundaryType,
      radiusKm: result.radiusKm,
      travelMode: result.travelMode,
      timeMinutes: result.timeMinutes,
      polygonCoordinates: result.polygonCoordinates,
      compositeScore: result.compositeScore,
      subScores: result.subScores,
      weights: result.weights,
      poiCount: result.poiCount,
      contributingPois: result.contributingPois,
      explanations: result.explanations,
      center,
      summary: `Catchment analysis for ${category} at ${matchedLocation.name} (within ${boundaryLabel}) is ready — see the panel on the left.`,
      createdAt,
    };

    try {
      await this.catchmentHistoryService.saveRun(userId, {
        locationId: matchedLocation.id,
        locationName: matchedLocation.name,
        category,
        latitude: center.lat,
        longitude: center.lng,
        ...result,
      });
    } catch (err: any) {
      // Persistence failure shouldn't take down an otherwise-successful analysis — the user
      // still gets their result this turn, it just won't survive a refresh.
      console.error('Failed to persist catchment analysis run:', err.message);
    }

    return catchmentData;
  }

  /**
   * Shows only the travel-time boundary shape on the map — no BigQuery POI query, no scoring, no
   * panel/history entry. For when the user just wants to see the shape (e.g. "show me the 10
   * minute drive boundary from my branch"), not a full catchment analysis.
   */
  async executeShowTravelBoundarySkill(
    userId: string,
    args: { locationNameOrId?: string; latitude?: number; longitude?: number; address?: string; travelMode?: 'drive' | 'walk' | 'transit'; timeMinutes?: number },
    userLocations: any[],
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const matchedLocation = await this.resolveLocationContext(args, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const summary = userLocations.length === 0
        ? "Which location would you like to see a travel-time boundary for? You can specify a saved location name, a candidate spot, a street address, or coordinates."
        : `I couldn't locate "${args.locationNameOrId || args.address || 'that location'}". Your saved locations are: ${availableNames}. Please specify a saved location, candidate spot, or full street address!`;
      return { summary };
    }

    const center = { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) };
    const result = await this.discoveryService.generateTravelBoundary({
      lat: center.lat,
      lng: center.lng,
      travelMode: args.travelMode,
      timeMinutes: args.timeMinutes,
    });

    const travelBoundaryData: TravelBoundaryDataPayload = {
      locationName: matchedLocation.name,
      travelMode: result.travelMode,
      timeMinutes: result.timeMinutes,
      polygonCoordinates: result.polygonCoordinates,
      center,
      summary: `Here's the ${result.timeMinutes}-minute ${result.travelMode} boundary around ${matchedLocation.name}.`,
    };

    return travelBoundaryData;
  }

  async executeHeatmapSkill(
    userId: string,
    args: {
      category?: string;
      locationNameOrId?: string;
      latitude?: number;
      longitude?: number;
      radiusKm?: number;
      filters?: Array<{ column: string; operator: string; value: string }>;
    },
    userLocations: any[],
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const matchedLocation = await this.resolveLocationContext(args, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const summary = userLocations.length === 0
        ? "Which location or region would you like to see a heatmap for? You can specify a saved location name, a region/city, or a street address."
        : `I couldn't locate "${args.locationNameOrId || 'that location'}". Your saved locations are: ${availableNames}. Please specify a saved location, region/city, or full street address!`;
      return { summary };
    }

    // Only default the category from a real saved business match — never from an ad-hoc
    // geocoded region/address or a candidate-spot pin, both of which carry the generic
    // 'business' placeholder rather than an actual saved business type.
    const isSavedBusiness = Boolean(matchedLocation.id && matchedLocation.businessType && matchedLocation.businessType !== 'business');
    const category = args.category || (isSavedBusiness ? matchedLocation.businessType : undefined);

    if (!category) {
      return {
        summary: `What category of POI would you like to see a heatmap for near ${matchedLocation.name}? (e.g. school, coffee shop, restaurant, pharmacy)`,
      };
    }

    const radiusKm = Math.min(20, Math.max(0.5, args.radiusKm || 5));
    const center = { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) };

    const result = await this.discoveryService.generateHeatmapDataset({
      category,
      center,
      radiusKm,
      locationName: matchedLocation.name,
      filters: args.filters,
    });

    let saved: { id: string; createdAt: Date };
    try {
      saved = await this.heatmapHistoryService.saveRun(userId, {
        locationId: matchedLocation.id,
        locationName: matchedLocation.name,
        category,
        latitude: center.lat,
        longitude: center.lng,
        radiusKm,
        points: result.points,
        filters: args.filters,
        summary: result.summary,
      });
    } catch (err: any) {
      // Persistence failure shouldn't take down an otherwise-successful heatmap query — the user
      // still gets their result this turn, it just won't survive a refresh.
      console.error('Failed to persist heatmap query run:', err.message);
      saved = { id: `hm-${Date.now().toString(36)}`, createdAt: new Date() };
    }

    const heatmapData: HeatmapDataPayload = {
      queryId: saved.id,
      locationId: matchedLocation.id,
      category,
      locationName: matchedLocation.name,
      radiusKm,
      center,
      pointCount: result.points.length,
      points: result.points,
      summary: result.summary,
      createdAt: saved.createdAt.toISOString(),
    };

    return heatmapData;
  }

  async executeDiscoverySkill(
    userId: string,
    args: { businessType: string; region: string; count?: number },
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const count = args.count || 5;
    const candidates = await this.discoveryService.searchCandidates(
      args.businessType,
      args.region,
      count,
    );

    // Detailed, used only for the DB record — never surfaced in chat text (the candidate list
    // and map pins already show this; the chat reply should just confirm completion).
    const detailedSummary =
      candidates.length === 0
        ? `No strong candidate spots found matching low-competition criteria for ${args.businessType} in ${args.region}. Try broadening the target area.`
        : candidates
            .map(
              (c) =>
                `Spot ${c.rank}: ${c.name} (Score: ${c.demandScore}/100, Latitude: ${c.latitude}, Longitude: ${c.longitude}, Competition: ${c.competitionCount})\n  • Rationale: ${c.rationale}`,
            )
            .join('\n\n');

    const chatSummary =
      candidates.length === 0
        ? `No strong candidate spots found for ${args.businessType} in ${args.region}. Try broadening the target area.`
        : `Found ${candidates.length} candidate spot${candidates.length === 1 ? '' : 's'} for ${args.businessType} in ${args.region} — see the panel on the left.`;

    let saved: { id: string; createdAt: Date };
    try {
      saved = await this.discoveryHistoryService.saveRun(userId, {
        businessType: args.businessType,
        region: args.region,
        candidates,
        summary: detailedSummary,
      });
    } catch (err: any) {
      // Persistence failure shouldn't take down an otherwise-successful search — the user still
      // gets their results this turn, it just won't survive a refresh.
      console.error('Failed to persist discovery search run:', err.message);
      saved = { id: `ds-${Date.now().toString(36)}`, createdAt: new Date() };
    }

    const discoveryData: DiscoveryDataPayload = {
      searchId: saved.id,
      businessType: args.businessType,
      region: args.region,
      candidates,
      summary: chatSummary,
      createdAt: saved.createdAt.toISOString(),
    };

    return discoveryData;
  }

  async executeAddBranchSkill(
    userId: string,
    args: { businessName: string; businessType: string; address: string },
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const geocodedCandidates = await this.geocodingService.geocodeAddress(args.address);
    if (geocodedCandidates.length === 0) {
      return {
        summary: `Couldn't find coordinates for "${args.address}". Could you double check the spelling or provide a nearby landmark?`,
      };
    }
    
    const primaryGeocode = geocodedCandidates[0];
    const newLocation = await this.locationsService.createLocation(userId, {
      name: args.businessName,
      businessType: args.businessType,
      fullAddress: primaryGeocode.formattedAddress,
      latitude: primaryGeocode.latitude,
      longitude: primaryGeocode.longitude,
      confidence: primaryGeocode.confidence,
      province: primaryGeocode.province,
      regency: primaryGeocode.regency,
      subDistrict: primaryGeocode.subDistrict,
      postalCode: primaryGeocode.postalCode
    });

    return {
      location: newLocation,
      summary: `Successfully registered business branch "${newLocation.name}" (${newLocation.businessType}) at ${newLocation.fullAddress}. A new location pin has been added to your map!`,
    };
  }

  private async resolveLocationContext(
    args: LocationArgs,
    userLocations: any[],
  ): Promise<ResolvedLocation | null> {
    // a. Direct latitude & longitude provided (e.g. candidate spot coordinates from previous turn)
    if (args.latitude !== undefined && args.longitude !== undefined) {
      return {
        name: args.locationNameOrId || `Site (${Number(args.latitude).toFixed(4)}, ${Number(args.longitude).toFixed(4)})`,
        latitude: Number(args.latitude),
        longitude: Number(args.longitude),
        businessType: 'business',
      };
    }

    // b. locationNameOrId provided -> resolve against saved userLocations
    if (args.locationNameOrId) {
      const target = args.locationNameOrId.toLowerCase();
      if (userLocations && userLocations.length > 0) {
        const byId = userLocations.find((l) => l.id === args.locationNameOrId);
        if (byId) {
          return {
            id: byId.id,
            name: byId.name,
            latitude: Number(byId.latitude),
            longitude: Number(byId.longitude),
            businessType: byId.businessType,
            province: byId.province,
            regency: byId.regency,
          };
        }

        const byName = userLocations.find(
          (l) =>
            l.name &&
            (l.name.toLowerCase() === target ||
              target.includes(l.name.toLowerCase()) ||
              l.name.toLowerCase().includes(target)),
        );
        if (byName) {
          return {
            id: byName.id,
            name: byName.name,
            latitude: Number(byName.latitude),
            longitude: Number(byName.longitude),
            businessType: byName.businessType,
            province: byName.province,
            regency: byName.regency,
          };
        }
      }
    }

    // c. Freeform address provided -> geocode on the fly without saving
    const addressToGeocode = args.address || (args.locationNameOrId && !args.latitude ? args.locationNameOrId : null);
    if (addressToGeocode) {
      const geocoded = await this.geocodingService.geocodeAddress(addressToGeocode);
      if (geocoded && geocoded.length > 0) {
        const first = geocoded[0];
        return {
          name: first.formattedAddress,
          latitude: Number(first.latitude),
          longitude: Number(first.longitude),
          businessType: 'business',
          province: first.province,
          regency: first.regency,
        };
      }
    }

    // d. If none resolve, return null (triggers clarifying question)
    return null;
  }
}
