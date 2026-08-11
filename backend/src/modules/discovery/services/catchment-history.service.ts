import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatchmentAnalysisRun } from '../entities/catchment-analysis-run.entity';
import { CatchmentCalculationResult } from './discovery.service';

@Injectable()
export class CatchmentHistoryService {
  constructor(
    @InjectRepository(CatchmentAnalysisRun)
    private readonly catchmentRunRepository: Repository<CatchmentAnalysisRun>,
  ) {}

  async saveRun(
    userId: string,
    input: {
      locationName: string;
      category: string;
      latitude: number;
      longitude: number;
      radiusKm: number;
    } & CatchmentCalculationResult,
  ): Promise<CatchmentAnalysisRun> {
    const run = this.catchmentRunRepository.create({
      userId,
      locationName: input.locationName,
      category: input.category,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      compositeScore: input.compositeScore,
      subScores: input.subScores,
      weights: input.weights,
      poiCount: input.poiCount,
      contributingPois: input.contributingPois,
      explanations: input.explanations,
      summary: input.summary,
    });

    return this.catchmentRunRepository.save(run);
  }

  async getUserRuns(userId: string): Promise<CatchmentAnalysisRun[]> {
    return this.catchmentRunRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
