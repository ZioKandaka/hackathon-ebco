import { Test, TestingModule } from '@nestjs/testing';
import { BigQueryDiscoveryService } from './bigquery-discovery.service';

describe('BigQueryDiscoveryService', () => {
  let service: BigQueryDiscoveryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BigQueryDiscoveryService],
    }).compile();

    service = module.get<BigQueryDiscoveryService>(BigQueryDiscoveryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDemandCategoriesForType', () => {
    it('should map coffee shop to relevant demand categories', () => {
      const categories = service.getDemandCategoriesForType('coffee_shop');
      expect(categories).toContain('university');
      expect(categories).toContain('office');
    });

    it('should map minimarket to residential demand categories', () => {
      const categories = service.getDemandCategoriesForType('minimarket');
      expect(categories).toContain('residential');
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
});
