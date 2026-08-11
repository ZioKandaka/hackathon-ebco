import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { SiteVisitService } from '../discovery/services/site-visit.service';
import { OrchestratorService } from './orchestrator.service';
import { VertexAiOrchestratorService } from './vertexai-orchestrator.service';
import { CatchmentHistoryService } from '../discovery/services/catchment-history.service';

describe('ChatService', () => {
  let service: ChatService;
  let mockRepository: any;
  let mockGeocodingService: any;
  let mockLocationsService: any;
  let mockDiscoveryService: any;
  let mockSiteVisitService: any;
  let mockOrchestratorService: any;
  let mockVertexAiOrchestratorService: any;
  let mockCatchmentHistoryService: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'msg-uuid-1', ...entity, createdAt: new Date() }),
      ),
    };

    mockGeocodingService = {
      geocodeAddress: jest.fn().mockResolvedValue([
        {
          formattedAddress: 'Jl. Sudirman No. 10, Jakarta',
          latitude: -6.2088,
          longitude: 106.8456,
          confidence: 1.0,
        },
      ]),
    };

    mockLocationsService = {
      getUserLocations: jest.fn().mockResolvedValue([
        {
          id: 'loc-123',
          name: 'Sudirman Branch',
          businessType: 'coffee_shop',
          fullAddress: 'Jl. Sudirman No. 10, Jakarta',
          latitude: -6.2088,
          longitude: 106.8456,
          province: 'DKI Jakarta',
          regency: 'Kota Jakarta Selatan',
        },
      ]),
      findDuplicateLocation: jest.fn().mockResolvedValue(null),
      createLocation: jest.fn().mockResolvedValue({
        id: 'loc-123',
        name: 'Sudirman Coffee',
        businessType: 'coffee_shop',
        fullAddress: 'Jl. Sudirman No. 10, Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
      }),
    };

    mockDiscoveryService = {
      searchCandidates: jest.fn().mockResolvedValue([
        {
          rank: 1,
          name: 'Kediri Center Spot',
          latitude: -7.8167,
          longitude: 112.0117,
          demandScore: 88,
          competitionCount: 0,
          rationale: 'High demand density',
        },
      ]),
      generateHeatmapDataset: jest.fn().mockResolvedValue({
        points: [
          { lat: -7.8167, lng: 112.0117, weight: 8.5 },
          { lat: -7.8200, lng: 112.0150, weight: 6.2 },
        ],
        summary: 'Darker red areas indicate high minimarket demand density in Kediri.',
      }),
      calculateCatchmentScore: jest.fn().mockResolvedValue({
        compositeScore: 82,
        subScores: {
          demandDensity: 88,
          trafficProxy: 75,
          areaQuality: 84,
          competitionPenalty: 15,
          networkSaturation: 0,
          operationalVitality: 95,
        },
        weights: {
          demandDensity: 0.3,
          trafficProxy: 0.2,
          areaQuality: 0.2,
          competitionPenalty: 0.15,
          networkSaturation: 0.1,
          operationalVitality: 0.05,
        },
        poiCount: 140,
        contributingPois: {
          demandDensity: [],
          trafficProxy: [],
          areaQuality: [],
          competitionPenalty: [],
          networkSaturation: [],
          operationalVitality: [],
        },
        explanations: null,
        summary: 'Catchment analysis for Sudirman Branch within 2km: Composite Score 82/100.',
      }),
      calculateAccessibilityScore: jest.fn().mockResolvedValue({
        compositeScore: 78,
        subScores: {
          demandDensity: 82,
          trafficProxy: 72,
          areaQuality: 84,
          competitionPenalty: 12,
          networkSaturation: 0,
          operationalVitality: 94,
        },
        poiCount: 112,
        polygonCoordinates: [
          { lat: -6.2000, lng: 106.8400 },
          { lat: -6.2100, lng: 106.8500 },
          { lat: -6.2200, lng: 106.8400 },
        ],
        summary: 'Accessibility analysis for Sudirman Branch (10-minute drive): Composite Score 78/100.',
      }),
    };

    mockSiteVisitService = {
      analyzeSite: jest.fn().mockResolvedValue({
        hasStreetViewCoverage: true,
        overallVisualScore: 85,
        images: {
          hasStreetViewCoverage: true,
          streetViewNorthUrl: 'https://example.com/north.jpg',
          satelliteUrl: 'https://example.com/sat.jpg',
        },
        criteria: {
          storefrontVisibility: { score: 90, justification: 'Clear signage' },
        },
        summary: 'AI Site Visit Report for Sudirman Branch: Visual Score 85/100.',
      }),
    };

    mockOrchestratorService = {};

    mockCatchmentHistoryService = {
      saveRun: jest.fn().mockResolvedValue({}),
      getUserRuns: jest.fn().mockResolvedValue([]),
    };

    mockVertexAiOrchestratorService = {
      processUserMessage: jest.fn().mockImplementation(async (msg, history, locations, executors, subject) => {
        if (msg.includes('Find coffee shop candidates') && msg.includes('heatmap')) {
          subject.next({ data: { type: 'status', step: 'Calling discover_locations...' } });
          const disc = await executors.discover_locations({ businessType: 'coffee_shop', region: 'Kediri' });
          subject.next({ data: { type: 'status', step: 'Calling generate_heatmap...' } });
          const hm = await executors.generate_heatmap({ category: 'coffee_shop', locationNameOrId: 'Kediri' });
          return {
            textResponse: 'Synthesized multi-tool analysis report for Kediri.',
            accumulatedPayloads: { candidates: disc.candidates, heatmapData: hm },
          };
        } else if (msg.includes('heatmap') || msg.includes('Heatmap')) {
          subject.next({ data: { type: 'status', step: 'Calling generate_heatmap...' } });
          const isCustom = msg.includes('preschools');
          const isJaksel = msg.includes('jakarta');
          const hm = await executors.generate_heatmap({
            locationNameOrId: isJaksel ? 'jakarta selatan' : isCustom ? 'bandung' : 'Kediri',
            category: isCustom ? 'preschool' : 'high school',
            filters: isCustom ? [{ column: 'rating', operator: 'lt', value: '4.0' }] : undefined,
          });
          return { textResponse: hm.summary, accumulatedPayloads: { heatmapData: hm } };
        } else if (msg.includes('catchment') || msg.includes('Catchment')) {
          subject.next({ data: { type: 'status', step: 'Calling catchment_score...' } });
          const radiusKm = msg.includes('3km') ? 3.0 : 2.0;
          const cs = await executors.catchment_score({ locationNameOrId: 'Sudirman Branch', radiusKm });
          return { textResponse: cs.summary, accumulatedPayloads: { catchmentData: cs } };
        } else if (msg.includes('accessible') || msg.includes('accessibility')) {
          subject.next({ data: { type: 'status', step: 'Calling accessibility_analysis...' } });
          const acc = await executors.accessibility_analysis({ locationNameOrId: 'Sudirman Branch', travelMode: 'drive', timeMinutes: 10 });
          return { textResponse: acc.summary, accumulatedPayloads: { accessibilityData: acc } };
        } else if (msg.includes('site visit') || msg.includes('Site Visit')) {
          subject.next({ data: { type: 'status', step: 'Calling ai_site_visit...' } });
          const sv = await executors.ai_site_visit({ locationNameOrId: 'Sudirman Branch' });
          return { textResponse: sv.summary, accumulatedPayloads: { siteVisitData: sv } };
        } else if (msg.includes('Add my coffee shop branch')) {
          subject.next({ data: { type: 'status', step: 'Calling add_business...' } });
          const add = await executors.add_business({ businessName: 'Sudirman Coffee', businessType: 'coffee_shop', address: 'Jl. Sudirman No. 10' });
          return { textResponse: add.summary, accumulatedPayloads: {} };
        }

        subject.next({ data: { type: 'status', step: 'Understanding your request...' } });
        return { textResponse: 'I am your Location Intelligence assistant.', accumulatedPayloads: {} };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockRepository,
        },
        {
          provide: GeocodingService,
          useValue: mockGeocodingService,
        },
        {
          provide: LocationsService,
          useValue: mockLocationsService,
        },
        {
          provide: DiscoveryService,
          useValue: mockDiscoveryService,
        },
        {
          provide: SiteVisitService,
          useValue: mockSiteVisitService,
        },
        {
          provide: CatchmentHistoryService,
          useValue: mockCatchmentHistoryService,
        },
        {
          provide: OrchestratorService,
          useValue: mockOrchestratorService,
        },
        {
          provide: VertexAiOrchestratorService,
          useValue: mockVertexAiOrchestratorService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHistory', () => {
    it('should query chat messages for user ID ordered by createdAt ASC', async () => {
      const userId = 'user-uuid-123';
      await service.getHistory(userId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId },
        order: { createdAt: 'ASC' },
        take: 100,
      });
    });
  });

  describe('executeHeatmapSkill', () => {
    it('should default the category to the saved business type when the user omits it', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeHeatmapSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.generateHeatmapDataset).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'coffee_shop', locationName: 'Sudirman Branch', radiusKm: 5 }),
      );
      expect(result.category).toBe('coffee_shop');
    });

    it('should let an explicit category override the saved business type', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeHeatmapSkill(
        'user-uuid-123',
        { category: 'school', locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.generateHeatmapDataset).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'school' }),
      );
      expect(result.category).toBe('school');
    });

    it('should ask a clarifying question instead of guessing when a bare region has no category', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeHeatmapSkill(
        'user-uuid-123',
        { locationNameOrId: 'Bandung' },
        userLocations,
        {} as any,
      );

      expect(result.summary).toContain('What category');
      expect(mockDiscoveryService.generateHeatmapDataset).not.toHaveBeenCalled();
    });

    it('should apply a custom radiusKm when the user specifies one', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      await service.executeHeatmapSkill(
        'user-uuid-123',
        { category: 'school', locationNameOrId: 'Sudirman Branch', radiusKm: 3 },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.generateHeatmapDataset).toHaveBeenCalledWith(
        expect.objectContaining({ radiusKm: 3 }),
      );
    });
  });

  describe('executeCatchmentSkill', () => {
    it('should default the category to the saved business type when the user omits it', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'coffee_shop', locationName: 'Sudirman Branch', radiusKm: 2.0 }),
      );
      expect(result.category).toBe('coffee_shop');
    });

    it('should let an explicit category override the saved business type (e.g. a chained "what about a book store instead" follow-up)', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { category: 'book store', locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'book store' }),
      );
      expect(result.category).toBe('book store');
    });

    it('should ask a clarifying question instead of guessing when a bare address has no category (prospective new-site case)', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { address: 'Jl. Braga No. 1, Bandung' },
        userLocations,
        {} as any,
      );

      expect(result.summary).toContain('What business category');
      expect(mockDiscoveryService.calculateCatchmentScore).not.toHaveBeenCalled();
    });

    it('should resolve a prospective (non-saved) address with an explicit category end-to-end', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { category: 'coffee shop', address: 'Jl. Braga No. 1, Bandung' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'coffee shop' }),
      );
      expect(result.compositeScore).toBe(82);
    });

    it('should pass regionFilter (regency/province) through to the calculation', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ regionFilter: expect.anything() }),
      );
    });

    it('should keep the chat-visible summary short — never restate scores/explanations in chat text', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(result.summary).not.toContain('Sub-score Breakdown');
      expect(result.summary.length).toBeLessThan(150);
    });

    it('should persist the run via CatchmentHistoryService without failing the request if persistence errors', async () => {
      const userLocations = await mockLocationsService.getUserLocations();
      mockCatchmentHistoryService.saveRun.mockRejectedValueOnce(new Error('db down'));

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockCatchmentHistoryService.saveRun).toHaveBeenCalled();
      expect(result.compositeScore).toBe(82);
    });
  });

  describe('saveMessage', () => {
    it('should create and save a new user message', async () => {
      const userId = 'user-uuid-123';
      const content = 'Test message';

      const saved = await service.saveMessage(userId, MessageSender.USER, content);

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        sender: MessageSender.USER,
        content,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(saved.id).toBe('msg-uuid-1');
    });
  });

  describe('streamChatResponse', () => {
    it('should return an Observable that emits status events for general queries', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Hello AI assistant';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toBe('Understanding your request...');
          done();
        },
      });
    }, 5000);

    it('should execute Add Business/Branch skill for location creation requests', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Add my coffee shop branch at Jl. Sudirman No. 10 called Sudirman Coffee';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('add_business');
          done();
        },
      });
    }, 5000);

    it('should execute Heatmap Visualization skill for heatmap requests', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Show me a heatmap for my minimarket business in Kediri';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('generate_heatmap');
          const messageEvent = events.find((e) => e.type === 'message' && e.heatmapData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.heatmapData.points.length).toBe(2);
          done();
        },
      });
    }, 5000);

    it('should execute Heatmap Visualization skill for custom exploratory requests (Mode B)', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Show me a heatmap of preschools with rating below 4.0 in Bandung';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          const messageEvent = events.find((e) => e.type === 'message' && e.heatmapData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.heatmapData.category).toBe('preschool');
          done();
        },
      });
    }, 5000);

    it('should execute Heatmap Visualization skill for high school in jakarta selatan prompt', (done) => {
      const userId = 'user-uuid-123';
      const message = 'show me a heatmap of high school in jakarta selatan';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('generate_heatmap');
          const messageEvent = events.find((e) => e.type === 'message' && e.heatmapData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.heatmapData.category).toBe('high school');
          expect(messageEvent.heatmapData.points.length).toBeGreaterThan(0);
          done();
        },
      });
    }, 5000);

    it('should execute Catchment Score skill for catchment requests', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Analyze the catchment for my Sudirman branch within 2km';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('catchment_score');
          const messageEvent = events.find((e) => e.type === 'message' && e.catchmentData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.catchmentData.compositeScore).toBe(82);
          expect(messageEvent.catchmentData.radiusKm).toBe(2.0);
          done();
        },
      });
    }, 5000);

    it('should handle follow-up radius and sub-score weight adjustment', (done) => {
      const userId = 'user-uuid-123';
      const message = 'change catchment radius to 3km for Sudirman branch and ignore competition penalty';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          const messageEvent = events.find((e) => e.type === 'message' && e.catchmentData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.catchmentData.radiusKm).toBe(3.0);
          done();
        },
      });
    }, 5000);

    it('should execute Accessibility Analysis skill for travel-time requests', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Check how accessible my Sudirman branch is within a 10 minute drive';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('accessibility_analysis');
          const messageEvent = events.find((e) => e.type === 'message' && e.accessibilityData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.accessibilityData.compositeScore).toBe(78);
          expect(messageEvent.accessibilityData.travelMode).toBe('drive');
          expect(messageEvent.accessibilityData.timeMinutes).toBe(10);
          done();
        },
      });
    }, 5000);

    it('should execute AI Site Visit skill for site visit requests', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Do an AI site visit on my Sudirman branch';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('ai_site_visit');
          const messageEvent = events.find((e) => e.type === 'message' && e.siteVisitData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.siteVisitData.overallVisualScore).toBe(85);
          expect(messageEvent.siteVisitData.images.satelliteUrl).toBeDefined();
          done();
        },
      });
    }, 5000);

    it('should execute multi-tool orchestration chain for complex prompts (Discover + Heatmap)', (done) => {
      const userId = 'user-uuid-123';
      const message = 'Find coffee shop candidates in Kediri and show a heatmap for minimarket density';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('Calling discover_locations');
          const messageEvent = events.find((e) => e.type === 'message');
          expect(messageEvent).toBeDefined();
          expect(messageEvent.candidates).toBeDefined();
          expect(messageEvent.heatmapData).toBeDefined();
          done();
        },
      });
    }, 5000);
  });
});
