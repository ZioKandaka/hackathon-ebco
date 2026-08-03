import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLocation } from '../entities/user-location.entity';
import { CreateLocationDto } from '../dto/create-location.dto';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(UserLocation)
    private readonly locationRepository: Repository<UserLocation>,
  ) {}

  async getUserLocations(userId: string): Promise<UserLocation[]> {
    return this.locationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findDuplicateLocation(userId: string, fullAddress: string): Promise<UserLocation | null> {
    const locations = await this.getUserLocations(userId);
    const normalizedInput = fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');

    return (
      locations.find((loc) => {
        const normalizedExisting = loc.fullAddress.toLowerCase().replace(/[^a-z0-9]/g, '');
        return normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting);
      }) || null
    );
  }

  async createLocation(userId: string, dto: CreateLocationDto): Promise<UserLocation> {
    const location = this.locationRepository.create({
      userId,
      name: dto.name,
      businessType: dto.businessType,
      fullAddress: dto.fullAddress,
      latitude: dto.latitude,
      longitude: dto.longitude,
      province: dto.province,
      regency: dto.regency,
      subDistrict: dto.subDistrict,
      postalCode: dto.postalCode,
      confidence: dto.confidence ?? 1.0,
    });

    return this.locationRepository.save(location);
  }
}
