import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { DiscoveryCandidate } from '../services/discovery.service';

@Entity('discovery_search_runs')
export class DiscoverySearchRun {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id' })
  @Index()
  userId!: string;

  @Column({ type: 'varchar', length: 100, name: 'business_type' })
  businessType!: string;

  @Column({ type: 'varchar', length: 255 })
  region!: string;

  @Column({ type: 'jsonb' })
  candidates!: DiscoveryCandidate[];

  @Column({ type: 'text' })
  summary!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
