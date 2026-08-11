import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatMessage, MessageSender } from './entities/chat-message.entity';
import { GeocodingService } from '../locations/services/geocoding.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { DiscoveryHistoryService } from '../discovery/services/discovery-history.service';
import { SiteVisitService } from '../discovery/services/site-visit.service';
import { SiteVisitHistoryService } from '../discovery/services/site-visit-history.service';
import { VertexAiOrchestratorService } from './vertexai-orchestrator.service';
import { CatchmentHistoryService } from '../discovery/services/catchment-history.service';
import { HeatmapHistoryService } from '../discovery/services/heatmap-history.service';

describe('ChatService', () => {
  let service: ChatService;
  let mockRepository: any;
  let mockGeocodingService: any;
  let mockLocationsService: any;
  let mockDiscoveryService: any;
  let mockDiscoveryHistoryService: any;
  let mockSiteVisitService: any;
  let mockSiteVisitHistoryService: any;
  let mockVertexAiOrchestratorService: any;
  let mockCatchmentHistoryService: any;
  let mockHeatmapHistoryService: any;

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
      // Mirrors the real calculateCatchmentScore's boundary resolution/echoing so both radius-
      // and time-boundary tests get a faithful response shape without duplicating the real logic.
      calculateCatchmentScore: jest.fn().mockImplementation((args: any) => {
        const isTime = args.boundaryType === 'time';
        return Promise.resolve({
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
          boundaryType: isTime ? 'time' : 'radius',
          radiusKm: isTime ? undefined : (args.radiusKm ?? 2.0),
          travelMode: isTime ? (args.travelMode || 'drive') : undefined,
          timeMinutes: isTime ? (args.timeMinutes ?? 10) : undefined,
          polygonCoordinates: isTime
            ? [
                { lat: -6.2000, lng: 106.8400 },
                { lat: -6.2100, lng: 106.8500 },
                { lat: -6.2200, lng: 106.8400 },
              ]
            : undefined,
          summary: 'Catchment analysis ready.',
        });
      }),
      generateTravelBoundary: jest.fn().mockImplementation((args: any) =>
        Promise.resolve({
          travelMode: args.travelMode || 'drive',
          timeMinutes: args.timeMinutes ?? 10,
          polygonCoordinates: [
            { lat: -6.2000, lng: 106.8400 },
            { lat: -6.2100, lng: 106.8500 },
            { lat: -6.2200, lng: 106.8400 },
          ],
        }),
      ),
    };

    mockDiscoveryHistoryService = {
      saveRun: jest.fn().mockResolvedValue({ id: 'search-uuid-1', createdAt: new Date('2026-08-11T00:00:00.000Z') }),
      getUserRuns: jest.fn().mockResolvedValue([]),
    };

    mockSiteVisitService = {
      analyzeSite: jest.fn().mockResolvedValue({
        hasStreetViewCoverage: true,
        overallVisualScore: 85,
        criteria: {
          storefrontVisibility: { score: 90, justification: 'Clear signage' },
          roadWidthAccess: { score: 80, justification: 'Wide road' },
          trafficVisibility: { score: 78, justification: 'Steady traffic' },
          buildingTypes: { score: 82, justification: 'Commercial buildings' },
          areaCondition: { score: 88, justification: 'Well maintained' },
        },
        availableImageTypes: ['north', 'east', 'south', 'west', 'satellite'],
        summary: 'AI Site Visit Report for Sudirman Branch: Visual Score 85/100.',
      }),
    };

    mockSiteVisitHistoryService = {
      saveRun: jest.fn().mockResolvedValue({ id: 'report-uuid-1', createdAt: new Date('2026-08-11T00:00:00.000Z') }),
      getUserRuns: jest.fn().mockResolvedValue([]),
    };

    mockCatchmentHistoryService = {
      saveRun: jest.fn().mockResolvedValue({}),
      getUserRuns: jest.fn().mockResolvedValue([]),
    };

    mockHeatmapHistoryService = {
      saveRun: jest.fn().mockResolvedValue({ id: 'heatmap-uuid-1', createdAt: new Date('2026-08-11T00:00:00.000Z') }),
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
            accumulatedPayloads: { discoveryData: disc, heatmapData: hm },
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
        } else if (msg.includes('boundary') && msg.includes('show')) {
          subject.next({ data: { type: 'status', step: 'Calling show_travel_boundary...' } });
          const tb = await executors.show_travel_boundary({ locationNameOrId: 'Sudirman Branch', travelMode: 'drive', timeMinutes: 10 });
          return { textResponse: tb.summary, accumulatedPayloads: { travelBoundaryData: tb } };
        } else if (msg.includes('accessible') || msg.includes('accessibility')) {
          subject.next({ data: { type: 'status', step: 'Calling catchment_score...' } });
          const cs = await executors.catchment_score({ locationNameOrId: 'Sudirman Branch', boundaryType: 'time', travelMode: 'drive', timeMinutes: 10 });
          return { textResponse: cs.summary, accumulatedPayloads: { catchmentData: cs } };
        } else if (msg.includes('site visit') || msg.includes('Site Visit')) {
          subject.next({ data: { type: 'status', step: 'Calling ai_site_visit...' } });
          const sv = await executors.ai_site_visit({ locationNameOrId: 'Sudirman Branch' });
          return { textResponse: sv.summary, accumulatedPayloads: { siteVisitData: sv } };
        } else if (msg.includes('Add my coffee shop branch')) {
          subject.next({ data: { type: 'status', step: 'Calling add_business...' } });
          const add = await executors.add_business({ businessName: 'Sudirman Coffee', businessType: 'coffee_shop', address: 'Jl. Sudirman No. 10' });
          return { textResponse: add.summary, accumulatedPayloads: { locationData: add.location } };
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
          provide: DiscoveryHistoryService,
          useValue: mockDiscoveryHistoryService,
        },
        {
          provide: SiteVisitService,
          useValue: mockSiteVisitService,
        },
        {
          provide: SiteVisitHistoryService,
          useValue: mockSiteVisitHistoryService,
        },
        {
          provide: CatchmentHistoryService,
          useValue: mockCatchmentHistoryService,
        },
        {
          provide: HeatmapHistoryService,
          useValue: mockHeatmapHistoryService,
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
        expect.objectContaining({ category: 'coffee_shop', locationName: 'Sudirman Branch' }),
      );
      expect(result.category).toBe('coffee_shop');
    });

    it('should default boundaryType to "time" (not radius) when the user specifies neither', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch' },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ boundaryType: 'time' }),
      );
      expect(result.boundaryType).toBe('time');
      expect(result.travelMode).toBe('drive');
      expect(result.timeMinutes).toBe(10);
      expect(result.radiusKm).toBeUndefined();
    });

    it('should infer boundaryType "radius" when the user explicitly gives a radiusKm without an explicit boundaryType', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch', radiusKm: 3 },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ boundaryType: 'radius', radiusKm: 3 }),
      );
      expect(result.boundaryType).toBe('radius');
    });

    it('should respect an explicit boundaryType with a customizable time threshold (e.g. "20 minutes")', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeCatchmentSkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch', boundaryType: 'time', travelMode: 'walk', timeMinutes: 20 },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.calculateCatchmentScore).toHaveBeenCalledWith(
        expect.objectContaining({ boundaryType: 'time', travelMode: 'walk', timeMinutes: 20 }),
      );
      expect(result.travelMode).toBe('walk');
      expect(result.timeMinutes).toBe(20);
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

  describe('executeShowTravelBoundarySkill', () => {
    it('should render only the boundary shape, with no scoring/panel/history involvement', async () => {
      const userLocations = await mockLocationsService.getUserLocations();

      const result = await service.executeShowTravelBoundarySkill(
        'user-uuid-123',
        { locationNameOrId: 'Sudirman Branch', travelMode: 'walk', timeMinutes: 15 },
        userLocations,
        {} as any,
      );

      expect(mockDiscoveryService.generateTravelBoundary).toHaveBeenCalledWith(
        expect.objectContaining({ travelMode: 'walk', timeMinutes: 15 }),
      );
      expect(mockDiscoveryService.calculateCatchmentScore).not.toHaveBeenCalled();
      expect(mockCatchmentHistoryService.saveRun).not.toHaveBeenCalled();
      expect(result.travelMode).toBe('walk');
      expect(result.timeMinutes).toBe(15);
      expect(result.polygonCoordinates.length).toBeGreaterThan(0);
    });

    it('should ask a clarifying question instead of guessing when no location is given at all', async () => {
      const result = await service.executeShowTravelBoundarySkill(
        'user-uuid-123',
        {},
        [],
        {} as any,
      );

      expect(result.summary).toContain('Which location');
      expect(mockDiscoveryService.generateTravelBoundary).not.toHaveBeenCalled();
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
          const messageEvent = events.find((e) => e.type === 'message');
          expect(messageEvent.locationData).toBeDefined();
          expect(messageEvent.locationData.id).toBe('loc-123');
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

    it('should execute the unified Catchment Score skill with a time boundary for accessibility-style requests (008 merged into 007)', (done) => {
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
          expect(events[0].step).toContain('catchment_score');
          const messageEvent = events.find((e) => e.type === 'message' && e.catchmentData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.catchmentData.boundaryType).toBe('time');
          expect(messageEvent.catchmentData.compositeScore).toBe(82);
          expect(messageEvent.catchmentData.travelMode).toBe('drive');
          expect(messageEvent.catchmentData.timeMinutes).toBe(10);
          expect(messageEvent.catchmentData.polygonCoordinates.length).toBeGreaterThan(0);
          done();
        },
      });
    }, 5000);

    it('should execute the lightweight show_travel_boundary skill (shape only, no scoring) when the user just wants to see the boundary', (done) => {
      const userId = 'user-uuid-123';
      const message = 'show me the 10 minute drive boundary from my Sudirman branch';
      const events: any[] = [];

      const stream$ = service.streamChatResponse(userId, message);

      stream$.subscribe({
        next: (event) => {
          events.push(event.data);
        },
        complete: () => {
          expect(events.length).toBeGreaterThan(0);
          expect(events[0].type).toBe('status');
          expect(events[0].step).toContain('show_travel_boundary');
          const messageEvent = events.find((e) => e.type === 'message' && e.travelBoundaryData);
          expect(messageEvent).toBeDefined();
          expect(messageEvent.travelBoundaryData.travelMode).toBe('drive');
          expect(messageEvent.travelBoundaryData.timeMinutes).toBe(10);
          expect(messageEvent.catchmentData).toBeUndefined();
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
          expect(messageEvent.siteVisitData.reportId).toBe('report-uuid-1');
          expect(messageEvent.siteVisitData.availableImageTypes).toEqual(['north', 'east', 'south', 'west', 'satellite']);
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
          expect(messageEvent.discoveryData).toBeDefined();
          expect(messageEvent.discoveryData.candidates).toBeDefined();
          expect(messageEvent.heatmapData).toBeDefined();
          done();
        },
      });
    }, 5000);
  });
});
