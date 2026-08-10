import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { SiteVisitService } from './services/site-visit.service';
import { DiscoveryController } from './discovery.controller';
import { IsochroneCache } from './entities/isochrone-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IsochroneCache])],
  providers: [BigQueryDiscoveryService, DiscoveryService, SiteVisitService],
  controllers: [DiscoveryController],
  exports: [DiscoveryService, BigQueryDiscoveryService, SiteVisitService],
})
export class DiscoveryModule {}
