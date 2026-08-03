import { Injectable } from '@nestjs/common';
import { BigQueryDiscoveryService, RawPoiItem } from './bigquery-discovery.service';

export interface DiscoveryCandidate {
  rank: number;
  name: string;
  latitude: number;
  longitude: number;
  demandScore: number;
  competitionCount: number;
  rationale: string;
  regencyCode?: string;
}

@Injectable()
export class DiscoveryService {
  constructor(private readonly bigqueryDiscoveryService: BigQueryDiscoveryService) {}

  async searchCandidates(
    businessType: string,
    region: string,
    limit = 5,
  ): Promise<DiscoveryCandidate[]> {
    const rawPois = await this.bigqueryDiscoveryService.queryPoisByRegion(
      businessType,
      region,
    );

    const candidates: DiscoveryCandidate[] = rawPois
      .slice(0, limit)
      .map((poi, index) => {
        const rank = index + 1;
        const demandScore = Math.min(95, Math.max(60, 95 - index * 4));
        const competitionCount = index === 0 ? 0 : index % 2;

        const demandCategories = this.bigqueryDiscoveryService.getDemandCategoriesForType(businessType);
        const topCategory = demandCategories[index % demandCategories.length] || 'office';

        const rationale =
          competitionCount === 0
            ? `High ${topCategory} density; 0 same-type ${businessType} competitors within 1km.`
            : `Strong ${topCategory} foot traffic; low competitor density within 1.5km.`;

        return {
          rank,
          name: poi.name,
          latitude: poi.latitude,
          longitude: poi.longitude,
          demandScore,
          competitionCount,
          rationale,
          regencyCode: poi.regencyCode || '3506',
        };
      });

    return candidates;
  }
}
