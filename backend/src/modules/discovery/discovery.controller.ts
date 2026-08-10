import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiscoveryService } from './services/discovery.service';
import { DiscoverySearchDto } from './dto/discovery-search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchCandidates(@Body() dto: DiscoverySearchDto) {
    const candidates = await this.discoveryService.searchCandidates(
      dto.businessType,
      dto.region,
      dto.limit,
    );

    return {
      query: {
        businessType: dto.businessType,
        region: dto.region,
      },
      candidates,
    };
  }

  @Post('nearby-pois')
  @HttpCode(HttpStatus.OK)
  async getNearbyPois(
    @Body() dto: { lat: number; lng: number; businessType: string; radiusMeters?: number },
  ) {
    const pois = await this.discoveryService.getNearbyPoisForCandidate(
      dto.lat,
      dto.lng,
      dto.businessType,
      dto.radiusMeters || 2000,
    );

    return {
      lat: dto.lat,
      lng: dto.lng,
      businessType: dto.businessType,
      radiusMeters: dto.radiusMeters || 2000,
      pois,
    };
  }
}
