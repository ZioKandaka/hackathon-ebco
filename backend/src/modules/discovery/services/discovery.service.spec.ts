import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { BigQueryDiscoveryService } from './bigquery-discovery.service';
import { PoiRelevanceClassifierService } from './poi-relevance-classifier.service';
import { CatchmentExplanationService } from './catchment-explanation.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockBigQueryService: any;
  let mockPoiRelevanceClassifierService: any;
  let mockCatchmentExplanationService: any;

  beforeEach(async () => {
    mockBigQueryService = {
      queryPoisByRegion: jest.fn().mockResolvedValue([
        { id: '1', name: 'Spot 1', category: 'university', latitude: -7.8167, longitude: 112.0117 },
        { id: '2', name: 'Spot 2', category: 'office', latitude: -7.8170, longitude: 112.0120 },
      ]),
      queryPoisWithinRadius: jest.fn().mockResolvedValue([
        { id: 'n1', name: 'SDN 1', category: 'school', standardizedCategory: 'school', latitude: -7.8167, longitude: 112.0117, distanceMeters: 200 },
        { id: 'n2', name: 'Rival Coffee', category: 'coffee_shop', standardizedCategory: 'coffee_shop', latitude: -7.8168, longitude: 112.0118, distanceMeters: 300 },
        { id: 'n3', name: 'Generic Store', category: 'store', standardizedCategory: 'store', latitude: -7.8169, longitude: 112.0119, distanceMeters: 400 },
      ]),
      getDemandCategoriesForType: jest.fn().mockReturnValue(['school', 'office']),
    };

    mockPoiRelevanceClassifierService = {
      classifyRelevantCategories: jest.fn().mockResolvedValue(['coffee_shop', 'cafe', 'bakery']),
      classifyDemandDriverCategories: jest.fn().mockResolvedValue(['school', 'corporate_office']),
    };

    mockCatchmentExplanationService = {
      generateExplanations: jest.fn().mockResolvedValue({
        demandDensity: 'Explained demand density.',
        trafficProxy: 'Explained traffic proxy.',
        areaQuality: 'Explained area quality.',
        competitionPenalty: 'Explained competition penalty.',
        networkSaturation: 'Explained network saturation.',
        operationalVitality: 'Explained operational vitality.',
      }),
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
        {
          provide: CatchmentExplanationService,
          useValue: mockCatchmentExplanationService,
        },
      ],
    }).compile();

    service = module.get<DiscoveryService>(DiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchCandidates', () => {
    it('should return ranked candidate spots with real BigQuery-derived scores, not fabricated placeholders', async () => {
      const candidates = await service.searchCandidates('coffee_shop', 'Kediri', 5);

      expect(candidates).toBeDefined();
      expect(candidates.length).toBe(2);
      expect(candidates[0].rank).toBe(1);
      // 1 demand-category POI ("school") out of 3 nearby -> round((1/3)*120) = 40
      expect(candidates[0].demandScore).toBe(40);
      // 1 competitor-category POI ("coffee_shop") out of 3 nearby
      expect(candidates[0].competitionCount).toBe(1);
      expect(candidates[0].rationale).toContain('school');
      expect(mockPoiRelevanceClassifierService.classifyDemandDriverCategories).toHaveBeenCalledWith('coffee_shop');
      expect(mockPoiRelevanceClassifierService.classifyRelevantCategories).toHaveBeenCalledWith('coffee_shop');
      expect(mockBigQueryService.queryPoisWithinRadius).toHaveBeenCalledWith(-7.8167, 112.0117, 1000);
    });

    it('should never return the old fabricated index-derived scores (60-95 clamp, index%2 competition)', async () => {
      mockBigQueryService.queryPoisWithinRadius.mockResolvedValue([]);
      const candidates = await service.searchCandidates('coffee_shop', 'Kediri', 5);

      // With zero nearby POIs at all, demandScore falls back to the floor (10), not a fabricated
      // rank-based number in the 60-95 range the old implementation always produced.
      expect(candidates[0].demandScore).toBe(10);
      expect(candidates[0].competitionCount).toBe(0);
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
    it('should calculate 6 sub-scores and a composite score using exact standardizedCategory matches', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'School A', category: 'SD Negeri A', standardizedCategory: 'school', distanceMeters: 300, latitude: -6.2088, longitude: 106.8456, rating: 4.5, userRatingsTotal: 120, businessStatus: 'OPERATIONAL' },
        { id: 'p2', name: 'Kopi Rival', category: 'Coffee Place', standardizedCategory: 'coffee_shop', distanceMeters: 500, latitude: -6.2090, longitude: 106.8460, rating: 4.2, userRatingsTotal: 80, businessStatus: 'OPERATIONAL' },
      ]);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(mockPoiRelevanceClassifierService.classifyDemandDriverCategories).toHaveBeenCalledWith('coffee_shop');
      expect(mockPoiRelevanceClassifierService.classifyRelevantCategories).toHaveBeenCalledWith('coffee_shop');

      expect(result).toBeDefined();
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
      expect(result.subScores.demandDensity).toBeDefined();
      expect(result.subScores.trafficProxy).toBeDefined();
      expect(result.subScores.areaQuality).toBeDefined();
      expect(result.subScores.competitionPenalty).toBeDefined();
      expect(result.subScores.networkSaturation).toBeDefined();
      expect(result.subScores.operationalVitality).toBeDefined();
      expect(result.weights.demandDensity).toBe(0.3);

      // School A is a demand driver (standardizedCategory 'school'), Kopi Rival is a competitor
      // ('coffee_shop' peer) — the raw noisy `category` text is irrelevant to this matching now.
      expect(result.contributingPois.demandDensity.map((p) => p.name)).toEqual(['School A']);
      expect(result.contributingPois.competitionPenalty.map((p) => p.name)).toEqual(['Kopi Rival']);
    });

    it('should keep Network Saturation at 0 when 2 or fewer competitors exist, regardless of concentration', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'Rival A', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 100, latitude: -6.2088, longitude: 106.8456, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
        { id: 'p2', name: 'Rival B', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 150, latitude: -6.2089, longitude: 106.8457, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
      ]);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(result.subScores.networkSaturation).toBe(0);
    });

    it('should score Network Saturation independently of Competition Penalty based on concentration, not just count', async () => {
      // 3 competitors, all inside the inner half of a 2km radius (1000m) -> tightly clustered.
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'Rival A', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 200, latitude: -6.2088, longitude: 106.8456, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
        { id: 'p2', name: 'Rival B', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 300, latitude: -6.2089, longitude: 106.8457, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
        { id: 'p3', name: 'Rival C', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 400, latitude: -6.2090, longitude: 106.8458, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
      ]);

      const clustered = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      // Same 3-competitor count, but spread beyond the inner 1000m ring -> low concentration.
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'Rival A', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 1200, latitude: -6.2088, longitude: 106.8456, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
        { id: 'p2', name: 'Rival B', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 1500, latitude: -6.2089, longitude: 106.8457, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
        { id: 'p3', name: 'Rival C', category: 'x', standardizedCategory: 'coffee_shop', distanceMeters: 1800, latitude: -6.2090, longitude: 106.8458, rating: 4.0, userRatingsTotal: 10, businessStatus: 'OPERATIONAL' },
      ]);

      const spread = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(clustered.subScores.competitionPenalty).toBe(spread.subScores.competitionPenalty);
      expect(clustered.subScores.networkSaturation).toBeGreaterThan(spread.subScores.networkSaturation);
    });

    it('should pass regionFilter through to the BigQuery radius query', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([]);

      await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
        regionFilter: 'Kota Jakarta Selatan',
      });

      expect(mockBigQueryService.queryPoisWithinRadius).toHaveBeenCalledWith(
        -6.2088,
        106.8456,
        2000,
        'Kota Jakarta Selatan',
      );
    });

    it('should report zero POIs gracefully without calling the explanation service', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([]);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(result.poiCount).toBe(0);
      expect(result.summary).toContain('No POIs found');
      expect(result.explanations).toBeNull();
      expect(mockCatchmentExplanationService.generateExplanations).not.toHaveBeenCalled();
    });

    it('should degrade gracefully to null explanations without failing the whole run', async () => {
      mockBigQueryService.queryPoisWithinRadius = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'School A', category: 'x', standardizedCategory: 'school', distanceMeters: 300, latitude: -6.2088, longitude: 106.8456, rating: 4.5, userRatingsTotal: 120, businessStatus: 'OPERATIONAL' },
      ]);
      mockCatchmentExplanationService.generateExplanations.mockResolvedValueOnce(null);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'radius',
        radiusKm: 2.0,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.explanations).toBeNull();
    });
  });

  describe('calculateCatchmentScore with boundaryType "time" (merged former accessibility feature)', () => {
    it('should compute a real isochrone polygon, score POIs strictly inside it, and reuse the exact same scoring engine as the radius path', async () => {
      const polygon = [
        { lat: -6.2000, lng: 106.8400 },
        { lat: -6.2100, lng: 106.8500 },
        { lat: -6.2200, lng: 106.8400 },
      ];
      mockBigQueryService.generateIsochronePolygon = jest.fn().mockResolvedValue(polygon);
      mockBigQueryService.queryPoisInsidePolygon = jest.fn().mockResolvedValue([
        { id: 'p1', name: 'School A', category: 'SD Negeri A', standardizedCategory: 'school', distanceMeters: 300, latitude: -6.2088, longitude: 106.8456, rating: 4.5, userRatingsTotal: 120, businessStatus: 'OPERATIONAL' },
      ]);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'time',
        travelMode: 'drive',
        timeMinutes: 10,
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(mockBigQueryService.generateIsochronePolygon).toHaveBeenCalledWith(-6.2088, 106.8456, 'drive', 10);
      expect(mockBigQueryService.queryPoisInsidePolygon).toHaveBeenCalledWith(polygon, -6.2088, 106.8456, undefined);
      expect(result).toBeDefined();
      expect(result.boundaryType).toBe('time');
      expect(result.travelMode).toBe('drive');
      expect(result.timeMinutes).toBe(10);
      expect(result.radiusKm).toBeUndefined();
      expect(result.polygonCoordinates).toEqual(polygon);
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.summary).toContain('10-minute drive');
    });

    it('should default to a 10-minute drive when boundaryType is "time" but mode/duration are omitted', async () => {
      mockBigQueryService.generateIsochronePolygon = jest.fn().mockResolvedValue([
        { lat: -6.2000, lng: 106.8400 },
        { lat: -6.2100, lng: 106.8500 },
        { lat: -6.2200, lng: 106.8400 },
      ]);
      mockBigQueryService.queryPoisInsidePolygon = jest.fn().mockResolvedValue([]);

      const result = await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'time',
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
      });

      expect(mockBigQueryService.generateIsochronePolygon).toHaveBeenCalledWith(-6.2088, 106.8456, 'drive', 10);
      expect(result.travelMode).toBe('drive');
      expect(result.timeMinutes).toBe(10);
    });

    it('should pass regionFilter through to the polygon POI query', async () => {
      mockBigQueryService.generateIsochronePolygon = jest.fn().mockResolvedValue([
        { lat: -6.2000, lng: 106.8400 },
        { lat: -6.2100, lng: 106.8500 },
        { lat: -6.2200, lng: 106.8400 },
      ]);
      mockBigQueryService.queryPoisInsidePolygon = jest.fn().mockResolvedValue([]);

      await service.calculateCatchmentScore({
        lat: -6.2088,
        lng: 106.8456,
        boundaryType: 'time',
        category: 'coffee_shop',
        locationName: 'Sudirman Branch',
        regionFilter: 'Kota Jakarta Selatan',
      });

      expect(mockBigQueryService.queryPoisInsidePolygon).toHaveBeenCalledWith(
        expect.anything(),
        -6.2088,
        106.8456,
        'Kota Jakarta Selatan',
      );
    });
  });

  describe('generateTravelBoundary', () => {
    it('should compute the isochrone polygon only — no POI query, no scoring', async () => {
      const polygon = [
        { lat: -6.2000, lng: 106.8400 },
        { lat: -6.2100, lng: 106.8500 },
        { lat: -6.2200, lng: 106.8400 },
      ];
      mockBigQueryService.generateIsochronePolygon = jest.fn().mockResolvedValue(polygon);
      mockBigQueryService.queryPoisInsidePolygon = jest.fn();

      const result = await service.generateTravelBoundary({
        lat: -6.2088,
        lng: 106.8456,
        travelMode: 'walk',
        timeMinutes: 15,
      });

      expect(mockBigQueryService.generateIsochronePolygon).toHaveBeenCalledWith(-6.2088, 106.8456, 'walk', 15);
      expect(mockBigQueryService.queryPoisInsidePolygon).not.toHaveBeenCalled();
      expect(result).toEqual({ travelMode: 'walk', timeMinutes: 15, polygonCoordinates: polygon });
    });

    it('should default to a 10-minute drive when unspecified', async () => {
      mockBigQueryService.generateIsochronePolygon = jest.fn().mockResolvedValue([]);

      await service.generateTravelBoundary({ lat: -6.2088, lng: 106.8456 });

      expect(mockBigQueryService.generateIsochronePolygon).toHaveBeenCalledWith(-6.2088, 106.8456, 'drive', 10);
    });
  });
});
