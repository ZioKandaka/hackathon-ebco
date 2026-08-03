import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserLocation } from './entities/user-location.entity';
import { LocationsService } from './services/locations.service';
import { GeocodingService } from './services/geocoding.service';
import { LocationsController } from './locations.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserLocation])],
  providers: [LocationsService, GeocodingService],
  controllers: [LocationsController],
  exports: [LocationsService, GeocodingService],
})
export class LocationsModule {}
