import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('isochrone_cache')
export class IsochroneCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  @Index()
  cacheKey: string;

  @Column('jsonb')
  polygonCoordinates: Array<{ lat: number; lng: number }>;

  @CreateDateColumn()
  createdAt: Date;
}
