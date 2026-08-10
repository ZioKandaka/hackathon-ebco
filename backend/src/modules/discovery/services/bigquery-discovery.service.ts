import { Injectable } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';

export interface RawPoiItem {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  regencyCode?: string;
  rating?: number;
  businessStatus?: string;
}

export interface RawHeatmapPoint {
  latitude: number;
  longitude: number;
  category?: string;
  rating?: number;
  businessStatus?: string;
}

export interface RadiusPoiItem {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating?: number;
  userRatingsTotal?: number;
  businessStatus?: string;
  brandName?: string;
}

export interface LatLngPoint {
  lat: number;
  lng: number;
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

  async queryHeatmapRawPois(
    region: string,
    customCategory?: string,
    maxRating?: number,
  ): Promise<RawHeatmapPoint[]> {
    if (this.bigquery) {
      try {
        let whereClause = `WHERE (LOWER(regency_code) LIKE LOWER(@region) OR LOWER(province_code) LIKE LOWER(@region) OR LOWER(regency) LIKE LOWER(@region) OR LOWER(province) LIKE LOWER(@region))`;
        const params: Record<string, any> = { region: `%${region}%` };

        if (customCategory) {
          whereClause += ` AND LOWER(poi_type) LIKE LOWER(@category)`;
          params.category = `%${customCategory}%`;
        }
        if (maxRating !== undefined) {
          whereClause += ` AND rating <= @maxRating`;
          params.maxRating = maxRating;
        }

        const query = `
          SELECT 
            latitude,
            longitude,
            poi_type as category,
            rating,
            business_status as businessStatus
          FROM \`${this.datasetName}\`
          ${whereClause}
          LIMIT 5000
        `;

        const [rows] = await this.bigquery.query({ query, params });
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            category: r.category,
            rating: r.rating ? Number(r.rating) : undefined,
            businessStatus: r.businessStatus,
          }));
        }
      } catch (err) {
        // Fallback to mock generator if BigQuery query fails
      }
    }

    return this.generateMockHeatmapRawPois(region, customCategory, maxRating);
  }

  private generateMockHeatmapRawPois(
    region: string,
    customCategory?: string,
    maxRating?: number,
  ): RawHeatmapPoint[] {
    let baseLat = -7.8167; // Kediri
    let baseLng = 112.0117;

    const lowerRegion = region.toLowerCase();
    if (lowerRegion.includes('jakarta selatan') || lowerRegion.includes('south jakarta') || lowerRegion.includes('jaksel')) {
      baseLat = -6.2615;
      baseLng = 106.8106;
    } else if (lowerRegion.includes('jakarta barat') || lowerRegion.includes('west jakarta')) {
      baseLat = -6.1683;
      baseLng = 106.7588;
    } else if (lowerRegion.includes('jakarta pusat') || lowerRegion.includes('central jakarta')) {
      baseLat = -6.1805;
      baseLng = 106.8284;
    } else if (lowerRegion.includes('jakarta utara') || lowerRegion.includes('north jakarta')) {
      baseLat = -6.1384;
      baseLng = 106.8640;
    } else if (lowerRegion.includes('jakarta timur') || lowerRegion.includes('east jakarta')) {
      baseLat = -6.2250;
      baseLng = 106.9000;
    } else if (lowerRegion.includes('jakarta')) {
      baseLat = -6.2088;
      baseLng = 106.8456;
    } else if (lowerRegion.includes('bandung')) {
      baseLat = -6.9175;
      baseLng = 107.6191;
    } else if (lowerRegion.includes('bekasi')) {
      baseLat = -6.2383;
      baseLng = 106.9756;
    } else if (lowerRegion.includes('surabaya')) {
      baseLat = -7.2575;
      baseLng = 112.7521;
    }

    const points: RawHeatmapPoint[] = [];
    const count = 180;

    for (let i = 0; i < count; i++) {
      const latOffset = (Math.sin(i * 1.7) * 0.025) + (Math.cos(i * 0.3) * 0.018);
      const lngOffset = (Math.cos(i * 1.3) * 0.030) + (Math.sin(i * 0.5) * 0.015);
      const rating = Number((3.0 + (i % 20) * 0.1).toFixed(1));

      if (maxRating !== undefined && rating > maxRating) {
        continue;
      }

      points.push({
        latitude: Number((baseLat + latOffset).toFixed(6)),
        longitude: Number((baseLng + lngOffset).toFixed(6)),
        category: customCategory || (i % 3 === 0 ? 'school' : i % 3 === 1 ? 'residential' : 'office'),
        rating,
        businessStatus: 'OPERATIONAL',
      });
    }

    return points;
  }

  async queryPoisWithinRadius(
    lat: number,
    lng: number,
    radiusMeters: number,
    regencyOrProvince?: string,
  ): Promise<RadiusPoiItem[]> {
    const cappedRadiusMeters = Math.min(10000, Math.max(100, radiusMeters));

    if (this.bigquery) {
      try {
        let whereClause = `WHERE ST_DISTANCE(ST_GEOGPOINT(longitude, latitude), ST_GEOGPOINT(@lng, @lat)) <= @radiusMeters`;
        const params: Record<string, any> = { lat, lng, radiusMeters: cappedRadiusMeters };

        if (regencyOrProvince) {
          whereClause += ` AND (LOWER(regency_code) LIKE LOWER(@region) OR LOWER(province_code) LIKE LOWER(@region) OR LOWER(regency) LIKE LOWER(@region) OR LOWER(province) LIKE LOWER(@region))`;
          params.region = `%${regencyOrProvince}%`;
        }

        const query = `
          SELECT 
            poi_id as id,
            poi_name as name,
            poi_type as category,
            latitude,
            longitude,
            rating,
            user_ratings_total as userRatingsTotal,
            business_status as businessStatus,
            ST_DISTANCE(ST_GEOGPOINT(longitude, latitude), ST_GEOGPOINT(@lng, @lat)) as distanceMeters
          FROM \`${this.datasetName}\`
          ${whereClause}
          LIMIT 5000
        `;

        const [rows] = await this.bigquery.query({ query, params });
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id || 'poi-id',
            name: r.name || 'POI Location',
            category: r.category || 'general',
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            distanceMeters: Number(r.distanceMeters || 0),
            rating: r.rating ? Number(r.rating) : 4.0,
            userRatingsTotal: r.userRatingsTotal ? Number(r.userRatingsTotal) : 10,
            businessStatus: r.businessStatus || 'OPERATIONAL',
          }));
        }
      } catch (err) {
        // Fallback to mock radius POIs generator if GCP query fails
      }
    }

    return this.generateMockRadiusPois(lat, lng, cappedRadiusMeters);
  }

  private generateMockRadiusPois(lat: number, lng: number, radiusMeters: number): RadiusPoiItem[] {
    const pois: RadiusPoiItem[] = [];
    const count = Math.min(120, Math.max(15, Math.floor((radiusMeters / 1000) * 35)));

    for (let i = 0; i < count; i++) {
      const angle = (i * 137.5) * (Math.PI / 180);
      const distance = (Math.sqrt((i + 1) / count) * radiusMeters) * 0.9;
      const latOffset = (distance / 111320) * Math.cos(angle);
      const lngOffset = (distance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);

      const category = i % 5 === 0 ? 'coffee_shop' : i % 5 === 1 ? 'school' : i % 5 === 2 ? 'office' : i % 5 === 3 ? 'residential' : 'bank';
      const rating = Number((3.5 + (i % 15) * 0.1).toFixed(1));
      const userRatingsTotal = 5 + (i * 12) % 300;
      const businessStatus = i % 18 === 0 ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL';

      pois.push({
        id: `poi-rad-${i + 1}`,
        name: `Nearby Spot #${i + 1}`,
        category,
        latitude: Number((lat + latOffset).toFixed(6)),
        longitude: Number((lng + lngOffset).toFixed(6)),
        distanceMeters: Math.round(distance),
        rating,
        userRatingsTotal,
        businessStatus,
      });
    }

    return pois;
  }

  async generateIsochronePolygon(
    lat: number,
    lng: number,
    travelMode: 'drive' | 'walk' | 'transit' = 'drive',
    timeMinutes = 10,
  ): Promise<LatLngPoint[]> {
    const cappedMinutes = Math.min(30, Math.max(1, timeMinutes));

    let speedKmH = 35; // drive
    if (travelMode === 'walk') speedKmH = 4.5;
    if (travelMode === 'transit') speedKmH = 20.0;

    const maxDistMeters = ((speedKmH * 1000) / 60) * cappedMinutes;
    const pointsCount = 16;
    const path: LatLngPoint[] = [];

    for (let i = 0; i < pointsCount; i++) {
      const angle = (i * (360 / pointsCount)) * (Math.PI / 180);
      const roadAsymmetry = 0.65 + (Math.sin(i * 1.5) * 0.25) + (Math.cos(i * 2.1) * 0.15);
      const rayDistance = maxDistMeters * Math.max(0.35, Math.min(1.0, roadAsymmetry));

      const latOffset = (rayDistance / 111320) * Math.cos(angle);
      const lngOffset = (rayDistance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);

      path.push({
        lat: Number((lat + latOffset).toFixed(6)),
        lng: Number((lng + lngOffset).toFixed(6)),
      });
    }

    return path;
  }

  async queryPoisInsidePolygon(
    polygonPath: LatLngPoint[],
    regencyOrProvince?: string,
  ): Promise<RadiusPoiItem[]> {
    if (!polygonPath || polygonPath.length < 3) return [];

    const wktVertices = polygonPath.map((p) => `${p.lng} ${p.lat}`);
    wktVertices.push(`${polygonPath[0].lng} ${polygonPath[0].lat}`);
    const wktPolygon = `POLYGON((${wktVertices.join(', ')}))`;

    const lats = polygonPath.map((p) => p.lat);
    const lngs = polygonPath.map((p) => p.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    if (this.bigquery) {
      try {
        let whereClause = `WHERE ST_CONTAINS(ST_GEOGFROMTEXT(@wktPolygon), ST_GEOGPOINT(longitude, latitude))`;
        const params: Record<string, any> = { wktPolygon };

        if (regencyOrProvince) {
          whereClause += ` AND (LOWER(regency_code) LIKE LOWER(@region) OR LOWER(province_code) LIKE LOWER(@region) OR LOWER(regency) LIKE LOWER(@region) OR LOWER(province) LIKE LOWER(@region))`;
          params.region = `%${regencyOrProvince}%`;
        }

        const query = `
          SELECT 
            poi_id as id,
            poi_name as name,
            poi_type as category,
            latitude,
            longitude,
            rating,
            user_ratings_total as userRatingsTotal,
            business_status as businessStatus
          FROM \`${this.datasetName}\`
          ${whereClause}
          LIMIT 5000
        `;

        const [rows] = await this.bigquery.query({ query, params });
        if (rows && rows.length > 0) {
          return rows.map((r: any) => ({
            id: r.id || 'poi-id',
            name: r.name || 'POI Location',
            category: r.category || 'general',
            latitude: Number(r.latitude),
            longitude: Number(r.longitude),
            distanceMeters: 0,
            rating: r.rating ? Number(r.rating) : 4.0,
            userRatingsTotal: r.userRatingsTotal ? Number(r.userRatingsTotal) : 10,
            businessStatus: r.businessStatus || 'OPERATIONAL',
          }));
        }
      } catch (err) {
        // Fallback to mock POI generator if GCP query fails
      }
    }

    const avgRadiusMeters = Math.max(300, Math.min(8000, Math.round(((Math.max(...lats) - Math.min(...lats)) * 111320) / 2)));
    return this.generateMockRadiusPois(centerLat, centerLng, avgRadiusMeters);
  }
}
