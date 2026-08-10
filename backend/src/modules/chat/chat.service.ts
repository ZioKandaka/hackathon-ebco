import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Observable, Subject } from 'rxjs';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { SiteVisitService } from '../discovery/services/site-visit.service';
import { OrchestratorService } from './orchestrator.service';
import { VertexAiOrchestratorService } from './vertexai-orchestrator.service';

export interface HeatmapPoint {
  lat: number;
  lng: number;
  weight: number;
}

export interface HeatmapDataPayload {
  queryId: string;
  mode: 'business_based' | 'custom_prompt';
  businessType?: string;
  region: string;
  pointCount: number;
  points: HeatmapPoint[];
  summary: string;
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
  radiusKm: number;
  compositeScore: number;
  subScores: CatchmentSubScores;
  poiCount: number;
  center: { lat: number; lng: number };
  summary: string;
}

export interface AccessibilityDataPayload {
  analysisId: string;
  locationId: string;
  locationName: string;
  travelMode: 'drive' | 'walk' | 'transit';
  timeMinutes: number;
  compositeScore: number;
  subScores: CatchmentSubScores;
  poiCount: number;
  polygonCoordinates: Array<{ lat: number; lng: number }>;
  radiusScoreDelta?: number;
  summary: string;
}

export interface SiteVisitDataPayload {
  visitId: string;
  locationName: string;
  hasStreetViewCoverage: boolean;
  overallVisualScore: number;
  images: {
    hasStreetViewCoverage: boolean;
    streetViewNorthUrl?: string;
    streetViewEastUrl?: string;
    streetViewSouthUrl?: string;
    streetViewWestUrl?: string;
    satelliteUrl: string;
  };
  criteria: Record<string, { score: number; justification: string }>;
  center: { lat: number; lng: number };
  summary: string;
}

