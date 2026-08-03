import { Test, TestingModule } from '@nestjs/testing';
import { GeocodingService } from './geocoding.service';

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeocodingService],
    }).compile();

    service = module.get<GeocodingService>(GeocodingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('geocodeAddress', () => {
    it('should return a geocoded address result with coordinates', async () => {
      const results = await service.geocodeAddress('Jl. Sudirman No. 10, Jakarta');

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].latitude).toBeDefined();
      expect(results[0].longitude).toBeDefined();
      expect(results[0].formattedAddress).toBeDefined();
    });
  });
});
