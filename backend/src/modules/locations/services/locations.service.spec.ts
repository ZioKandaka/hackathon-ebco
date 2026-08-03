import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LocationsService } from './locations.service';
import { UserLocation } from '../entities/user-location.entity';

describe('LocationsService', () => {
  let service: LocationsService;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      find: jest.fn().mockResolvedValue([
        {
          id: 'loc-uuid-1',
          userId: 'user-uuid-1',
          name: 'Existing Branch',
          businessType: 'retail',
          fullAddress: 'Jl. Jend. Sudirman No.10, Jakarta',
          latitude: -6.2088,
          longitude: 106.8456,
        },
      ]),
      create: jest.fn().mockImplementation((dto) => dto),
      save: jest.fn().mockImplementation((entity) =>
        Promise.resolve({ id: 'loc-uuid-2', ...entity, createdAt: new Date() }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationsService,
        {
          provide: getRepositoryToken(UserLocation),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<LocationsService>(LocationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findDuplicateLocation', () => {
    it('should detect duplicate location when addresses match', async () => {
      const duplicate = await service.findDuplicateLocation(
        'user-uuid-1',
        'Jl. Jend. Sudirman No.10',
      );

      expect(duplicate).toBeDefined();
      expect(duplicate?.name).toBe('Existing Branch');
    });

    it('should return null when address does not match existing locations', async () => {
      const duplicate = await service.findDuplicateLocation(
        'user-uuid-1',
        'Jl. Gatot Subroto No.999',
      );

      expect(duplicate).toBeNull();
    });
  });
});
