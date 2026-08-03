import { Module } from '@nestjs/common';
import { BigQueryDiscoveryService } from './services/bigquery-discovery.service';
import { DiscoveryService } from './services/discovery.service';
import { DiscoveryController } from './discovery.controller';

@Module({
  providers: [BigQueryDiscoveryService, DiscoveryService],
  controllers: [DiscoveryController],
  exports: [DiscoveryService, BigQueryDiscoveryService],
})
export class DiscoveryModule {}
