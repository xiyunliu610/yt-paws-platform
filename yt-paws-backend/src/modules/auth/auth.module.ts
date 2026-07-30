import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        // Was 7d: role/businessId/disabled-state are baked into the token
        // and never re-checked against the User row (see JwtStrategy), so a
        // longer TTL means a fired/disabled/role-changed user keeps access
        // for that long. Shortened as a stopgap until there's a real
        // session/revocation mechanism; still no refresh flow, so the app
        // just has to send the user back to login after this expires.
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [JwtAuthGuard, PassportModule],
})
export class AuthModule {}