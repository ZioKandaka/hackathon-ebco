import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  businessType?: string;

  @IsString()
  @IsOptional()
  fullAddress?: string;

  @IsNumber()
  @IsOptional()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  regency?: string;

  @IsString()
  @IsOptional()
  subDistrict?: string;

  @IsString()
  @IsOptional()
  postalCode?: string;
}
