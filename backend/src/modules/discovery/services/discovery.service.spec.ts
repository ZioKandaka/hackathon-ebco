import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { BigQueryDiscoveryService } from './bigquery-discovery.service';
import { PoiRelevanceClassifierService } from './poi-relevance-classifier.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockBigQueryService: any;
  let mockPoiRelevanceClassifierService: any;

  beforeEach(async () => {
    mockBigQueryService = {
      queryPoisByRegion: jest.fn().mockResolvedValue([
        { id: '1', name: 'Spot 1', category: 'university', latitude: -7.8167, longitude: 112.0117 },
        { id: '2', name: 'Spot 2', category: 'office', latitude: -7.8170, longitude: 112.0120 },
      ]),
      getDemandCategoriesForType: jest.fn().mockReturnValue(['school', 'office']),
    };

    mockPoiRelevanceClassifierService = {
      classifyRelevantCategories: jest.fn().mockResolvedValue(['coffee_shop', 'cafe', 'bakery']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: BigQueryDiscoveryService,
          useValue: mockBigQueryService,
        },
        {
          provide: PoiRelevanceClassifierService,
          useValue: mockPoiRelevanceClassifierService,
        },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchCandidates', () => {
    it('should return ranked candidate spots with scores and rationales', async () => {
      const candidates = await service.searchCandidates('coffee_shop', 'Kediri', 5);

      expect(candidates).toBeDefined();
      expect(candidates.length).toBe(2);
      expect(candidates[0].rank).toBe(1);
      expect(candidates[0].demandScore).toBeGreaterThan(0);
      expect(candidates[0].rationale).toBeDefined();
    });
  });

  describe('getNearbyPoisForCandidate', () => {
    it('should filter POIs using categories from the Vertex AI relevance classifier', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'Kopi Kenangan', category: 'coffee_shop', latitude: -6.2088, longitude: 106.8456 },
      ]);

      const pois = await service.getNearbyPoisForCandidate(-6.2088, 106.8456, 'coffee_shop', 2000);

      expect(mockPoiRelevanceClassifierService.classifyRelevantCategories).toHaveBeenCalledWith('coffee_shop');
      expect(mockBigQueryService.queryPoisWithinRadius).toHaveBeenCalledWith(
        -6.2088,
        106.8456,
        2000,
        undefined,
        ['coffee_shop', 'cafe', 'bakery'],
      );
      expect(pois.length).toBe(1);
    });

    it('should return no POIs (without querying BigQuery) when no category is genuinely relevant', async () => {
      mockPoiRelevanceClassifierService.classifyRelevantCategories.mockResolvedValueOnce([]);
      mockBigQueryService.queryPoisWithinRadius = jest.fn();

      const pois = await service.getNearbyPoisForCandidate(-6.2088, 106.8456, 'laundry', 2000);

      expect(pois).toEqual([]);
      expect(mockBigQueryService.queryPoisWithinRadius).not.toHaveBeenCalled();
    });
  });

  describe('generateHeatmapDataset', () => {
    it('should query within the radius using classified categories and validated filters, with uniform density weight', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'SDN 1', category: 'school', latitude: -6.2088, longitude: 106.8456, rating: 4.5 },
        { id: 'p2', name: 'SDN 2', category: 'school', latitude: -6.2090, longitude: 106.8460, rating: 3.5 },
      ]);

      const result = await service.generateHeatmapDataset({
        category: 'school',
        center: { lat: -6.2088, lng: 106.8456 },
        radiusKm: 5,
        locationName: 'Sudirman Branch',
        filters: [{ column: 'rating', operator: 'lt', value: '4.0' }],
      });

      expect(mockPoiRelevanceClassifierService.classifyRelevantCategories).toHaveBeenCalledWith('school');
      expect(mockBigQueryService.queryPoisWithinRadius).toHaveBeenCalledWith(
        -6.2088,
        106.8456,
        5000,
        undefined,
        ['coffee_shop', 'cafe', 'bakery'],
        [{ column: 'rating', operator: 'lt', value: 4.0 }],
      );
      expect(result.points).toEqual([
        { lat: -6.2088, lng: 106.8456, weight: 1, id: 'p1', name: 'SDN 1', category: 'school', rating: 4.5, userRatingsTotal: undefined, businessStatus: undefined },
        { lat: -6.2090, lng: 106.8460, weight: 1, id: 'p2', name: 'SDN 2', category: 'school', rating: 3.5, userRatingsTotal: undefined, businessStatus: undefined },
      ]);
      expect(result.summary).toContain('rating below 4');
      expect(result.summary).toContain('5km');
    });

    it('should not query BigQuery and should explain when the category has no relevant POI type', async () => {
      mockPoiRelevanceClassifierService.classifyRelevantCategories.mockResolvedValueOnce([]);
      mockBigQueryService.queryPoisWithinRadius = jest.fn();

      const result = await service.generateHeatmapDataset({
        category: 'laundry',
        center: { lat: -6.2088, lng: 106.8456 },
        radiusKm: 5,
        locationName: 'Sudirman Branch',
      });

      expect(result.points).toEqual([]);
      expect(result.summary).toContain('laundry');
      expect(mockBigQueryService.queryPoisWithinRadius).not.toHaveBeenCalled();
    });

    it('should note in the summary when a requested filter is dropped as unsupported', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([]);

      const result = await service.generateHeatmapDataset({
        category: 'school',
        center: { lat: -6.2088, lng: 106.8456 },
        radiusKm: 5,
        locationName: 'Sudirman Branch',
        filters: [{ column: 'annual_profit', operator: 'gt', value: '1000000000' }],
      });

      expect(result.summary).toContain("couldn't apply a filter");
      expect(result.summary).toContain('annual_profit');
    });
  });

  describe('calculateCatchmentScore', () => {
    it('should calculate 6 sub-scores and a composite score for a radius query', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'School A', category: 'school', latitude: -6.2088, longitude: 106.8456, rating: 4.5, userRatingsTotal: 120, businessStatus: 'OPERATIONAL' },
        { id: 'p2', name: 'Office B', category: 'office', latitude: -6.2090, longitude: 106.8460, rating: 4.2, userRatingsTotal: 80, businessStatus: 'OPERATIONAL' },
      ]);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        radiusKm: 2.0,
        locationName: 'Sudirman Branch',
      });

      expect(result).toBeDefined();
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
      expect(result.subScores.demandDensity).toBeDefined();
      expect(result.subScores.trafficProxy).toBeDefined();
      expect(result.subScores.areaQuality).toBeDefined();
      expect(result.subScores.competitionPenalty).toBeDefined();
      expect(result.subScores.networkSaturation).toBeDefined();
      expect(result.subScores.operationalVitality).toBeDefined();
    });
  });

  describe('calculateAccessibilityScore', () => {
    it('should compute travel-time isochrone polygon and catchment score', async () => {
      mockBigQueryService.generateIsochronePolygon = jest.fn().mockResolvedValue([
        { lat: -6.2000, lng: 106.8400 },
        { lat: -6.2100, lng: 106.8500 },
        { lat: -6.2200, lng: 106.8400 },
      ]);
      mockBigQueryService.queryPoisInsidePolygon = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'School A', category: 'school', latitude: -6.2088, longitude: 106.8456, rating: 4.5, userRatingsTotal: 120, businessStatus: 'OPERATIONAL' },
      ]);

      const result = await service.calculateAccessibilityScore({
        lat: -6.2088,
        lng: 106.8456,
        travelMode: 'drive',
        timeMinutes: 10,
        locationName: 'Sudirman Branch',
      });

      expect(result).toBeDefined();
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.polygonCoordinates.length).toBeGreaterThan(0);
      expect(result.summary).toContain('10-minute drive');
    });
  });
});
