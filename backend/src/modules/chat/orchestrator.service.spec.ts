import { Test, TestingModule } from '@nestjs/testing';
import { OrchestratorService } from './orchestrator.service';
import { LocationsService } from '../locations/services/locations.service';
import { DiscoveryService } from '../discovery/services/discovery.service';
import { SiteVisitService } from '../discovery/services/site-visit.service';
import { GeocodingService } from '../locations/services/geocoding.service';
import { Subject } from 'rxjs';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let mockLocationsService: any;
  let mockDiscoveryService: any;
  let mockSiteVisitService: any;
  let mockGeocodingService: any;

  beforeEach(async () => {
    mockLocationsService = {
      getUserLocations: jest.fn().mockResolvedValue([
        { id: 'loc-1', name: 'Sudirman Branch', latitude: -6.2088, longitude: 106.8456, businessType: 'coffee_shop' },
      ]),
    };

    mockDiscoveryService = {
      searchCandidates: jest.fn().mockResolvedValue([
        { rank: 1, name: 'Candidate 1', latitude: -7.8167, longitude: 112.0117, demandScore: 88 },
      ]),
      generateHeatmapDataset: jest.fn().mockResolvedValue({
        points: [{ lat: -7.8167, lng: 112.0117, weight: 8.5 }],
        summary: 'Heatmap summary',
      }),
      calculateCatchmentScore: jest.fn().mockResolvedValue({
        compositeScore: 82,
        subScores: { demandDensity: 80, trafficProxy: 80, areaQuality: 80, competitionPenalty: 10, networkSaturation: 0, operationalVitality: 90 },
        poiCount: 100,
        summary: 'Catchment summary',
      }),
      calculateAccessibilityScore: jest.fn().mockResolvedValue({
        compositeScore: 78,
        subScores: { demandDensity: 80, trafficProxy: 80, areaQuality: 80, competitionPenalty: 10, networkSaturation: 0, operationalVitality: 90 },
        poiCount: 90,
        polygonCoordinates: [{ lat: -6.2000, lng: 106.8400 }],
        summary: 'Accessibility summary',
      }),
    };

    mockSiteVisitService = {
      analyzeSite: jest.fn().mockResolvedValue({
        hasStreetViewCoverage: true,
        overallVisualScore: 85,
        images: { hasStreetViewCoverage: true, satelliteUrl: 'https://example.com/sat.jpg' },
        criteria: { storefrontVisibility: { score: 90, justification: 'Good' } },
        summary: 'Site visit summary',
      }),
    };

    mockGeocodingService = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchestratorService,
        { provide: LocationsService, useValue: mockLocationsService },
        { provide: DiscoveryService, useValue: mockDiscoveryService },
        { provide: SiteVisitService, useValue: mockSiteVisitService },
        { provide: GeocodingService, useValue: mockGeocodingService },
      ],
    }).compile();

    service = module.get<OrchestratorService>(OrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('planExecution', () => {
    it('should correctly identify multi-tool intent (Discover + Heatmap)', () => {
      const tools = service.planExecution('Find coffee shop candidates in Kediri and show a heatmap for minimarket density');
      expect(tools).toContain('discover');
      expect(tools).toContain('heatmap');
      expect(tools.length).toBe(2);
    });

    it('should correctly identify single tool intent', () => {
      const tools = service.planExecution('Show me a heatmap for my minimarket business in Kediri');
      expect(tools).toEqual(['heatmap']);
    });

    it('should cap execution at max 5 tools', () => {
      const tools = service.planExecution('Find candidate spots, show heatmap, calculate catchment, analyze accessibility, do site visit, and add branch');
      expect(tools.length).toBeLessThanOrEqual(5);
    });
  });

  describe('executeChain', () => {
    it('should execute a 2-tool chain sequentially and stream status events', async () => {
      const plannedTools = ['discover', 'heatmap'];
      const subject = new Subject<any>();
      const events: any[] = [];

      subject.subscribe((evt) => events.push(eventData(evt)));

      const result = await service.executeChain('user-1', 'Find candidates and heatmap in Kediri', plannedTools, subject);

      expect(result).toBeDefined();
      expect(result.payload.candidates).toBeDefined();
      expect(result.payload.heatmapData).toBeDefined();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('status');
    });
  });
});

function eventData(evt: any) {
  return evt.data || evt;
}
