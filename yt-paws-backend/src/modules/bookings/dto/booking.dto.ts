import { IsISO8601, IsString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  serviceId: string;

  @IsUUID()
  petId: string;

  @IsISO8601()
  startDate: string;

  @IsISO8601()
  endDate: string;
}

export class AssignStaffDto {
  @IsUUID()
  staffId: string;
}

export class UpdateBookingStatusDto {
  // Semantic validation (which transitions are legal from the current
  // state) happens in BookingsService against BookingStatus; this only
  // guards against non-string/empty garbage reaching that check.
  @IsString()
  status: string;
}
