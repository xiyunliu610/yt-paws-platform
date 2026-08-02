import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export class CreateUploadUrlDto {
  @IsIn(['pet', 'report', 'wechat-qr'])
  purpose: 'pet' | 'report' | 'wechat-qr';

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024)
  size: number;
}
