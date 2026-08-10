import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { SiteVisitService } from '../discovery/services/site-visit.service';
import { OrchestratorService } from './orchestrator.service';

describe('ChatService', () => {
  let service: ChatService;
  let mockRepository: any;
  let mockGeocodingService: any;
  let mockLocationsService: any;
  let mockDiscoveryService: any;
  let mockSiteVisitService: any;
  let mockOrchestratorService: any;

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
        poiCount: 140,
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

    mockOrchestratorService = {
      planExecution: jest.fn().mockImplementation((msg: string) => {
        if (msg.includes('Find coffee shop candidates') && msg.includes('heatmap')) {
          return ['discover', 'heatmap'];
        }
        return ['single_tool'];
      }),
      executeChain: jest.fn().mockResolvedValue({
        summary: 'Synthesized multi-tool analysis report for Kediri.',
        payload: {
          candidates: [{ rank: 1, name: 'Kediri Spot 1', demandScore: 88 }],
          heatmapData: { queryId: 'hm-1', points: [] },
        },
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
          provide: OrchestratorService,
          useValue: mockOrchestratorService,
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
          expect(events[0].step).toContain('Add Business/Branch');
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
          expect(events[0].step).toContain('Heatmap Visualization');
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
          expect(messageEvent.heatmapData.mode).toBe('custom_prompt');
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
          expect(events[0].step).toContain('Heatmap Visualization');
          const messageEvent = events.find((e) => e.type === 'message' && e.heatmapData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.heatmapData.region).toBe('jakarta selatan');
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
          expect(events[0].step).toContain('Catchment Score');
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
          expect(events[0].step).toContain('Accessibility Analysis');
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
          expect(events[0].step).toContain('AI Site Visit');
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
          expect(events[0].step).toContain('Orchestrating AI tools');
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
