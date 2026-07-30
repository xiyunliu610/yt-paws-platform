import { IsBoolean, IsIn, IsISO8601, IsInt, IsNumber, IsOptional, IsString, Matches, Min, MinLength, MaxLength } from 'class-validator';
import { MEDIA_URI_PATTERN, MAX_MEDIA_URI_LENGTH } from '../../../common/validation/media-uri';

export class CreatePetDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  breed?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dietNotes?: string;

  @IsOptional()
  @IsBoolean()
  isNeutered?: boolean;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_URI_PATTERN, { message: 'photoUrl must be an https:// URL or an image data: URI' })
  @MaxLength(MAX_MEDIA_URI_LENGTH)
  photoUrl?: string;
}

export class UpdatePetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  species?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  breed?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  personality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dietNotes?: string;

  @IsOptional()
  @IsBoolean()
  isNeutered?: boolean;

  @IsOptional()
  @IsString()
  @Matches(MEDIA_URI_PATTERN, { message: 'photoUrl must be an https:// URL or an image data: URI' })
  @MaxLength(MAX_MEDIA_URI_LENGTH)
  photoUrl?: string;
}

export class CreateHealthRecordDto {
  @IsIn(['vaccination', 'deworming'])
  type: string;

  @IsISO8601()
  date: string;

  @IsOptional()
  @IsISO8601()
  nextDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
