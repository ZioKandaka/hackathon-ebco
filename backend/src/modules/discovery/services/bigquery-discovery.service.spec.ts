import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BigQueryDiscoveryService } from './bigquery-discovery.service';
import { IsochroneCache } from '../entities/isochrone-cache.entity';

describe('BigQueryDiscoveryService', () => {
  let service: BigQueryDiscoveryService;
  let mockIsochroneCacheRepository: any;

  beforeEach(async () => {
    mockIsochroneCacheRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BigQueryDiscoveryService,
        {
          provide: getRepositoryToken(IsochroneCache),
          useValue: mockIsochroneCacheRepository,
        },
      ],
    }).compile();

    service = module.get<BigQueryDiscoveryService>(BigQueryDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRelevantDisplayCategoriesForType', () => {
    it('should return coffee_shop, cafe, bakery for coffee_shop vertical', () => {
      const cats = service.getRelevantDisplayCategoriesForType('coffee_shop');
      expect(cats).toEqual(['coffee_shop', 'cafe', 'bakery']);
    });

    it('should return laundry, dry_cleaning for laundry vertical', () => {
      const cats = service.getRelevantDisplayCategoriesForType('laundry');
      expect(cats).toEqual(['laundry', 'dry_cleaning']);
    });

    it('should fall back to same-category matching for unmapped verticals', () => {
      const cats = service.getRelevantDisplayCategoriesForType('pharmacy');
      expect(cats).toEqual(['pharmacy']);
    });
  });

  describe('queryPoisByRegion', () => {
    it('should return POIs for a target region', async () => {
      const pois = await service.queryPoisByRegion('coffee_shop', 'Kediri');
      expect(pois).toBeDefined();
      expect(pois.length).toBeGreaterThan(0);
      expect(pois[0].latitude).toBeDefined();
      expect(pois[0].longitude).toBeDefined();
    });
  });

  describe('queryHeatmapRawPois', () => {
    it('should return raw spatial POI points for heatmap generation', async () => {
      const points = await service.queryHeatmapRawPois('Kediri');
      expect(points).toBeDefined();
      expect(points.length).toBeGreaterThan(0);
      expect(points[0].latitude).toBeDefined();
      expect(points[0].longitude).toBeDefined();
    });
  });

  describe('generateIsochronePolygon', () => {
    it('should return cached isochrone polygon when cache hit occurs', async () => {
      mockIsochroneCacheRepository.findOne.mockResolvedValueOnce({
        cacheKey: '-6.209,106.846:drive:10',
        polygonCoordinates: [
          { lat: -6.2000, lng: 106.8400 },
          { lat: -6.2100, lng: 106.8500 },
          { lat: -6.2200, lng: 106.8400 },
        ],
      });

      const path = await service.generateIsochronePolygon(-6.2088, 106.8456, 'drive', 10);
      expect(path).toBeDefined();
      expect(path.length).toBe(3);
      expect(mockIsochroneCacheRepository.findOne).toHaveBeenCalled();
    });
  });
});
