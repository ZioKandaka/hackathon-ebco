import { Controller, Get, UseGuards } from '@nestjs/common';
import { HeatmapHistoryService } from './services/heatmap-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('heatmap')
@UseGuards(JwtAuthGuard)
export class HeatmapController {
  constructor(private readonly heatmapHistoryService: HeatmapHistoryService) {}

  @Get('history')
  async getHistory(@CurrentUser('id') userId: string) {
    const runs = await this.heatmapHistoryService.getUserRuns(userId);
    return { runs };
  }
}
