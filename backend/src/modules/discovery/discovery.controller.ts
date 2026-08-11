import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DiscoveryService } from './services/discovery.service';
import { DiscoveryHistoryService } from './services/discovery-history.service';
import { DiscoverySearchDto } from './dto/discovery-search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('discovery')
@UseGuards(JwtAuthGuard)
export class DiscoveryController {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly discoveryHistoryService: DiscoveryHistoryService,
  ) {}

  @Get('history')
  async getHistory(@CurrentUser('id') userId: string) {
    const runs = await this.discoveryHistoryService.getUserRuns(userId);
    return { runs };
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  async searchCandidates(@CurrentUser('id') userId: string, @Body() dto: DiscoverySearchDto) {
    const candidates = await this.discoveryService.searchCandidates(
      dto.businessType,
      dto.region,
      dto.limit,
    );

    const summary = `Found ${candidates.length} candidate spot${candidates.length === 1 ? '' : 's'} for ${dto.businessType} in ${dto.region}.`;

    try {
      await this.discoveryHistoryService.saveRun(userId, {
        businessType: dto.businessType,
        region: dto.region,
        candidates,
        summary,
      });
    } catch (err: any) {
      // Persistence failure shouldn't take down an otherwise-successful search.
      console.error('Failed to persist discovery search run:', err.message);
    }

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
