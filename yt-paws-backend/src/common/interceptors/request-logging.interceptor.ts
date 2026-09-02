import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(finalize(() => {
      // Deliberately exclude headers, query values and bodies: they can contain
      // JWTs, reset tokens, health notes and payment identifiers.
      this.logger.log(JSON.stringify({
        method: request.method,
        path: request.route?.path ?? request.path,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      }));
    }));
  }
}
