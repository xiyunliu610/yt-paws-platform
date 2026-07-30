import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min, MinLength, MaxLength } from 'class-validator';
import { PricingUnit } from '@prisma/client';

export class CreateServiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  // Max keeps it inside Decimal(10, 2)'s range with headroom to spare —
  // without it, a value like 1e9 would pass DTO validation and then fail as
  // an opaque Postgres numeric-overflow error instead of a clean 400.
  @IsNumber()
  @Min(0)
  @Max(100_000)
  price: number;

  @IsOptional()
  @IsEnum(PricingUnit)
  pricingUnit?: PricingUnit;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;
}

export class UpdateServiceDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100_000)
  price?: number;

  @IsOptional()
  @IsEnum(PricingUnit)
  pricingUnit?: PricingUnit;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
