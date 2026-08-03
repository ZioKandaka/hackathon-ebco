import { IsNotEmpty, IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class DiscoverySearchDto {
  @IsString()
  @IsNotEmpty({ message: 'Business type is required.' })
  businessType!: string;

  @IsString()
  @IsNotEmpty({ message: 'Region name is required.' })
  region!: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}
