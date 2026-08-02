import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';

// Rejects unauthenticated requests with 401 (PRD US-01.2).
// Apply with `@UseGuards(JwtAuthGuard)` on any route requiring login.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const result = super.canActivate(context);
    const authenticated = isObservable(result) ? await lastValueFrom(result) : await result;
    if (!authenticated) return false;
    const request = context.switchToHttp().getRequest();
    if (request.user?.mustChangePassword && !request.path.endsWith('/auth/change-password')) {
      throw new ForbiddenException('You must change your temporary password before continuing');
    }
    return true;
  }
}
