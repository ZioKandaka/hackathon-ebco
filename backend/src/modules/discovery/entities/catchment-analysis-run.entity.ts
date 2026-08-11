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

  @Column({ type: 'varchar', length: 255, name: 'location_name' })
  locationName!: string;

  @Column({ type: 'varchar', length: 100 })
  category!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'float', name: 'radius_km' })
  radiusKm!: number;

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
