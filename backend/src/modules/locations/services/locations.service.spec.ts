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
      findOne: jest.fn().mockResolvedValue({
        id: 'loc-uuid-1',
        userId: 'user-uuid-1',
        name: 'Existing Branch',
        businessType: 'retail',
        fullAddress: 'Jl. Jend. Sudirman No.10, Jakarta',
        latitude: -6.2088,
        longitude: 106.8456,
      }),
      remove: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
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

  describe('updateLocation', () => {
    it('should update an owned location and persist the changes', async () => {
      const updated = await service.updateLocation('user-uuid-1', 'loc-uuid-1', { name: 'Renamed Branch' });

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'loc-uuid-1', userId: 'user-uuid-1' } });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(updated.name).toBe('Renamed Branch');
    });

    it('should throw NotFoundException when the location does not exist or is not owned by this user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.updateLocation('user-uuid-1', 'loc-uuid-missing', { name: 'X' })).rejects.toThrow(
        'Location not found.',
      );
    });
  });

  describe('deleteLocation', () => {
    it('should delete an owned location', async () => {
      await service.deleteLocation('user-uuid-1', 'loc-uuid-1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 'loc-uuid-1', userId: 'user-uuid-1' } });
      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it('should throw NotFoundException when the location does not exist or is not owned by this user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.deleteLocation('user-uuid-1', 'loc-uuid-missing')).rejects.toThrow('Location not found.');
    });
  });
});
