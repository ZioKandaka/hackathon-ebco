import { Controller, Get, Param, Res, NotFoundException, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SiteVisitHistoryService } from './services/site-visit-history.service';
import { SiteVisitService, SITE_VISIT_IMAGE_TYPES, SiteVisitImageType } from './services/site-visit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('site-visit')
@UseGuards(JwtAuthGuard)
export class SiteVisitController {
  constructor(
    private readonly siteVisitHistoryService: SiteVisitHistoryService,
    private readonly siteVisitService: SiteVisitService,
  ) {}

  @Get('history')
  async getHistory(@CurrentUser('id') userId: string) {
    const reports = await this.siteVisitHistoryService.getUserRuns(userId);
    return { reports };
  }

  // Proxies the real Street View/satellite image through the backend so the Maps API key never
  // reaches the browser — auth here relies on the existing httpOnly access_token cookie, since
  // plain <img> requests can't attach an Authorization header.
  @Get('reports/:id/image/:type')
  async getImage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Param('type') type: string,
    @Res() res: Response,
  ) {
    const report = await this.siteVisitHistoryService.getReportForUser(userId, id);
    if (!report) {
      throw new NotFoundException('Site visit report not found.');
    }

    if (!SITE_VISIT_IMAGE_TYPES.includes(type as SiteVisitImageType) || !report.availableImageTypes.includes(type as SiteVisitImageType)) {
      throw new NotFoundException('Requested image is not available for this report.');
    }

    const image = await this.siteVisitService.fetchImageBuffer(
      Number(report.latitude),
      Number(report.longitude),
      type as SiteVisitImageType,
    );
    if (!image) {
      throw new NotFoundException('Could not fetch imagery for this report.');
    }

    res.set('Content-Type', image.contentType);
    res.send(image.buffer);
  }
}
