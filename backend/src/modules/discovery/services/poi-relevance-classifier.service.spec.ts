import { Test, TestingModule } from '@nestjs/testing';
import { PoiRelevanceClassifierService, POI_TYPE_STRD_CATEGORIES } from './poi-relevance-classifier.service';

describe('PoiRelevanceClassifierService', () => {
  let service: PoiRelevanceClassifierService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PoiRelevanceClassifierService],
    }).compile();

    service = module.get<PoiRelevanceClassifierService>(PoiRelevanceClassifierService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  function mockModelResponse(text: string) {
    (service as any).model = {
      generateContent: jest.fn().mockResolvedValue({
        response: { candidates: [{ content: { parts: [{ text }] } }] },
      }),
    };
  }

  it('should return only categories present in the fixed poi_type_strd taxonomy', async () => {
    mockModelResponse('["coffee_shop", "cafe", "bakery"]');
    const cats = await service.classifyRelevantCategories('coffee shop');
    expect(cats).toEqual(['coffee_shop', 'cafe', 'bakery']);
    cats.forEach((c) => expect(POI_TYPE_STRD_CATEGORIES).toContain(c));
  });

  it('should discard hallucinated categories that are not in the fixed taxonomy', async () => {
    mockModelResponse('["store", "laundry", "dry_cleaning", "other"]');
    const cats = await service.classifyRelevantCategories('laundry');
    expect(cats).toEqual(['store', 'other']);
  });

  it('should return an empty array when the model finds nothing relevant', async () => {
    mockModelResponse('[]');
    const cats = await service.classifyRelevantCategories('laundry');
    expect(cats).toEqual([]);
  });

  it('should throw a clear error instead of returning fabricated categories when the model is unconfigured', async () => {
    (service as any).model = null;
    await expect(service.classifyRelevantCategories('coffee_shop')).rejects.toThrow(
      /AI category classifier is not configured/,
    );
  });

  it('should throw a clear error instead of silently falling back when the model call fails', async () => {
    (service as any).model = {
      generateContent: jest.fn().mockRejectedValue(new Error('network error')),
    };
    await expect(service.classifyRelevantCategories('coffee_shop')).rejects.toThrow(
      /Couldn't determine relevant nearby POI categories/,
    );
  });

  describe('classifyDemandDriverCategories', () => {
    it('should return only categories present in the fixed poi_type_strd taxonomy', async () => {
      mockModelResponse('["school", "corporate_office"]');
      const cats = await service.classifyDemandDriverCategories('coffee shop');
      expect(cats).toEqual(['school', 'corporate_office']);
      cats.forEach((c) => expect(POI_TYPE_STRD_CATEGORIES).toContain(c));
    });

    it('should discard hallucinated categories that are not in the fixed taxonomy', async () => {
      mockModelResponse('["school", "residential", "office"]');
      const cats = await service.classifyDemandDriverCategories('coffee shop');
      expect(cats).toEqual(['school']);
    });

    it('should throw a clear error instead of returning fabricated categories when the model is unconfigured', async () => {
      (service as any).model = null;
      await expect(service.classifyDemandDriverCategories('coffee_shop')).rejects.toThrow(
        /AI category classifier is not configured/,
      );
    });

    it('should throw a clear error instead of silently falling back when the model call fails', async () => {
      (service as any).model = {
        generateContent: jest.fn().mockRejectedValue(new Error('network error')),
      };
      await expect(service.classifyDemandDriverCategories('coffee_shop')).rejects.toThrow(
        /Couldn't determine demand-driver POI categories/,
      );
    });
  });
});
