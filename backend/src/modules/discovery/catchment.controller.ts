import { Controller, Get, UseGuards } from '@nestjs/common';
import { CatchmentHistoryService } from './services/catchment-history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('catchment')
@UseGuards(JwtAuthGuard)
export class CatchmentController {
  constructor(private readonly catchmentHistoryService: CatchmentHistoryService) {}

  @Get('history')
  async getHistory(@CurrentUser('id') userId: string) {
    const runs = await this.catchmentHistoryService.getUserRuns(userId);
    return { runs };
  }
}
