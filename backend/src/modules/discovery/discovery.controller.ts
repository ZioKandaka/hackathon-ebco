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
}
