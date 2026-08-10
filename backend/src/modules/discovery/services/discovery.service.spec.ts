import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { BigQueryDiscoveryService } from './bigquery-discovery.service';

describe('DiscoveryService', () => {
  let service: DiscoveryService;
  let mockBigQueryService: any;

  beforeEach(async () => {
    mockBigQueryService = {
      queryPoisByRegion: jest.fn().mockResolvedValue([
        { id: '1', name: 'Spot 1', category: 'university', latitude: -7.8167, longitude: 112.0117 },
        { id: '2', name: 'Spot 2', category: 'office', latitude: -7.8170, longitude: 112.0120 },
      ]),
      getDemandCategoriesForType: jest.fn().mockReturnValue(['school', 'office']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryService,
        {
          provide: BigQueryDiscoveryService,
          useValue: mockBigQueryService,
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
});
