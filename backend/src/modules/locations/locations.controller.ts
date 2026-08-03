import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LocationsService } from './services/locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  async getUserLocations(@CurrentUser('id') userId: string) {
    const locations = await this.locationsService.getUserLocations(userId);
    return { locations };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLocationDto,
  ) {
    const location = await this.locationsService.createLocation(userId, dto);
    return { location };
  }
}
