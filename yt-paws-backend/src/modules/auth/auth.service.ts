import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// PRD US-01.1: at least 8 characters, containing both letters and numbers.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, name: string, phone?: string) {
    if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_RULE.test(password)) {
      throw new BadRequestException(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain both letters and numbers`,
      );
    }

    // Check whether the email is already registered
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('This email is already registered');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the user (role defaults to customer, matching the schema default)
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, phone },
    });

    // Issue a token (payload carries role for downstream permission guards)
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async login(email: string, password: string) {
    // Look up the user
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify the password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Issue a token (payload carries role for downstream permission guards)
    const token = this.jwtService.sign({ sub: user.id, email: user.email, role: user.role });
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }
}