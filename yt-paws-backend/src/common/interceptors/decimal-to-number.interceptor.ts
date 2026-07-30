import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Prisma.Decimal survives JSON.stringify as a string (via its own toJSON),
// which would silently change the API's money fields (Payment.amount,
// Service.price, Booking.unitPrice) from numbers to strings and break every
// frontend call site doing arithmetic or .toFixed() on them. Converting
// recursively here, before serialization, keeps the wire format unchanged.
function convert(value: unknown): unknown {
  if (value instanceof Prisma.Decimal) {
    return value.toNumber();
  }
  if (Array.isArray(value)) {
    return value.map(convert);
  }
  if (value instanceof Date) {
    return value;
  }
  if (value !== null && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      (value as Record<string, unknown>)[key] = convert((value as Record<string, unknown>)[key]);
    }
    return value;
  }
  return value;
}

@Injectable()
export class DecimalToNumberInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => convert(data)));
  }
}
