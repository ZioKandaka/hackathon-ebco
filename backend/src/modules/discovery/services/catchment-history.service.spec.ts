import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CatchmentHistoryService } from './catchment-history.service';
import { CatchmentAnalysisRun } from '../entities/catchment-analysis-run.entity';

describe('CatchmentHistoryService', () => {
  let service: CatchmentHistoryService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'run-uuid-1', ...entity })),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatchmentHistoryService,
        {
          provide: getRepositoryToken(CatchmentAnalysisRun),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CatchmentHistoryService>(CatchmentHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveRun', () => {
    it('should persist a run scoped to the user with all computed fields', async () => {
      const result = await service.saveRun('user-1', {
        locationName: 'Sudirman Branch',
        category: 'coffee_shop',
        latitude: -6.2088,
        longitude: 106.8456,
        radiusKm: 2.0,
        compositeScore: 82,
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
        poiCount: 42,
        contributingPois: {
          demandDensity: [],
          trafficProxy: [],
          areaQuality: [],
          competitionPenalty: [],
          networkSaturation: [],
          operationalVitality: [],
        },
        explanations: null,
        summary: 'Catchment analysis ready.',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', locationName: 'Sudirman Branch', category: 'coffee_shop', compositeScore: 82 }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('run-uuid-1');
    });
  });

  describe('getUserRuns', () => {
    it('should query only that user\'s runs, most recent first', async () => {
      await service.getUserRuns('user-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });
});
