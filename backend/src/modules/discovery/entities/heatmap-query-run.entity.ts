import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { WeightedHeatmapPoint } from '../services/discovery.service';

export interface HeatmapFilterJson {
  column: string;
  operator: string;
  value: string;
}

@Entity('heatmap_query_runs')
export class HeatmapQueryRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  // Nullable — only set when the heatmap was generated against a real saved business location,
  // not an ad-hoc region/address. Lets My Locations show "latest heatmap" per saved spot.
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

  @Column({ type: 'float', name: 'radius_km' })
  radiusKm!: number;

  @Column({ type: 'int', name: 'point_count' })
  pointCount!: number;

  @Column({ type: 'jsonb' })
  points!: WeightedHeatmapPoint[];

  @Column({ type: 'jsonb', nullable: true })
  filters?: HeatmapFilterJson[];

  @Column({ type: 'text' })
  summary!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
