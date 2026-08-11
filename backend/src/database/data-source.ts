import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { ChatMessage } from '../modules/chat/entities/chat-message.entity';
import { UserLocation } from '../modules/locations/entities/user-location.entity';
import { IsochroneCache } from '../modules/discovery/entities/isochrone-cache.entity';
import { CatchmentAnalysisRun } from '../modules/discovery/entities/catchment-analysis-run.entity';
import { SiteVisitReport } from '../modules/discovery/entities/site-visit-report.entity';
import { DiscoverySearchRun } from '../modules/discovery/entities/discovery-search-run.entity';
import { HeatmapQueryRun } from '../modules/discovery/entities/heatmap-query-run.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [
    User,
    ChatMessage,
    UserLocation,
    IsochroneCache,
    CatchmentAnalysisRun,
    SiteVisitReport,
    DiscoverySearchRun,
    HeatmapQueryRun,
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
});

export default AppDataSource;
