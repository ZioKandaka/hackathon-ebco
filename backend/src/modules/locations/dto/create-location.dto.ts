import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty({ message: 'Business name is required.' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Business type is required.' })
  businessType!: string;

  @IsString()
  @IsNotEmpty({ message: 'Full address is required.' })
  fullAddress!: string;

  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude!: number;

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

  @IsNumber()
  @IsOptional()
  confidence?: number;
}
