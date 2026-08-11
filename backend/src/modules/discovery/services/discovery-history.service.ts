import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscoverySearchRun } from '../entities/discovery-search-run.entity';
import { DiscoveryCandidate } from './discovery.service';

@Injectable()
export class DiscoveryHistoryService {
  constructor(
    @InjectRepository(DiscoverySearchRun)
    private readonly discoverySearchRunRepository: Repository<DiscoverySearchRun>,
  ) {}

  async saveRun(
    userId: string,
    input: {
      businessType: string;
      region: string;
      candidates: DiscoveryCandidate[];
      summary: string;
    },
  ): Promise<DiscoverySearchRun> {
    const run = this.discoverySearchRunRepository.create({
      userId,
      businessType: input.businessType,
      region: input.region,
      candidates: input.candidates,
      summary: input.summary,
    });

    return this.discoverySearchRunRepository.save(run);
  }

  async getUserRuns(userId: string): Promise<DiscoverySearchRun[]> {
    return this.discoverySearchRunRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
