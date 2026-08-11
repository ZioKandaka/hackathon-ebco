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

  describe('queryPoisByRegion', () => {
    it('should throw a clear error instead of returning fabricated mock POIs when BigQuery fails', async () => {
      await expect(service.queryPoisByRegion('coffee_shop', 'Kediri')).rejects.toThrow(
        /Couldn't fetch location data/,
      );
    });
  });

  describe('queryPoisWithinRadius', () => {
    it('should throw a clear error instead of returning fabricated mock POIs when BigQuery fails', async () => {
      await expect(service.queryPoisWithinRadius(-6.2088, 106.8456, 2000)).rejects.toThrow(
        /Couldn't fetch nearby POI data/,
      );
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
