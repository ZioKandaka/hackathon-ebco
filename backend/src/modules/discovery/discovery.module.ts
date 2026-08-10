import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { SiteVisitService } from './services/site-visit.service';
import { PoiRelevanceClassifierService } from './services/poi-relevance-classifier.service';
import { DiscoveryController } from './discovery.controller';
import { IsochroneCache } from './entities/isochrone-cache.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IsochroneCache])],
  providers: [BigQueryDiscoveryService, DiscoveryService, SiteVisitService, PoiRelevanceClassifierService],
  controllers: [DiscoveryController],
  exports: [DiscoveryService, BigQueryDiscoveryService, SiteVisitService, PoiRelevanceClassifierService],
})
export class DiscoveryModule {}
