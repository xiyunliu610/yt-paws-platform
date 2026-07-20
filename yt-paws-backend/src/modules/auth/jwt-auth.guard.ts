import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Rejects unauthenticated requests with 401 (PRD US-01.2).
// Apply with `@UseGuards(JwtAuthGuard)` on any route requiring login.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
