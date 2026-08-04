import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, Max, Min, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  // Full password-strength rule (letters + numbers) is enforced in
  // AuthService.validatePasswordStrength — this just bounds length.
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}

export class RegisterBusinessDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  businessName: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class CreateStaffDto {
  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class UpdateStaffStatusDto {
  @IsBoolean()
  isActive: boolean;
}

export class UpdateStaffCapacityDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxConcurrentBookings: number | null;
}

export class ForgotPasswordDto {
  @IsEmail()
  @MaxLength(255)
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(200)
  token: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  currentPassword: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  newPassword: string;
}

export class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
