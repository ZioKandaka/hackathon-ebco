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

        const plannedTools = this.orchestratorService.planExecution(userMessage);

        if (plannedTools.length > 1) {
          subject.next({
            data: {
              type: 'status',
              step: `Orchestrating AI tools (${plannedTools.join(' → ')})...`,
              timestamp: new Date().toISOString(),
            },
          });

          await new Promise((resolve) => setTimeout(resolve, 300));

          const result = await this.orchestratorService.executeChain(
            userId,
            userMessage,
            plannedTools,
            subject,
          );

          await this.saveMessage(userId, MessageSender.ASSISTANT, result.summary);

          subject.next({
            data: {
              type: 'message',
              content: result.summary,
              candidates: result.payload.candidates,
              heatmapData: result.payload.heatmapData,
              catchmentData: result.payload.catchmentData,
              accessibilityData: result.payload.accessibilityData,
              siteVisitData: result.payload.siteVisitData,
              timestamp: new Date().toISOString(),
            },
          });

          subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
          subject.complete();
          return;
        }

        const lowerMsg = userMessage.toLowerCase();
        const isSiteVisitIntent =
          lowerMsg.includes('site visit') ||
          lowerMsg.includes('visual check') ||
          lowerMsg.includes('visual assessment') ||
          lowerMsg.includes('what does spot') ||
          lowerMsg.includes('look like') ||
          lowerMsg.includes('street view');

        const isAccessibilityIntent =
          !isSiteVisitIntent &&
          (lowerMsg.includes('accessible') ||
          lowerMsg.includes('accessibility') ||
          lowerMsg.includes('isochrone') ||
          lowerMsg.includes('travel time') ||
          lowerMsg.includes('drive time') ||
          lowerMsg.includes('walk time') ||
          lowerMsg.includes('transit time') ||
          lowerMsg.includes('minute drive') ||
          lowerMsg.includes('minute walk') ||
          lowerMsg.includes('minute transit'));

        const isCatchmentIntent =
          !isSiteVisitIntent &&
          !isAccessibilityIntent &&
          (lowerMsg.includes('catchment') ||
          lowerMsg.includes('catchment score') ||
          lowerMsg.includes('analyze catchment') ||
          lowerMsg.includes('catchment analysis') ||
          lowerMsg.includes('catchment for'));

        const isHeatmapIntent =
          !isSiteVisitIntent &&
          !isAccessibilityIntent &&
          !isCatchmentIntent &&
          (lowerMsg.includes('heatmap') ||
          lowerMsg.includes('heat map') ||
          lowerMsg.includes('density map') ||
          lowerMsg.includes('density heatmap'));

        const isDiscoveryIntent =
          !isSiteVisitIntent &&
          !isAccessibilityIntent &&
          !isCatchmentIntent &&
          !isHeatmapIntent &&
          (lowerMsg.includes('find') ||
          lowerMsg.includes('discover') ||
          lowerMsg.includes('where') ||
          lowerMsg.includes('spots') ||
          lowerMsg.includes('spot') ||
          lowerMsg.includes('candidate'));

        const isAddBranchIntent =
          !isSiteVisitIntent &&
          !isAccessibilityIntent &&
          !isCatchmentIntent &&
          !isHeatmapIntent &&
          !isDiscoveryIntent &&
          (lowerMsg.includes('add') ||
            lowerMsg.includes('create') ||
            lowerMsg.includes('branch') ||
            lowerMsg.includes('register'));

        if (isSiteVisitIntent) {
          await this.executeSiteVisitSkill(userId, userMessage, subject);
        } else if (isAccessibilityIntent) {
          await this.executeAccessibilitySkill(userId, userMessage, subject);
        } else if (isCatchmentIntent) {
          await this.executeCatchmentSkill(userId, userMessage, subject);
        } else if (isHeatmapIntent) {
          await this.executeHeatmapSkill(userId, userMessage, subject);
        } else if (isDiscoveryIntent) {
          await this.executeDiscoverySkill(userId, userMessage, subject);
        } else if (isAddBranchIntent) {
          await this.executeAddBranchSkill(userId, userMessage, subject);
        } else {
          await this.executeGeneralChatResponse(userId, userMessage, subject);
        }
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

  private async executeSiteVisitSkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (AI Site Visit)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 400));

    const userLocations = await this.locationsService.getUserLocations(userId);

    if (userLocations.length === 0) {
      userLocations.push({
        id: 'demo-loc-1',
        userId,
        name: 'Sudirman Branch',
        businessType: 'coffee_shop',
        fullAddress: 'Jl. Jend. Sudirman No. 45, Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    const matchedLocation = this.findMatchingLocation(userMessage, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const notFoundMsg = `I couldn't find a matching location for the site visit. Your saved locations are: ${availableNames}.`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, notFoundMsg);
      subject.next({
        data: {
          type: 'message',
          content: notFoundMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    subject.next({
      data: {
        type: 'status',
        step: 'Fetching street-level imagery and satellite snapshot...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    subject.next({
      data: {
        type: 'status',
        step: 'Analyzing the site visually with multimodal vision AI...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await this.siteVisitService.analyzeSite(
      Number(matchedLocation.latitude),
      Number(matchedLocation.longitude),
      matchedLocation.name,
    );

    const visitId = `sv-${Date.now().toString(36)}`;
    await this.saveMessage(userId, MessageSender.ASSISTANT, result.summary);

    subject.next({
      data: {
        type: 'message',
        content: result.summary,
        siteVisitData: {
          visitId,
          locationName: matchedLocation.name,
          hasStreetViewCoverage: result.hasStreetViewCoverage,
          overallVisualScore: result.overallVisualScore,
          images: result.images,
          criteria: result.criteria as any,
          center: { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) },
          summary: result.summary,
        },
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private async executeAccessibilitySkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Accessibility Analysis)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 400));

    const travelMode = this.extractTravelMode(userMessage);
    const timeMinutes = this.extractTimeMinutes(userMessage);

    const userLocations = await this.locationsService.getUserLocations(userId);

    if (userLocations.length === 0) {
      userLocations.push({
        id: 'demo-loc-1',
        userId,
        name: 'Sudirman Branch',
        businessType: 'coffee_shop',
        fullAddress: 'Jl. Jend. Sudirman No. 45, Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    const matchedLocation = this.findMatchingLocation(userMessage, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const notFoundMsg = `I couldn't find a matching registered location for accessibility check. Your available saved locations are: ${availableNames}.`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, notFoundMsg);
      subject.next({
        data: {
          type: 'message',
          content: notFoundMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    subject.next({
      data: {
        type: 'status',
        step: `Calculating ${timeMinutes}-minute ${travelMode} travel-time boundary...`,
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    subject.next({
      data: {
        type: 'status',
        step: 'Analyzing reachable area POI density...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

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
    await this.saveMessage(userId, MessageSender.ASSISTANT, result.summary);

    subject.next({
      data: {
        type: 'message',
        content: result.summary,
        accessibilityData: {
          analysisId,
          locationId: matchedLocation.id,
          locationName: matchedLocation.name,
          travelMode,
          timeMinutes,
          compositeScore: result.compositeScore,
          subScores: result.subScores,
          poiCount: result.poiCount,
          polygonCoordinates: result.polygonCoordinates,
          radiusScoreDelta: previousRadiusScore !== undefined ? result.compositeScore - previousRadiusScore : undefined,
          summary: result.summary,
        },
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private extractTravelMode(msg: string): 'drive' | 'walk' | 'transit' {
    const lower = msg.toLowerCase();
    if (lower.includes('walk') || lower.includes('walking') || lower.includes('foot')) return 'walk';
    if (lower.includes('transit') || lower.includes('bus') || lower.includes('train') || lower.includes('public transit')) return 'transit';
    return 'drive';
  }

  private extractTimeMinutes(msg: string): number {
    const match = msg.match(/(\d+)\s*(?:min|minute|minutes|mins)\b/i);
    if (match && match[1]) {
      return Math.min(30, Math.max(1, parseInt(match[1], 10)));
    }
    return 10;
  }

  private async executeCatchmentSkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Catchment Score)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 400));

    const radiusKm = this.extractRadiusFromMessage(userMessage);
    const userLocations = await this.locationsService.getUserLocations(userId);

    if (userLocations.length === 0) {
      userLocations.push({
        id: 'demo-loc-1',
        userId,
        name: 'Sudirman Branch',
        businessType: 'coffee_shop',
        fullAddress: 'Jl. Jend. Sudirman No. 45, Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
        confidence: 1.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
    }

    const matchedLocation = this.findMatchingLocation(userMessage, userLocations);

    if (!matchedLocation) {
      const availableNames = userLocations.map((l) => l.name).join(', ');
      const notFoundMsg = `I couldn't find a matching registered location. Your available saved locations are: ${availableNames}.\n\nPlease mention one of these location names!`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, notFoundMsg);
      subject.next({
        data: {
          type: 'message',
          content: notFoundMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    subject.next({
      data: {
        type: 'status',
        step: `Gathering nearby location data within ${radiusKm}km...`,
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    subject.next({
      data: {
        type: 'status',
        step: 'Calculating catchment score...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const customWeights = this.extractCustomWeights(userMessage);

    const result = await this.discoveryService.calculateCatchmentScore({
      lat: Number(matchedLocation.latitude),
      lng: Number(matchedLocation.longitude),
      radiusKm,
      businessType: matchedLocation.businessType,
      locationName: matchedLocation.name,
      customWeights,
    });

    const analysisId = `cs-${Date.now().toString(36)}`;
    await this.saveMessage(userId, MessageSender.ASSISTANT, result.summary);

    subject.next({
      data: {
        type: 'message',
        content: result.summary,
        catchmentData: {
          analysisId,
          locationId: matchedLocation.id,
          locationName: matchedLocation.name,
          radiusKm,
          compositeScore: result.compositeScore,
          subScores: result.subScores,
          poiCount: result.poiCount,
          center: { lat: Number(matchedLocation.latitude), lng: Number(matchedLocation.longitude) },
          summary: result.summary,
        },
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private extractRadiusFromMessage(msg: string): number {
    const match = msg.match(/(?:within|radius|distance|radius\s+of)\s*(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers)/i);
    if (match && match[1]) {
      return Math.min(10.0, Math.max(0.1, parseFloat(match[1])));
    }
    const simpleKmMatch = msg.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometer|kilometers)/i);
    if (simpleKmMatch && simpleKmMatch[1]) {
      return Math.min(10.0, Math.max(0.1, parseFloat(simpleKmMatch[1])));
    }
    return 2.0;
  }

  private findMatchingLocation(msg: string, locations: any[]): any | null {
    if (locations.length === 0) return null;
    const lower = msg.toLowerCase();

    for (const loc of locations) {
      if (loc.name && lower.includes(loc.name.toLowerCase())) {
        return loc;
      }
    }

    if (lower.includes('sudirman') || lower.includes('branch')) {
      const sudirmanLoc = locations.find((l) => l.name && l.name.toLowerCase().includes('sudirman'));
      if (sudirmanLoc) return sudirmanLoc;
    }

    return locations[0];
  }

  private extractCustomWeights(msg: string): Partial<Record<keyof CatchmentSubScores, number>> | undefined {
    const lower = msg.toLowerCase();
    const weights: Partial<Record<keyof CatchmentSubScores, number>> = {};
    let hasCustom = false;

    if (lower.includes('ignore competition') || lower.includes('no competition')) {
      weights.competitionPenalty = 0;
      hasCustom = true;
    }
    if (lower.includes('ignore saturation') || lower.includes('no saturation')) {
      weights.networkSaturation = 0;
      hasCustom = true;
    }
    return hasCustom ? weights : undefined;
  }

  private async executeHeatmapSkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Heatmap Visualization)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 400));

    const region = this.extractRegionFromMessage(userMessage);

    if (!region || userMessage.trim().length < 8) {
      const promptQuestion =
        "I'd be happy to show you a heatmap! Which region or city (e.g. Kediri, Bandung, Jakarta) and business or category are you interested in?";
      await this.saveMessage(userId, MessageSender.ASSISTANT, promptQuestion);
      subject.next({
        data: {
          type: 'message',
          content: promptQuestion,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    subject.next({
      data: {
        type: 'status',
        step: `Aggregating BigQuery POI location data for ${region}...`,
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    subject.next({
      data: {
        type: 'status',
        step: 'Rendering weighted heatmap layer...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const maxRating = this.extractMaxRating(userMessage);
    const customCategory = this.extractCustomCategory(userMessage);
    const businessType = this.extractBusinessType(userMessage) || undefined;

    const mode = maxRating !== undefined || customCategory ? 'custom_prompt' : 'business_based';

    const result = await this.discoveryService.generateHeatmapDataset({
      mode,
      businessType,
      region,
      customCategory,
      maxRating,
    });

    if (result.points.length === 0) {
      const emptyMsg = `No POI data points found matching criteria in ${region}. Try broadening your filter or selecting a different area.`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, emptyMsg);
      subject.next({
        data: {
          type: 'message',
          content: emptyMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    const queryId = `hm-${Date.now().toString(36)}`;
    await this.saveMessage(userId, MessageSender.ASSISTANT, result.summary);

    subject.next({
      data: {
        type: 'message',
        content: result.summary,
        heatmapData: {
          queryId,
          mode,
          businessType,
          region,
          pointCount: result.points.length,
          points: result.points,
          summary: result.summary,
        },
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private extractMaxRating(msg: string): number | undefined {
    const match = msg.match(/rating\s+(?:below|under|less\s+than|<)\s*(\d+(?:\.\d+)?)/i);
    if (match && match[1]) {
      return parseFloat(match[1]);
    }
    return undefined;
  }

  private extractCustomCategory(msg: string): string | undefined {
    const lower = msg.toLowerCase();
    if (lower.includes('preschool') || lower.includes('paud') || lower.includes('tk')) return 'preschool';
    if (lower.includes('high school') || lower.includes('highschool') || lower.includes('sma') || lower.includes('smk')) return 'high_school';
    if (lower.includes('school') || lower.includes('sekolah')) return 'school';
    if (lower.includes('university') || lower.includes('college') || lower.includes('kampus')) return 'university';
    if (lower.includes('hospital') || lower.includes('rumah sakit') || lower.includes('clinic')) return 'hospital';
    if (lower.includes('park') || lower.includes('taman')) return 'park';
    if (lower.includes('restaurant') || lower.includes('cafe') || lower.includes('kuliner')) return 'restaurant';
    return undefined;
  }

  private async executeDiscoverySkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    // Event 1: Status update
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Location Discovery)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const region = this.extractRegionFromMessage(userMessage);
    const businessType = this.extractBusinessType(userMessage);

    if (!region || userMessage.trim().length < 10) {
      const promptQuestion =
        "I'd love to help you discover location candidates! Which business type (e.g. coffee shop, minimarket) and region or city are you looking in?";
      await this.saveMessage(userId, MessageSender.ASSISTANT, promptQuestion);
      subject.next({
        data: {
          type: 'message',
          content: promptQuestion,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    // Event 2: Query BigQuery POIs
    subject.next({
      data: {
        type: 'status',
        step: `Querying BigQuery POI datasets for ${region}...`,
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Event 3: Score and rank
    subject.next({
      data: {
        type: 'status',
        step: 'Ranking top candidate spots by demand density & competition...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    const candidates = await this.discoveryService.searchCandidates(
      businessType || 'business',
      region,
      5,
    );

    const formattedList = candidates
      .map(
        (c) =>
          `Spot ${c.rank}: ${c.name} (Score: ${c.demandScore}/100)\n  • ${c.rationale}`,
      )
      .join('\n\n');

    const resultMessage = `Here are the top candidate spots for ${businessType || 'business'} in ${region}:\n\n${formattedList}\n\nPins have been rendered on your map. Click any pin to inspect details.`;

    await this.saveMessage(userId, MessageSender.ASSISTANT, resultMessage);

    subject.next({
      data: {
        type: 'message',
        content: resultMessage,
        candidates: candidates.map((c) => ({
          rank: c.rank,
          name: c.name,
          latitude: c.latitude,
          longitude: c.longitude,
          demandScore: c.demandScore,
          competitionCount: c.competitionCount,
          rationale: c.rationale,
          regencyCode: c.regencyCode,
        })),
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private async executeAddBranchSkill(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Determining the right action (Add Business/Branch)...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const address = this.extractAddress(userMessage);
    const businessName = this.extractBusinessName(userMessage);
    const businessType = this.extractBusinessType(userMessage);

    if (!businessName || !businessType) {
      const promptQuestion =
        'I see you want to add a location! Could you please specify the business name and type (e.g. coffee shop, retail, restaurant)?';
      await this.saveMessage(userId, MessageSender.ASSISTANT, promptQuestion);
      subject.next({
        data: {
          type: 'message',
          content: promptQuestion,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    subject.next({
      data: {
        type: 'status',
        step: 'Looking up address via Google Geocoding API...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    const geocodedCandidates = await this.geocodingService.geocodeAddress(address);

    if (geocodedCandidates.length === 0) {
      const errorMsg = `Couldn't find coordinates for "${address}". Could you double check the spelling or provide a nearby landmark?`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, errorMsg);
      subject.next({
        data: {
          type: 'message',
          content: errorMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    if (geocodedCandidates.length > 1) {
      const candidateList = geocodedCandidates
        .slice(0, 3)
        .map((c, i) => `${i + 1}. ${c.formattedAddress}`)
        .join('\n');
      const ambiguityMsg = `I found multiple matching addresses for "${address}":\n${candidateList}\n\nPlease type the number or address of the correct option.`;
      await this.saveMessage(userId, MessageSender.ASSISTANT, ambiguityMsg);
      subject.next({
        data: {
          type: 'message',
          content: ambiguityMsg,
          timestamp: new Date().toISOString(),
        },
      });
      subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
      subject.complete();
      return;
    }

    const primaryGeocode = geocodedCandidates[0];

    subject.next({
      data: {
        type: 'status',
        step: 'Creating your new branch location record...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const existingDuplicate = await this.locationsService.findDuplicateLocation(
      userId,
      primaryGeocode.formattedAddress,
    );

    const newLocation = await this.locationsService.createLocation(userId, {
      name: businessName,
      businessType,
      fullAddress: primaryGeocode.formattedAddress,
      latitude: primaryGeocode.latitude,
      longitude: primaryGeocode.longitude,
      province: primaryGeocode.province,
      regency: primaryGeocode.regency,
      subDistrict: primaryGeocode.subDistrict,
      postalCode: primaryGeocode.postalCode,
      confidence: primaryGeocode.confidence,
    });

    let confirmationText = `Successfully registered "${newLocation.name}" (${newLocation.businessType}) at ${newLocation.fullAddress}. A new location pin has been added to your map!`;

    if (existingDuplicate) {
      confirmationText += ` (Note: A similar address "${existingDuplicate.fullAddress}" was already in your locations).`;
    }

    await this.saveMessage(userId, MessageSender.ASSISTANT, confirmationText);

    subject.next({
      data: {
        type: 'message',
        content: confirmationText,
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private async executeGeneralChatResponse(
    userId: string,
    userMessage: string,
    subject: Subject<{ data: ChatStreamEvent }>,
  ): Promise<void> {
    subject.next({
      data: {
        type: 'status',
        step: 'Understanding your request...',
        timestamp: new Date().toISOString(),
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const responseText = `I am your Location Intelligence assistant. You can ask me to "Find me the top 5 spots for a coffee shop in Kediri" or "Add a new branch at [address]".`;

    await this.saveMessage(userId, MessageSender.ASSISTANT, responseText);

    subject.next({
      data: {
        type: 'message',
        content: responseText,
        timestamp: new Date().toISOString(),
      },
    });

    subject.next({ data: { type: 'done', timestamp: new Date().toISOString() } });
    subject.complete();
  }

  private extractRegionFromMessage(msg: string): string {
    const inMatch = msg.match(/in\s+([A-Za-z0-9\s]+?)(?=\s*$|\s+called|\s+with)/i);
    if (inMatch && inMatch[1]) {
      return inMatch[1].trim();
    }
    const nearMatch = msg.match(/near\s+([A-Za-z0-9\s]+?)(?=\s*$|\s+called|\s+with)/i);
    if (nearMatch && nearMatch[1]) {
      return nearMatch[1].trim();
    }
    if (msg.toLowerCase().includes('kediri')) return 'Kediri';
    if (msg.toLowerCase().includes('bandung')) return 'Bandung';
    if (msg.toLowerCase().includes('bekasi')) return 'Bekasi';
    if (msg.toLowerCase().includes('jakarta')) return 'Jakarta';
    return 'Kediri';
  }

  private extractAddress(msg: string): string {
    const atMatch = msg.match(/at\s+([^,]+(?:,[^,]+)*?)(?=\s+called|\s+it's|\s*$)/i);
    if (atMatch && atMatch[1]) {
      return atMatch[1].trim();
    }
    const onMatch = msg.match(/on\s+([^,]+(?:,[^,]+)*?)(?=\s+called|\s+it's|\s*$)/i);
    if (onMatch && onMatch[1]) {
      return onMatch[1].trim();
    }
    return msg;
  }

  private extractBusinessName(msg: string): string | null {
    const calledMatch = msg.match(/called\s+([A-Za-z0-9\s]+?)(?=\s+it's|\s+at|\s*$)/i);
    if (calledMatch && calledMatch[1]) {
      return calledMatch[1].trim();
    }
    const myMatch = msg.match(/my\s+([A-Za-z0-9\s]+?)\s+(?:branch|shop|store|location)/i);
    if (myMatch && myMatch[1]) {
      return myMatch[1].trim();
    }
    return 'My Branch';
  }

  private extractBusinessType(msg: string): string | null {
    if (msg.toLowerCase().includes('coffee')) return 'coffee_shop';
    if (msg.toLowerCase().includes('minimarket') || msg.toLowerCase().includes('retail')) return 'retail';
    if (msg.toLowerCase().includes('restaurant') || msg.toLowerCase().includes('food')) return 'restaurant';
    if (msg.toLowerCase().includes('bank')) return 'bank';
    return 'business';
  }
}
