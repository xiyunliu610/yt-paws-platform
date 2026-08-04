import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { MEDIA_URI_PATTERN, MAX_MEDIA_URI_LENGTH } from '../../../common/validation/media-uri';

export class UpdateBusinessDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxConcurrentBookings?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  // Free-text for now (e.g. "Auckland" or a fuller contact/address blurb) —
  // matches the existing nullable Business.region column, not a new field.
  // null clears it; omitted/undefined leaves it unchanged (@IsOptional()
  // treats both the same way, skipping the validators below for either).
  @IsOptional()
  @IsString()
  @MaxLength(500)
  region?: string | null;

  // null clears it (e.g. "remove QR code"); omitted/undefined leaves it
  // unchanged.
  @IsOptional()
  @IsString()
  @Matches(MEDIA_URI_PATTERN, { message: 'wechatQrCodeUrl must be an https:// URL or an image data: URI' })
  @MaxLength(MAX_MEDIA_URI_LENGTH)
  wechatQrCodeUrl?: string | null;
}
