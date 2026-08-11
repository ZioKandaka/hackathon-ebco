import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BigQuery } from '@google-cloud/bigquery';
import axios from 'axios';
import { IsochroneCache } from '../entities/isochrone-cache.entity';
import { ValidatedHeatmapFilter, buildHeatmapFilterSql } from './heatmap-filter.util';

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

export interface RadiusPoiItem {
  id: string;
  name: string;
  category: string;
  // The standardized poi_type_strd value (fixed 24-category taxonomy) — use this, not
  // `category` (the noisy free-text poi_type column), for any exact category matching.
  standardizedCategory: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating?: number;
  userRatingsTotal?: number;
  businessStatus?: string;
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

  async queryPoisByRegion(
    businessType: string,
    region: string,
  ): Promise<RawPoiItem[]> {
    if (!this.bigquery) {
      throw new Error('BigQuery client is not configured. Cannot fetch POI data right now — please try again later.');
    }

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

    try {
      const [rows] = await this.bigquery.query(options);
      return (rows || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        regencyCode: r.regencyCode,
      }));
    } catch (err: any) {
      this.logger.error(`BigQuery region POI query error: ${err.message}`);
      throw new Error(`Couldn't fetch location data for that region — please try again.`);
    }
  }

  async queryPoisWithinRadius(
    lat: number,
    lng: number,
    radiusMeters: number,
    regencyOrProvince?: string,
    relevantCategories?: string[],
    attributeFilters?: ValidatedHeatmapFilter[],
  ): Promise<RadiusPoiItem[]> {
    const cappedRadiusMeters = Math.min(10000, Math.max(100, radiusMeters));

    if (!this.bigquery) {
      throw new Error('BigQuery client is not configured. Cannot fetch POI data right now — please try again later.');
    }

    let whereClause = `WHERE ST_DISTANCE(ST_GEOGPOINT(longitude, latitude), ST_GEOGPOINT(@lng, @lat)) <= @radiusMeters`;
    const params: Record<string, any> = { lat, lng, radiusMeters: cappedRadiusMeters };

    if (regencyOrProvince) {
      whereClause += ` AND (LOWER(regency_code) LIKE LOWER(@region) OR LOWER(province_code) LIKE LOWER(@region) OR LOWER(regency) LIKE LOWER(@region) OR LOWER(province) LIKE LOWER(@region))`;
      params.region = `%${regencyOrProvince}%`;
    }

    if (relevantCategories && relevantCategories.length > 0) {
      // relevantCategories are always values from the fixed poi_type_strd taxonomy
      // (see PoiRelevanceClassifierService) — filter on that standardized column, not the
      // noisy free-text poi_type column.
      whereClause += ` AND poi_type_strd IN UNNEST(@relevantCategories)`;
      params.relevantCategories = relevantCategories;
    }

    if (attributeFilters && attributeFilters.length > 0) {
      whereClause += ` ${buildHeatmapFilterSql(attributeFilters, params)}`;
    }

    const query = `
      SELECT
        poi_name as name,
        poi_id as id,
        poi_type as category,
        poi_type_strd as standardizedCategory,
        latitude,
        longitude,
        rating,
        user_rating_count as userRatingsTotal,
        business_status as businessStatus,
        ST_DISTANCE(ST_GEOGPOINT(longitude, latitude), ST_GEOGPOINT(@lng, @lat)) as distanceMeters
      FROM \`${this.datasetName}\`
      ${whereClause}
      ORDER BY distanceMeters ASC
      LIMIT 500
    `;

    try {
      const [rows] = await this.bigquery.query({ query, params });
      return (rows || []).map((r: any) => ({
        id: r.id || 'poi-id',
        name: r.name || 'POI Location',
        category: r.category || 'general',
        standardizedCategory: r.standardizedCategory || 'other',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        distanceMeters: Number(Math.floor(r.distanceMeters) || 0),
        rating: r.rating ? Number(r.rating) : 4.0,
        userRatingsTotal: r.userRatingsTotal ? Number(r.userRatingsTotal) : 10,
        businessStatus: r.businessStatus || 'OPERATIONAL',
      }));
    } catch (err: any) {
      this.logger.error(`BigQuery radius POI query error: ${err.message}`);
      throw new Error(`Couldn't fetch nearby POI data — please try again.`);
    }
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
    originLat: number,
    originLng: number,
    regencyOrProvince?: string,
  ): Promise<RadiusPoiItem[]> {
    if (!polygonPath || polygonPath.length < 3) return [];

    const wktVertices = polygonPath.map((p) => `${p.lng} ${p.lat}`);
    wktVertices.push(`${polygonPath[0].lng} ${polygonPath[0].lat}`);
    const wktPolygon = `POLYGON((${wktVertices.join(', ')}))`;

    if (!this.bigquery) {
      throw new Error('BigQuery client is not configured. Cannot fetch POI data right now — please try again later.');
    }

    try {
      let whereClause = `WHERE ST_CONTAINS(ST_GEOGFROMTEXT(@wktPolygon), ST_GEOGPOINT(longitude, latitude))`;
      const params: Record<string, any> = { wktPolygon, lat: originLat, lng: originLng };

      if (regencyOrProvince) {
        whereClause += ` AND (LOWER(regency_code) LIKE LOWER(@region) OR LOWER(province_code) LIKE LOWER(@region) OR LOWER(regency) LIKE LOWER(@region) OR LOWER(province) LIKE LOWER(@region))`;
        params.region = `%${regencyOrProvince}%`;
      }

      const query = `
        SELECT
          poi_id as id,
          poi_name as name,
          poi_type as category,
          poi_type_strd as standardizedCategory,
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
      return (rows || []).map((r: any) => ({
        id: r.id || 'poi-id',
        name: r.name || 'POI Location',
        category: r.category || 'general',
        standardizedCategory: r.standardizedCategory || 'other',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        distanceMeters: Number(Math.floor(r.distanceMeters) || 0),
        rating: r.rating ? Number(r.rating) : 4.0,
        userRatingsTotal: r.userRatingsTotal ? Number(r.userRatingsTotal) : 10,
        businessStatus: r.businessStatus || 'OPERATIONAL',
      }));
    } catch (err: any) {
      this.logger.error(`BigQuery polygon POI query error: ${err.message}`);
      throw new Error(`Couldn't fetch POI data for that area — please try again.`);
    }
  }
}
