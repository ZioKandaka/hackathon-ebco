import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HeatmapHistoryService } from './heatmap-history.service';
import { HeatmapQueryRun } from '../entities/heatmap-query-run.entity';

describe('HeatmapHistoryService', () => {
  let service: HeatmapHistoryService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'heatmap-uuid-1', createdAt: new Date('2026-08-11T00:00:00.000Z'), ...entity }),
      ),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeatmapHistoryService,
        {
          provide: getRepositoryToken(HeatmapQueryRun),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<HeatmapHistoryService>(HeatmapHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveRun', () => {
    it('should persist a heatmap run scoped to the user, deriving pointCount from the points array', async () => {
      const points = [
        { lat: -6.2088, lng: 106.8456, weight: 1 },
        { lat: -6.2090, lng: 106.8460, weight: 1 },
      ];

      const result = await service.saveRun('user-1', {
        locationId: 'loc-1',
        locationName: 'Sudirman Branch',
        category: 'school',
        latitude: -6.2088,
        longitude: 106.8456,
        radiusKm: 5,
        points,
        summary: 'Showing 2 school-related POI within 5km.',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', locationId: 'loc-1', category: 'school', pointCount: 2, points }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('heatmap-uuid-1');
    });
  });

  describe('getUserRuns', () => {
    it("should query only that user's runs, most recent first", async () => {
      await service.getUserRuns('user-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });
});
