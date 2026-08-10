import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BigQuery } from '@google-cloud/bigquery';
import axios from 'axios';
import { IsochroneCache } from '../entities/isochrone-cache.entity';

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
  private readonly logger = new Logger(BigQueryDiscoveryService.name);
  private bigquery: BigQuery | null = null;
  private readonly projectId = process.env.GOOGLE_CLOUD_PROJECT || 'ebc-cloud-dev-03';
  private readonly datasetName = 'bni-geospatial-845e.bni_geospatial_gold_zone.obt_poi_gold';

  constructor(
    @InjectRepository(IsochroneCache)
    private readonly isochroneCacheRepository: Repository<IsochroneCache>,
  ) {
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

  getRelevantDisplayCategoriesForType(businessType: string): string[] {
    const type = (businessType || '').toLowerCase();
    if (type.includes('coffee') || type.includes('cafe')) {
      return ['coffee_shop', 'cafe', 'bakery'];
    }
    if (type.includes('restaurant') || type.includes('food') || type.includes('culinary')) {
      return ['restaurant', 'cafe', 'food_court', 'bakery'];
    }
    if (type.includes('minimarket') || type.includes('retail') || type.includes('convenience') || type.includes('supermarket')) {
      return ['minimarket', 'convenience_store', 'supermarket'];
    }
    if (type.includes('laundry') || type.includes('dry clean')) {
      return ['laundry', 'dry_cleaning'];
    }
    return [type || 'business'];
  }

  async queryPoisByRegion(
    businessType: string,
    region: string,
  ): Promise<RawPoiItem[]> {
    if (this.bigquery) {
      try {
        const demandCategories = this.getDemandCategoriesForType(businessType);

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
      } catch (err: any) {
        this.logger.error(`BigQuery region POI query error: ${err.message}`);
      }
    }

    return this.generateMockPoisForRegion(businessType, region);
  }

  private generateMockPoisForRegion(businessType: string, region: string): RawPoiItem[] {
    let baseLat = -7.8167; // Kediri
    let baseLng = 112.0117;

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
      } catch (err: any) {
        this.logger.error(`BigQuery heatmap POI query error: ${err.message}`);
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
    relevantCategories?: string[],
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

        if (relevantCategories && relevantCategories.length > 0) {
          whereClause += ` AND poi_type IN UNNEST(@relevantCategories)`;
          params.relevantCategories = relevantCategories;
        }

        const query = `
          SELECT 
            poi_name as name,
            poi_id as id,
            poi_type as category,
            latitude,
            longitude,
            rating,
            user_rating_count as userRatingsTotal,
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
            distanceMeters: Number(Math.floor(r.distanceMeters) || 0),
            rating: r.rating ? Number(r.rating) : 4.0,
            userRatingsTotal: r.userRatingsTotal ? Number(r.userRatingsTotal) : 10,
            businessStatus: r.businessStatus || 'OPERATIONAL',
          }));
        }
      } catch (err: any) {
        this.logger.error(`BigQuery radius POI query error: ${err.message}`);
      }
    }

    return this.generateMockRadiusPois(lat, lng, cappedRadiusMeters, relevantCategories);
  }

  private generateMockRadiusPois(
    lat: number,
    lng: number,
    radiusMeters: number,
    relevantCategories?: string[],
  ): RadiusPoiItem[] {
    const pois: RadiusPoiItem[] = [];
    const count = Math.min(120, Math.max(15, Math.floor((radiusMeters / 1000) * 35)));

    const categories = relevantCategories && relevantCategories.length > 0
      ? relevantCategories
      : ['coffee_shop', 'cafe', 'bakery'];

    const coffeeNames = ['Kopi Kenangan', 'Janji Jiwa', 'Kopi Lain Hati', 'Kopi Soe', 'Point Coffee', 'Fore Coffee', 'Tomoro Coffee', 'Excelso Cafe', 'Bumi Kopi', 'Starbucks', 'Kopi Titik Temu', 'Kopi Kenangan Express'];
    const cafeNames = ['Ruma Kopi Cafe', 'Monopoli Cafe', 'Titik Terang Cafe', 'Sejiwa Coffee & Cafe', 'Senja Cafe', 'Teras Kopi Cafe', 'Lokal Kopi Studio', 'Satu Atap Cafe'];
    const bakeryNames = ['Holland Bakery', 'BreadTalk', 'Tous Les Jours', 'Marter Bakery', 'Rotio', 'Roti O Station', 'Mimi Bakery'];
    const restaurantNames = ['Ayam Goreng Suharmarti', 'Warung Bu Kris', 'Soto Ayam Ambengan', 'Bebek Sinjay', 'Bakso Kota Manalagi', 'Sate Khas Senayan', 'Dapur Solo', 'Padang Sederhana', 'Mie Gacoan', 'Solaria'];
    const retailNames = ['Indomaret Point', 'Alfamart Express', 'Alfamidi Super', 'Circle K', 'FamilyMart', 'Lawson Station', 'Super Indo', 'Transmart Express'];
    const laundryNames = ['Simply Fresh Laundry', 'SuperWash Laundry', 'Koin Laundry Express', 'Clean & Fresh Dry Cleaning', 'QuickWash Laundry'];

    for (let i = 0; i < count; i++) {
      const angle = (i * 137.5) * (Math.PI / 180);
      const distance = (Math.sqrt((i + 1) / count) * radiusMeters) * 0.9;
      const latOffset = (distance / 111320) * Math.cos(angle);
      const lngOffset = (distance / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);

      const category = categories[i % categories.length];
      const rating = Number((3.5 + (i % 15) * 0.1).toFixed(1));
      const userRatingsTotal = 5 + (i * 12) % 300;
      const businessStatus = i % 18 === 0 ? 'CLOSED_PERMANENTLY' : 'OPERATIONAL';

      let nameList = coffeeNames;
      if (category.includes('cafe')) nameList = cafeNames;
      else if (category.includes('bakery')) nameList = bakeryNames;
      else if (category.includes('restaurant') || category.includes('food')) nameList = restaurantNames;
      else if (category.includes('minimarket') || category.includes('convenience') || category.includes('retail')) nameList = retailNames;
      else if (category.includes('laundry') || category.includes('dry')) nameList = laundryNames;

      const baseName = nameList[i % nameList.length];
      const name = `${baseName} #${i + 1}`;

      pois.push({
        id: `poi-rad-${i + 1}`,
        name,
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
    const roundedLat = Number(lat.toFixed(3));
    const roundedLng = Number(lng.toFixed(3));
    const cacheKey = `${roundedLat},${roundedLng}:${travelMode}:${cappedMinutes}`;

    // 1. Check Postgres IsochroneCache
    if (this.isochroneCacheRepository) {
      try {
        const cached = await this.isochroneCacheRepository.findOne({ where: { cacheKey } });
        if (cached && cached.polygonCoordinates && cached.polygonCoordinates.length >= 3) {
          this.logger.log(`Isochrone cache hit for key: ${cacheKey}`);
          return cached.polygonCoordinates;
        }
      } catch (cacheErr: any) {
        this.logger.warn(`Isochrone cache lookup error: ${cacheErr.message}`);
      }
    }

    // 2. Sample 16 radial direction rays
    const pointsCount = 16;
    let maxDistMeters = 6000;
    if (travelMode === 'walk') maxDistMeters = 800;
    if (travelMode === 'transit') maxDistMeters = 3500;

    const sampledDests: Array<{ lat: number; lng: number }> = [];

    for (let i = 0; i < pointsCount; i++) {
      const angle = (i * (360 / pointsCount)) * (Math.PI / 180);
      const latOffset = (maxDistMeters / 111320) * Math.cos(angle);
      const lngOffset = (maxDistMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);
      sampledDests.push({
        lat: Number((lat + latOffset).toFixed(6)),
        lng: Number((lng + lngOffset).toFixed(6)),
      });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    const modeParam = travelMode === 'walk' ? 'walking' : travelMode === 'transit' ? 'transit' : 'driving';
    const destinationsParam = sampledDests.map((d) => `${d.lat},${d.lng}`).join('|');
    const matrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${lat},${lng}&destinations=${destinationsParam}&mode=${modeParam}&key=${apiKey}`;

    if (!apiKey) {
      this.logger.warn('Google Maps API key is unconfigured. Generating fallback ray polygon.');
      throw new Error(`Missing Google Map API Key`);
    }

    try {
      const response = await axios.get(matrixUrl, { timeout: 8000 });
      if (response.data.status !== 'OK') {
        throw new Error(`Routes API distance matrix error: ${response.data.error_message || response.data.status}`);
      }

      const elements = response.data.rows[0]?.elements;
      if (!elements || elements.length < pointsCount) {
        throw new Error('Routes API distance matrix returned incomplete elements.');
      }

      const targetSeconds = cappedMinutes * 60;
      const path: LatLngPoint[] = [];

      for (let i = 0; i < pointsCount; i++) {
        const elem = elements[i];
        let durationSeconds = elem?.duration?.value || targetSeconds * 1.1;

        if (elem.status !== 'OK') {
          durationSeconds = targetSeconds * 1.1;
        }

        const fraction = Math.min(1.0, Math.max(0.15, targetSeconds / durationSeconds));
        const angle = (i * (360 / pointsCount)) * (Math.PI / 180);
        const actualDistMeters = maxDistMeters * fraction;

        const latOffset = (actualDistMeters / 111320) * Math.cos(angle);
        const lngOffset = (actualDistMeters / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle);

        path.push({
          lat: Number((lat + latOffset).toFixed(6)),
          lng: Number((lng + lngOffset).toFixed(6)),
        });
      }

      // 3. Save calculated path into Postgres IsochroneCache
      if (this.isochroneCacheRepository) {
        try {
          const newCache = this.isochroneCacheRepository.create({
            cacheKey,
            polygonCoordinates: path,
          });
          await this.isochroneCacheRepository.save(newCache);
        } catch (saveErr: any) {
          this.logger.warn(`Failed to save isochrone cache: ${saveErr.message}`);
        }
      }

      return path;
    } catch (err: any) {
      this.logger.error(`Routes API isochrone computation error: ${err.message}`);
      throw new Error(`Failed to compute travel-time isochrone from Routes API: ${err.message}`);
    }
  }

  async queryPoisInsidePolygon(
    polygonPath: LatLngPoint[],
    regencyOrProvince?: string,
  ): Promise<RadiusPoiItem[]> {
    if (!polygonPath || polygonPath.length < 3) return [];

    const wktVertices = polygonPath.map((p) => `${p.lng} ${p.lat}`);
    wktVertices.push(`${polygonPath[0].lng} ${polygonPath[0].lat}`);
    const wktPolygon = `POLYGON((${wktVertices.join(', ')}))`;

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
            user_rating_count as userRatingsTotal,
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
        return [];
      } catch (err: any) {
        this.logger.error(`BigQuery polygon POI query error: ${err.message}`);
        throw new Error(`BigQuery POI query failed: ${err.message}`);
      }
    }

    // In dev mode when BigQuery client is unconfigured, return mock POIs
    const lats = polygonPath.map((p) => p.lat);
    const lngs = polygonPath.map((p) => p.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const avgRadiusMeters = Math.max(300, Math.min(8000, Math.round(((Math.max(...lats) - Math.min(...lats)) * 111320) / 2)));

    return this.generateMockRadiusPois(centerLat, centerLng, avgRadiusMeters);
  }
}
