import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { SiteVisitService } from './services/site-visit.service';
import { PoiRelevanceClassifierService } from './services/poi-relevance-classifier.service';
import { CatchmentExplanationService } from './services/catchment-explanation.service';
import { CatchmentHistoryService } from './services/catchment-history.service';
import { DiscoveryController } from './discovery.controller';
import { CatchmentController } from './catchment.controller';
import { IsochroneCache } from './entities/isochrone-cache.entity';
import { CatchmentAnalysisRun } from './entities/catchment-analysis-run.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IsochroneCache, CatchmentAnalysisRun])],
  providers: [
    BigQueryDiscoveryService,
    DiscoveryService,
    SiteVisitService,
    PoiRelevanceClassifierService,
    CatchmentExplanationService,
    CatchmentHistoryService,
  ],
  controllers: [DiscoveryController, CatchmentController],
  exports: [
    DiscoveryService,
    BigQueryDiscoveryService,
    SiteVisitService,
    PoiRelevanceClassifierService,
    CatchmentExplanationService,
    CatchmentHistoryService,
  ],
})
export class DiscoveryModule {}
