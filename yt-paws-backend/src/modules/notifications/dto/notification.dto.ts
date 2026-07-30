import { IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  pushToken: string;
}
