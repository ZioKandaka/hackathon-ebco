import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { VisualCriteriaMap, SiteVisitImageType } from '../services/site-visit.service';

@Entity('site_visit_reports')
export class SiteVisitReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  // Nullable — only set when this report was against a real saved business location, not an
  // ad-hoc candidate spot or geocoded address. Lets My Locations show "latest site visit" per spot.
  @Column({ type: 'uuid', name: 'location_id', nullable: true })
  @Index()
  locationId?: string;

  @Column({ type: 'varchar', length: 255, name: 'location_name' })
  locationName!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: number;

  @Column({ type: 'boolean', name: 'has_street_view_coverage' })
  hasStreetViewCoverage!: boolean;

  @Column({ type: 'int', name: 'overall_visual_score' })
  overallVisualScore!: number;

  @Column({ type: 'jsonb' })
  criteria!: VisualCriteriaMap;

  @Column({ type: 'jsonb', name: 'available_image_types' })
  availableImageTypes!: SiteVisitImageType[];

  @Column({ type: 'text' })
  summary!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
