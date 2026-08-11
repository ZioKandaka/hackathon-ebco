import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DiscoveryHistoryService } from './discovery-history.service';
import { DiscoverySearchRun } from '../entities/discovery-search-run.entity';

describe('DiscoveryHistoryService', () => {
  let service: DiscoveryHistoryService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'search-uuid-1', createdAt: new Date('2026-08-11T00:00:00.000Z'), ...entity }),
      ),
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscoveryHistoryService,
        {
          provide: getRepositoryToken(DiscoverySearchRun),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<DiscoveryHistoryService>(DiscoveryHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveRun', () => {
    it('should persist a search run scoped to the user with all candidates', async () => {
      const candidates = [
        {
          rank: 1,
          name: 'Spot 1',
          latitude: -7.8167,
          longitude: 112.0117,
          demandScore: 80,
          competitionCount: 1,
          rationale: 'Real rationale.',
          businessType: 'coffee_shop',
        },
      ];

      const result = await service.saveRun('user-1', {
        businessType: 'coffee_shop',
        region: 'Kediri',
        candidates,
        summary: 'Found 1 candidate spot for coffee_shop in Kediri.',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', businessType: 'coffee_shop', region: 'Kediri', candidates }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('search-uuid-1');
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
