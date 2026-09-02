import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  businessId: string | null;
  tokenVersion: number;
  sid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Whatever is returned here becomes `req.user` for guarded routes. Looks
  // the user up fresh on every request rather than trusting role/businessId
  // out of the token: those are only as current as the moment it was
  // issued, and the token has no version/revocation mechanism, so a role
  // change, business reassignment, or account deactivation wouldn't
  // otherwise take effect until the (now short, but still real) 24h expiry.
  async validate(payload: JwtPayload) {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: payload.sub } }),
      this.prisma.authSession.findUnique({ where: { id: payload.sid } }),
    ]);
    if (!user || !user.isActive || user.deletedAt || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedException();
    }
    if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date() || session.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException();
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      mustChangePassword: user.mustChangePassword,
      sessionId: session.id,
    };
  }
}
