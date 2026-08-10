import { Test, TestingModule } from '@nestjs/testing';
import { SiteVisitService } from './site-visit.service';

describe('SiteVisitService', () => {
  let service: SiteVisitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SiteVisitService],
    }).compile();

    service = module.get<SiteVisitService>(SiteVisitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeSite', () => {
    it('should generate 4-heading Street View images and satellite snapshot for standard urban coordinates', async () => {
      const result = await service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch');

      expect(result).toBeDefined();
      expect(result.hasStreetViewCoverage).toBe(true);
      expect(result.images.streetViewNorthUrl).toContain('heading=0');
      expect(result.images.streetViewEastUrl).toContain('heading=90');
      expect(result.images.streetViewSouthUrl).toContain('heading=180');
      expect(result.images.streetViewWestUrl).toContain('heading=270');
      expect(result.images.satelliteUrl).toBeDefined();
      expect(result.overallVisualScore).toBeGreaterThan(0);
      expect(result.overallVisualScore).toBeLessThanOrEqual(100);
      expect(result.criteria.storefrontVisibility.score).toBeDefined();
      expect(result.criteria.roadWidthAccess.score).toBeDefined();
    });

    it('should gracefully handle zero Street View coverage coordinates with a satellite-only fallback', async () => {
      // Remote test coordinates (-9.5, 120.0) trigger no-streetview fallback
      const result = await service.analyzeSite(-9.5000, 120.0000, 'Remote Spot');

      expect(result).toBeDefined();
      expect(result.hasStreetViewCoverage).toBe(false);
      expect(result.images.streetViewNorthUrl).toBeUndefined();
      expect(result.images.satelliteUrl).toBeDefined();
      expect(result.summary).toContain('No Street View coverage found');
      expect(result.overallVisualScore).toBeGreaterThan(0);
    });
  });
});
