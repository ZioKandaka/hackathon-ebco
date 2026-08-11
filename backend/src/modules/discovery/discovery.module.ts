import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { DiscoveryHistoryService } from './services/discovery-history.service';
import { SiteVisitService } from './services/site-visit.service';
import { SiteVisitHistoryService } from './services/site-visit-history.service';
import { PoiRelevanceClassifierService } from './services/poi-relevance-classifier.service';
import { CatchmentExplanationService } from './services/catchment-explanation.service';
import { CatchmentHistoryService } from './services/catchment-history.service';
import { HeatmapHistoryService } from './services/heatmap-history.service';
import { DiscoveryController } from './discovery.controller';
import { CatchmentController } from './catchment.controller';
import { SiteVisitController } from './site-visit.controller';
import { HeatmapController } from './heatmap.controller';
import { IsochroneCache } from './entities/isochrone-cache.entity';
import { CatchmentAnalysisRun } from './entities/catchment-analysis-run.entity';
import { SiteVisitReport } from './entities/site-visit-report.entity';
import { DiscoverySearchRun } from './entities/discovery-search-run.entity';
import { HeatmapQueryRun } from './entities/heatmap-query-run.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IsochroneCache,
      CatchmentAnalysisRun,
      SiteVisitReport,
      DiscoverySearchRun,
      HeatmapQueryRun,
    ]),
  ],
  providers: [
    BigQueryDiscoveryService,
    DiscoveryService,
    DiscoveryHistoryService,
    SiteVisitService,
    SiteVisitHistoryService,
    PoiRelevanceClassifierService,
    CatchmentExplanationService,
    CatchmentHistoryService,
    HeatmapHistoryService,
  ],
  controllers: [DiscoveryController, CatchmentController, SiteVisitController, HeatmapController],
  exports: [
    DiscoveryService,
    DiscoveryHistoryService,
    BigQueryDiscoveryService,
    SiteVisitService,
    SiteVisitHistoryService,
    PoiRelevanceClassifierService,
    CatchmentExplanationService,
    CatchmentHistoryService,
    HeatmapHistoryService,
  ],
})
export class DiscoveryModule {}
