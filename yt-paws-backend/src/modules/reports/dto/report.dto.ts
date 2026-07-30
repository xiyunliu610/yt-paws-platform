import { ArrayMaxSize, IsArray, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { MEDIA_URI_PATTERN, MAX_MEDIA_URI_LENGTH } from '../../../common/validation/media-uri';

// Frontend caps photos at 3 per report (see ReportComposeScreen); enforced
// server-side too so the limit isn't only a client-side courtesy. 3 * 2MB
// stays comfortably under main.ts's 8mb global body limit; the previous
// limit of 5 didn't (5 * 2MB > 8mb, so the global limit would reject a
// request this DTO would otherwise have accepted).
const MAX_MEDIA_ITEMS = 3;

export class CreateReportDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  text?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_MEDIA_ITEMS)
  @IsString({ each: true })
  @Matches(MEDIA_URI_PATTERN, { each: true, message: 'each mediaUrl must be an https:// URL or an image data: URI' })
  @MaxLength(MAX_MEDIA_URI_LENGTH, { each: true })
  mediaUrls?: string[];
}
