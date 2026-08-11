import { Test, TestingModule } from '@nestjs/testing';
import { CatchmentExplanationService, CatchmentExplanationInput } from './catchment-explanation.service';

describe('CatchmentExplanationService', () => {
  let service: CatchmentExplanationService;

  const baseInput: CatchmentExplanationInput = {
    category: 'coffee_shop',
    locationName: 'Sudirman Branch',
    radiusKm: 2,
    subScores: {
      demandDensity: 80,
      trafficProxy: 70,
      areaQuality: 85,
      competitionPenalty: 24,
      networkSaturation: 0,
      operationalVitality: 95,
    },
    weights: {
      demandDensity: 0.3,
      trafficProxy: 0.2,
      areaQuality: 0.2,
      competitionPenalty: 0.15,
      networkSaturation: 0.1,
      operationalVitality: 0.05,
    },
    contributingPois: {
      demandDensity: [{ id: 'poi-1', name: 'SDN 1', category: 'school', latitude: -6.2088, longitude: 106.8456, distanceMeters: 300 }],
      trafficProxy: [],
      areaQuality: [],
      competitionPenalty: [{ id: 'poi-2', name: 'Kopi Rival', category: 'coffee_shop', latitude: -6.2090, longitude: 106.8460, distanceMeters: 900, rating: 4.1 }],
      networkSaturation: [],
      operationalVitality: [],
    },
  };

  const fullExplanations = {
    demandDensity: 'Explained demand.',
    trafficProxy: 'Explained traffic.',
    areaQuality: 'Explained area quality.',
    competitionPenalty: 'Explained competition penalty because there are 2 competitors and none closer than 1km.',
    networkSaturation: 'Explained saturation.',
    operationalVitality: 'Explained vitality.',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CatchmentExplanationService],
    }).compile();

    service = module.get<CatchmentExplanationService>(CatchmentExplanationService);
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

  it('should return one explanation per sub-score when the model returns a complete, valid response', async () => {
    mockModelResponse(JSON.stringify(fullExplanations));
    const result = await service.generateExplanations(baseInput);
    expect(result).toEqual(fullExplanations);
  });

  it('should return null (not throw, not fabricate) when the model is unconfigured', async () => {
    (service as any).model = null;
    const result = await service.generateExplanations(baseInput);
    expect(result).toBeNull();
  });

  it('should return null (not throw) when the model call fails', async () => {
    (service as any).model = {
      generateContent: jest.fn().mockRejectedValue(new Error('network error')),
    };
    const result = await service.generateExplanations(baseInput);
    expect(result).toBeNull();
  });

  it('should return null when the response is missing one or more of the 6 required keys, rather than showing a partial panel', async () => {
    const { networkSaturation, ...incomplete } = fullExplanations;
    mockModelResponse(JSON.stringify(incomplete));
    const result = await service.generateExplanations(baseInput);
    expect(result).toBeNull();
  });

  it('should return null when the model response is not valid JSON', async () => {
    mockModelResponse('Sorry, I cannot help with that.');
    const result = await service.generateExplanations(baseInput);
    expect(result).toBeNull();
  });
});