export interface ChatStreamEvent {
  type: 'status' | 'message' | 'error' | 'done';
  step?: string;
  content?: string;
  candidates?: any[];
  heatmapData?: HeatmapDataPayload;
  catchmentData?: CatchmentDataPayload;
  accessibilityData?: AccessibilityDataPayload;
  siteVisitData?: SiteVisitDataPayload;
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
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    private readonly geocodingService: GeocodingService,
    private readonly locationsService: LocationsService,
    private readonly discoveryService: DiscoveryService,
    private readonly siteVisitService: SiteVisitService,
    private readonly orchestratorService: OrchestratorService,
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
            generate_heatmap: (args) => this.executeHeatmapSkill(userId, args, subject),
            catchment_score: (args) => this.executeCatchmentSkill(userId, args, userLocations, subject),
            accessibility_analysis: (args) => this.executeAccessibilitySkill(userId, args, userLocations, subject),
            ai_site_visit: (args) => this.executeSiteVisitSkill(userId, args, userLocations, subject),
          },
          subject,
        );

        await this.saveMessage(userId, MessageSender.ASSISTANT, result.textResponse);

        subject.next({
          data: {
            type: 'message',
            content: result.textResponse,
            candidates: result.accumulatedPayloads.candidates,
            heatmapData: result.accumulatedPayloads.heatmapData,
            catchmentData: result.accumulatedPayloads.catchmentData,
            accessibilityData: result.accumulatedPayloads.accessibilityData,
            siteVisitData: result.accumulatedPayloads.siteVisitData,
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

    const visitId = `sv-${Date.now().toString(36)}`;
    const siteVisitData: SiteVisitDataPayload = {
      visitId,
      locationName: matchedLocation.name,
      hasStreetViewCoverage: result.hasStreetViewCoverage,
      overallVisualScore: result.overallVisualScore,
      images: result.images,
      criteria: result.criteria as any,
      center: { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) },
      summary: result.summary,
    };

    return siteVisitData;
  }

  async executeAccessibilitySkill(
    userId: string,
    args: { locationNameOrId?: string; latitude?: number; longitude?: number; address?: string; travelMode?: 'drive' | 'walk' | 'transit'; timeMinutes?: number },
    userLocations: any[],
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const matchedLocation = await this.resolveLocationContext(args, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const summary = userLocations.length === 0
        ? "Which location would you like to analyze for accessibility? You can specify a saved location name, a candidate spot, a street address, or coordinates."
        : `I couldn't locate "${args.locationNameOrId || args.address || 'that location'}". Your saved locations are: ${availableNames}. Please specify a saved location, candidate spot, or full street address!`;
      return { summary };
    }

    const travelMode = args.travelMode || 'drive';
    const timeMinutes = args.timeMinutes || 10;

    const history = await this.getHistory(userId);
    let previousRadiusScore: number | undefined = undefined;
    for (const msg of history) {
      if (msg.sender === MessageSender.ASSISTANT && msg.content.includes('Overall Composite Score:')) {
        const scoreMatch = msg.content.match(/Overall Composite Score:\s*(\d+)/i);
        if (scoreMatch && scoreMatch[1]) {
          previousRadiusScore = parseInt(scoreMatch[1], 10);
        }
      }
    }

    const result = await this.discoveryService.calculateAccessibilityScore({
      lat: Number(matchedLocation.latitude),
      lng: Number(matchedLocation.longitude),
      travelMode,
      timeMinutes,
      businessType: matchedLocation.businessType,
      locationName: matchedLocation.name,
      previousRadiusScore,
    });

    const analysisId = `acc-${Date.now().toString(36)}`;
    const accessibilityData: AccessibilityDataPayload = {
      analysisId,
      locationId: matchedLocation.id || 'adhoc-loc',
      locationName: matchedLocation.name,
      travelMode,
      timeMinutes,
      compositeScore: result.compositeScore,
      subScores: result.subScores,
      poiCount: result.poiCount,
      polygonCoordinates: result.polygonCoordinates,
      radiusScoreDelta: previousRadiusScore !== undefined ? result.compositeScore - previousRadiusScore : undefined,
      summary: result.summary,
    };

    return accessibilityData;
  }

  async executeCatchmentSkill(
    userId: string,
    args: { locationNameOrId?: string; latitude?: number; longitude?: number; address?: string; radiusKm?: number; ignoreCompetition?: boolean; ignoreSaturation?: boolean },
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

    const radiusKm = args.radiusKm || 2.0;
    const customWeights: any = {};
    if (args.ignoreCompetition) customWeights.competitionPenalty = 0;
    if (args.ignoreSaturation) customWeights.networkSaturation = 0;

    const result = await this.discoveryService.calculateCatchmentScore({
      lat: Number(matchedLocation.latitude),
      lng: Number(matchedLocation.longitude),
      radiusKm,
      businessType: matchedLocation.businessType,
      locationName: matchedLocation.name,
      customWeights,
    });

    const analysisId = `cs-${Date.now().toString(36)}`;
    const catchmentData: CatchmentDataPayload = {
      analysisId,
      locationId: matchedLocation.id || 'adhoc-loc',
      locationName: matchedLocation.name,
      radiusKm,
      compositeScore: result.compositeScore,
      subScores: result.subScores,
      poiCount: result.poiCount,
      center: { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) },
      summary: result.summary,
    };

    return catchmentData;
  }

  async executeHeatmapSkill(
    userId: string,
    args: { region: string; businessType?: string; customCategory?: string; maxRating?: number },
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<any> {
    const mode = args.customCategory || args.maxRating ? 'custom_prompt' : 'business_based';

    const result = await this.discoveryService.generateHeatmapDataset({
      mode,
      businessType: args.businessType,
      region: args.region,
      customCategory: args.customCategory,
      maxRating: args.maxRating,
    });

    const queryId = `hm-${Date.now().toString(36)}`;
    const heatmapData: HeatmapDataPayload = {
      queryId,
      mode,
      businessType: args.businessType,
      region: args.region,
      pointCount: result.points.length,
      points: result.points,
      summary: result.summary,
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

    if (candidates.length === 0) {
      return {
        candidates: [],
        summary: `No strong candidate spots found matching low-competition criteria for ${args.businessType} in ${args.region}. Try broadening the target area.`,
      };
    }

    const formattedList = candidates
      .map(
        (c) =>
          `Spot ${c.rank}: ${c.name} (Score: ${c.demandScore}/100, Latitude: ${c.latitude}, Longitude: ${c.longitude}, Competition: ${c.competitionCount})\n  • Rationale: ${c.rationale}`,
      )
      .join('\n\n');

    const resultMessage = `Here are the top candidate spots for ${args.businessType} in ${args.region}:\n\n${formattedList}\n\nPins have been rendered on your map. Click any pin to inspect details.`;

    return {
      candidates,
      summary: resultMessage,
    };
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
        };
      }
    }

    // d. If none resolve, return null (triggers clarifying question)
    return null;
  }
}
