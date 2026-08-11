import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { SiteVisitService } from './services/site-visit.service';
import { SiteVisitHistoryService } from './services/site-visit-history.service';
import { PoiRelevanceClassifierService } from './services/poi-relevance-classifier.service';
import { CatchmentExplanationService } from './services/catchment-explanation.service';
import { CatchmentHistoryService } from './services/catchment-history.service';
import { DiscoveryController } from './discovery.controller';
import { CatchmentController } from './catchment.controller';
import { SiteVisitController } from './site-visit.controller';
import { IsochroneCache } from './entities/isochrone-cache.entity';
import { CatchmentAnalysisRun } from './entities/catchment-analysis-run.entity';
import { SiteVisitReport } from './entities/site-visit-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([IsochroneCache, CatchmentAnalysisRun, SiteVisitReport])],
  providers: [
    BigQueryDiscoveryService,
    DiscoveryService,
    SiteVisitService,
    SiteVisitHistoryService,
    PoiRelevanceClassifierService,
    CatchmentExplanationService,
    CatchmentHistoryService,
  ],
  controllers: [DiscoveryController, CatchmentController, SiteVisitController],
  exports: [
    DiscoveryService,
    BigQueryDiscoveryService,
    SiteVisitService,
    SiteVisitHistoryService,
    PoiRelevanceClassifierService,
    CatchmentExplanationService,
    CatchmentHistoryService,
  ],
})
export class DiscoveryModule {}
