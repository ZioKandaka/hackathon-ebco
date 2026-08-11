import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SiteVisitHistoryService } from './site-visit-history.service';
import { SiteVisitReport } from '../entities/site-visit-report.entity';

describe('SiteVisitHistoryService', () => {
  let service: SiteVisitHistoryService;
  let mockRepository: any;

  const baseCriteria = {
    storefrontVisibility: { score: 85, justification: 'Clear frontage.' },
    roadWidthAccess: { score: 80, justification: 'Wide road.' },
    trafficVisibility: { score: 78, justification: 'Steady traffic.' },
    buildingTypes: { score: 82, justification: 'Commercial buildings.' },
    areaCondition: { score: 88, justification: 'Well maintained.' },
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'report-uuid-1', createdAt: new Date('2026-08-11T00:00:00.000Z'), ...entity }),
      ),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteVisitHistoryService,
        {
          provide: getRepositoryToken(SiteVisitReport),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SiteVisitHistoryService>(SiteVisitHistoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveRun', () => {
    it('should persist a report scoped to the user with all computed fields', async () => {
      const result = await service.saveRun('user-1', {
        locationName: 'Sudirman Branch',
        latitude: -6.2088,
        longitude: 106.8456,
        hasStreetViewCoverage: true,
        overallVisualScore: 83,
        criteria: baseCriteria,
        availableImageTypes: ['north', 'east', 'south', 'west', 'satellite'],
        summary: 'AI Site Visit Report ready.',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', locationName: 'Sudirman Branch', overallVisualScore: 83 }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.id).toBe('report-uuid-1');
    });
  });

  describe('getUserRuns', () => {
    it("should query only that user's reports, most recent first", async () => {
      await service.getUserRuns('user-1');

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        order: { createdAt: 'DESC' },
        take: 100,
      });
    });
  });

  describe('getReportForUser', () => {
    it('should scope lookup to both report ID and owning user', async () => {
      await service.getReportForUser('user-1', 'report-uuid-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'report-uuid-1', userId: 'user-1' },
      });
    });
  });
});
