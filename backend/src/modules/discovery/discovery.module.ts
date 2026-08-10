import { Module } from '@nestjs/common';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { SiteVisitService } from './services/site-visit.service';
import { DiscoveryController } from './discovery.controller';

@Module({
  providers: [BigQueryDiscoveryService, DiscoveryService, SiteVisitService],
  controllers: [DiscoveryController],
  exports: [DiscoveryService, BigQueryDiscoveryService, SiteVisitService],
})
export class DiscoveryModule {}
