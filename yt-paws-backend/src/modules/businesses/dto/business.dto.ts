import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MEDIA_URI_PATTERN, MAX_MEDIA_URI_LENGTH } from '../../../common/validation/media-uri';

export class UpdateBusinessDto {
  @IsOptional()
  @IsString()
  @Matches(MEDIA_URI_PATTERN, { message: 'wechatQrCodeUrl must be an https:// URL or an image data: URI' })
  @MaxLength(MAX_MEDIA_URI_LENGTH)
  wechatQrCodeUrl?: string;
}
