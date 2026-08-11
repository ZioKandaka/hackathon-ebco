import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export interface CatchmentSubScoresJson {
  demandDensity: number;
  trafficProxy: number;
  areaQuality: number;
  competitionPenalty: number;
  networkSaturation: number;
  operationalVitality: number;
}

export interface ContributingPoiJson {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  rating?: number;
  businessStatus?: string;
}

@Entity('catchment_analysis_runs')
export class CatchmentAnalysisRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  // Nullable — only set when this run was against a real saved business location, not an ad-hoc
  // candidate spot or geocoded address. Lets My Locations show "latest catchment score" per spot.
  @Column({ type: 'uuid', name: 'location_id', nullable: true })
  @Index()
  locationId?: string;

  @Column({ type: 'varchar', length: 255, name: 'location_name' })
  locationName!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'varchar', length: 10, name: 'boundary_type', default: 'radius' })
  boundaryType!: 'radius' | 'time';

  @Column({ type: 'float', name: 'radius_km', nullable: true })
  radiusKm?: number;

  @Column({ type: 'varchar', length: 10, name: 'travel_mode', nullable: true })
  travelMode?: 'drive' | 'walk' | 'transit';

  @Column({ type: 'int', name: 'time_minutes', nullable: true })
  timeMinutes?: number;

  @Column({ type: 'jsonb', name: 'polygon_coordinates', nullable: true })
  polygonCoordinates?: Array<{ lat: number; lng: number }>;

  @Column({ type: 'int', name: 'composite_score' })
  compositeScore!: number;

  @Column({ type: 'jsonb' })
  subScores!: CatchmentSubScoresJson;

  @Column({ type: 'jsonb' })
  weights!: CatchmentSubScoresJson;

  @Column({ type: 'int', name: 'poi_count' })
  poiCount!: number;

  @Column({ type: 'jsonb', name: 'contributing_pois' })
  contributingPois!: Record<keyof CatchmentSubScoresJson, ContributingPoiJson[]>;

  @Column({ type: 'jsonb', nullable: true })
  explanations!: Record<keyof CatchmentSubScoresJson, string> | null;

  @Column({ type: 'text' })
  summary!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
