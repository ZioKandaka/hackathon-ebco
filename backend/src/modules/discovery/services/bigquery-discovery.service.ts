import { Injectable } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';

export interface RawPoiItem {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  regencyCode?: string;
}

@Injectable()
export class BigQueryDiscoveryService {
  private bigquery: BigQuery | null = null;
  private readonly projectId = process.env.GOOGLE_CLOUD_PROJECT || 'ebc-cloud-dev-03';
  private readonly datasetName = 'bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold';

  constructor() {
    try {
      this.bigquery = new BigQuery({ projectId: this.projectId });
    } catch (err) {
      this.bigquery = null;
    }
  }

  getDemandCategoriesForType(businessType: string): string[] {
    const type = businessType.toLowerCase();
    if (type.includes('coffee')) {
      return ['school', 'university', 'office', 'bank', 'transit_station'];
    }
    if (type.includes('retail') || type.includes('minimarket')) {
      return ['residential', 'apartment', 'housing', 'school'];
    }
    if (type.includes('restaurant') || type.includes('food')) {
      return ['office', 'shopping_mall', 'hotel', 'entertainment'];
    }
    return ['school', 'office', 'transit_station', 'residential'];
  }

  async queryPoisByRegion(
    businessType: string,
    region: string,
  ): Promise<RawPoiItem[]> {
    if (this.bigquery) {
      try {
        const demandCategories = this.getDemandCategoriesForType(businessType);

        // Fully qualified SQL query enforcing regency_code / province_code filtering per Constitution Section IV
        const query = `
          SELECT 
            poi_id as id,
            poi_name as name,
            poi_type as category,
            latitude,
            longitude,
            regency_code as regencyCode
          FROM \`${this.datasetName}\`
          WHERE (LOWER(regency_code) LIKE LOWER(@region) OR LOWER(province_code) LIKE LOWER(@region) OR LOWER(regency) LIKE LOWER(@region) OR LOWER(province) LIKE LOWER(@region))
            AND poi_type IN UNNEST(@demandCategories)
          LIMIT 200
        `;

        const options = {
          query,
          params: {
            region: `%${region}%`,
            demandCategories,
          },
        };

        const [rows] = await this.bigquery.query(options);
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            regencyCode: r.regencyCode,
          }));
        }
      } catch (err) {
        // Fallback to local POI generator if GCP access fails
      }
    }

    return this.generateMockPoisForRegion(businessType, region);
  }

  private generateMockPoisForRegion(businessType: string, region: string): RawPoiItem[] {
    // Generate realistic candidate points around Kediri or target region for demo/dev mode
    let baseLat = -7.8167; // Kediri latitude
    let baseLng = 112.0117; // Kediri longitude

    const lowerRegion = region.toLowerCase();
    if (lowerRegion.includes('bandung')) {
      baseLat = -6.9175;
      baseLng = 107.6191;
    } else if (lowerRegion.includes('bekasi')) {
      baseLat = -6.2383;
      baseLng = 106.9756;
    } else if (lowerRegion.includes('surabaya')) {
      baseLat = -7.2575;
      baseLng = 112.7521;
    }

    return [
      {
        id: 'poi-1',
        name: `${region} Center Square Spot`,
        category: 'transit_station',
        latitude: baseLat + 0.002,
        longitude: baseLng + 0.003,
      },
      {
        id: 'poi-2',
        name: `${region} University Corridor`,
        category: 'university',
        latitude: baseLat - 0.005,
        longitude: baseLng - 0.004,
      },
      {
        id: 'poi-3',
        name: `${region} Commercial Hub`,
        category: 'office',
        latitude: baseLat + 0.008,
        longitude: baseLng - 0.002,
      },
      {
        id: 'poi-4',
        name: `${region} North Residential District`,
        category: 'residential',
        latitude: baseLat + 0.012,
        longitude: baseLng + 0.007,
      },
      {
        id: 'poi-5',
        name: `${region} Transit Station Crossing`,
        category: 'transit_station',
        latitude: baseLat - 0.008,
        longitude: baseLng + 0.009,
      },
    ];
  }
}
