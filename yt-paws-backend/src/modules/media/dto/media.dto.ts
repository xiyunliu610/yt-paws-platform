import { IsIn, IsString } from 'class-validator';

export class CreateUploadUrlDto {
  @IsIn(['pet', 'report', 'wechat-qr'])
  purpose: 'pet' | 'report' | 'wechat-qr';

  @IsString()
  @IsIn(['image/jpeg', 'image/png', 'image/webp'])
  contentType: string;
}
