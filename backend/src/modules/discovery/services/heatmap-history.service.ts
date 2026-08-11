import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HeatmapQueryRun, HeatmapFilterJson } from '../entities/heatmap-query-run.entity';
import { WeightedHeatmapPoint } from './discovery.service';

@Injectable()
export class HeatmapHistoryService {
  constructor(
    @InjectRepository(HeatmapQueryRun)
    private readonly heatmapQueryRunRepository: Repository<HeatmapQueryRun>,
  ) {}

  async saveRun(
    userId: string,
    input: {
      locationId?: string;
      locationName: string;
      category: string;
      latitude: number;
      longitude: number;
      radiusKm: number;
      points: WeightedHeatmapPoint[];
      filters?: HeatmapFilterJson[];
      summary: string;
    },
  ): Promise<HeatmapQueryRun> {
    const run = this.heatmapQueryRunRepository.create({
      userId,
      locationId: input.locationId,
      locationName: input.locationName,
      category: input.category,
      latitude: input.latitude,
      longitude: input.longitude,
      radiusKm: input.radiusKm,
      pointCount: input.points.length,
      points: input.points,
      filters: input.filters,
      summary: input.summary,
    });

    return this.heatmapQueryRunRepository.save(run);
  }

  async getUserRuns(userId: string): Promise<HeatmapQueryRun[]> {
    return this.heatmapQueryRunRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
