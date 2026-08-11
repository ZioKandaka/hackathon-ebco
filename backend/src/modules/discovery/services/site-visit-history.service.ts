import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteVisitReport } from '../entities/site-visit-report.entity';
import { SiteVisitResult } from './site-visit.service';

@Injectable()
export class SiteVisitHistoryService {
  constructor(
    @InjectRepository(SiteVisitReport)
    private readonly siteVisitReportRepository: Repository<SiteVisitReport>,
  ) {}

  async saveRun(
    userId: string,
    input: {
      locationId?: string;
      locationName: string;
      latitude: number;
      longitude: number;
    } & SiteVisitResult,
  ): Promise<SiteVisitReport> {
    const report = this.siteVisitReportRepository.create({
      userId,
      locationId: input.locationId,
      locationName: input.locationName,
      latitude: input.latitude,
      longitude: input.longitude,
      hasStreetViewCoverage: input.hasStreetViewCoverage,
      overallVisualScore: input.overallVisualScore,
      criteria: input.criteria,
      availableImageTypes: input.availableImageTypes,
      summary: input.summary,
    });

    return this.siteVisitReportRepository.save(report);
  }

  async getUserRuns(userId: string): Promise<SiteVisitReport[]> {
    return this.siteVisitReportRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getReportForUser(userId: string, reportId: string): Promise<SiteVisitReport | null> {
    return this.siteVisitReportRepository.findOne({ where: { id: reportId, userId } });
  }
}
