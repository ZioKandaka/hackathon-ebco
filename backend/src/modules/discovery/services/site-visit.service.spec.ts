import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { SiteVisitService } from './site-visit.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SiteVisitService', () => {
  let service: SiteVisitService;

  const fullCriteria = {
    storefrontVisibility: { score: 85, justification: 'Clear main-road frontage.' },
    roadWidthAccess: { score: 80, justification: 'Wide arterial road with driveway access.' },
    trafficVisibility: { score: 78, justification: 'Steady pedestrian and vehicle movement visible.' },
    buildingTypes: { score: 82, justification: 'Modern commercial storefronts nearby.' },
    areaCondition: { score: 88, justification: 'Well-maintained pavements and lighting.' },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [SiteVisitService],
    }).compile();

    service = module.get<SiteVisitService>(SiteVisitService);
    process.env.GOOGLE_MAPS_API_KEY = 'test-key';
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

  function mockAxiosDefaults(hasCoverage: boolean) {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/streetview/metadata')) {
        return Promise.resolve({ data: { status: hasCoverage ? 'OK' : 'ZERO_RESULTS' } });
      }
      // Image byte fetches (street view tiles or satellite)
      return Promise.resolve({
        data: Buffer.from('fake-image-bytes'),
        headers: { 'content-type': 'image/jpeg' },
      });
    });
  }

  describe('analyzeSite', () => {
    it('should real-check coverage, fetch 4 headings + satellite, and score via the vision model for covered coordinates', async () => {
      mockAxiosDefaults(true);
      mockModelResponse(JSON.stringify(fullCriteria));

      const result = await service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch');

      expect(result.hasStreetViewCoverage).toBe(true);
      expect(result.availableImageTypes).toEqual(['north', 'east', 'south', 'west', 'satellite']);
      expect(result.criteria).toEqual(fullCriteria);
      expect(result.overallVisualScore).toBe(
        Math.round(85 * 0.3 + 80 * 0.25 + 78 * 0.2 + 82 * 0.15 + 88 * 0.1),
      );
      expect(result.summary).toContain('Overall Visual Rating');

      // 1 metadata call + 5 image fetches (4 headings + satellite)
      expect(mockedAxios.get).toHaveBeenCalledTimes(6);
    });

    it('should fall back to satellite-only imagery when Street View has zero coverage', async () => {
      mockAxiosDefaults(false);
      mockModelResponse(JSON.stringify(fullCriteria));

      const result = await service.analyzeSite(-9.5, 120.0, 'Remote Spot');

      expect(result.hasStreetViewCoverage).toBe(false);
      expect(result.availableImageTypes).toEqual(['satellite']);
      expect(result.summary).toContain('No Street View coverage found');
      // 1 metadata call + 1 satellite image fetch
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should throw a real error (never fabricate scores) when the vision model is unconfigured', async () => {
      mockAxiosDefaults(true);
      (service as any).model = null;

      await expect(service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch')).rejects.toThrow(
        'AI vision model is not configured',
      );
    });

    it('should throw when the Street View metadata check fails on a network error', async () => {
      mockedAxios.get.mockRejectedValue(new Error('network timeout'));

      await expect(service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch')).rejects.toThrow(
        'Could not verify Street View coverage',
      );
    });

    it('should throw when no image bytes could be fetched at all', async () => {
      mockedAxios.get.mockImplementation((url: string) => {
        if (url.includes('/streetview/metadata')) {
          return Promise.resolve({ data: { status: 'OK' } });
        }
        return Promise.reject(new Error('image fetch failed'));
      });
      mockModelResponse(JSON.stringify(fullCriteria));

      await expect(service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch')).rejects.toThrow(
        'Could not fetch any site imagery',
      );
    });

    it('should throw when the vision model response is missing a required criterion', async () => {
      mockAxiosDefaults(true);
      const { areaCondition, ...incomplete } = fullCriteria;
      mockModelResponse(JSON.stringify(incomplete));

      await expect(service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch')).rejects.toThrow(
        'Could not complete AI visual analysis',
      );
    });

    it('should throw when the vision model response is not valid JSON', async () => {
      mockAxiosDefaults(true);
      mockModelResponse('Sorry, I cannot help with that.');

      await expect(service.analyzeSite(-6.2088, 106.8456, 'Sudirman Branch')).rejects.toThrow(
        'Could not complete AI visual analysis',
      );
    });
  });

  describe('fetchImageBuffer', () => {
    it('should return null (not throw) when the image request fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('404'));
      const result = await service.fetchImageBuffer(-6.2088, 106.8456, 'satellite');
      expect(result).toBeNull();
    });

    it('should return the buffer and content type on success', async () => {
      mockedAxios.get.mockResolvedValue({
        data: Buffer.from('bytes'),
        headers: { 'content-type': 'image/png' },
      });
      const result = await service.fetchImageBuffer(-6.2088, 106.8456, 'north');
      expect(result).not.toBeNull();
      expect(result?.contentType).toBe('image/png');
    });
  });
});
