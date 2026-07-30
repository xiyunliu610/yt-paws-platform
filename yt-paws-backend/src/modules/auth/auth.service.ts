import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role, User } from '@prisma/client';

// PRD US-01.1: at least 8 characters, containing both letters and numbers.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

// Unambiguous charset (no 0/O/1/l/I) for temporary passwords handed to owners
// to relay to new staff (PRD US-03.5).
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function generateTemporaryPassword(length = 12): string {
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += TEMP_PASSWORD_CHARS[bytes[i] % TEMP_PASSWORD_CHARS.length];
  }
  return password;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private validatePasswordStrength(password: string) {
    if (password.length < PASSWORD_MIN_LENGTH || !PASSWORD_RULE.test(password)) {
      throw new BadRequestException(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters and contain both letters and numbers`,
      );
    }
  }

  private async assertEmailAvailable(email: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('This email is already registered');
    }
  }

  private signToken(user: Pick<User, 'id' | 'email' | 'role' | 'businessId'>) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
    });
  }

  private toAuthResponse(user: User, token: string) {
    return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  }

  async register(email: string, password: string, name: string, phone?: string) {
    this.validatePasswordStrength(password);
    await this.assertEmailAvailable(email);

    const hashedPassword = await bcrypt.hash(password, 10);

    // Role defaults to customer, matching the schema default.
    const user = await this.prisma.user.create({
      data: { email, password: hashedPassword, name, phone },
    });

    return this.toAuthResponse(user, this.signToken(user));
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.toAuthResponse(user, this.signToken(user));
  }

  // PRD US-01.4 (bootstrap-only as of 2026-07-30): creates the platform's one
  // Business row and its owner account atomically. V1 serves Y&T Paws
  // exclusively — see docs/01_Project_Overview.md §11 — so this can only
  // ever run once; the previous "any number of businesses can self-register"
  // behavior was reserved-for-later-multi-tenancy scope creep that V1 never
  // actually needed and nothing in the app depended on beyond the initial
  // Y&T Paws signup, which has already happened in every real environment.
  async registerBusiness(
    businessName: string,
    email: string,
    password: string,
    name: string,
    phone?: string,
  ) {
    if (!businessName?.trim()) {
      throw new BadRequestException('Business name is required');
    }
    if ((await this.prisma.business.count()) > 0) {
      throw new ForbiddenException('This platform already has a registered business');
    }
    this.validatePasswordStrength(password);
    await this.assertEmailAvailable(email);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.create({ data: { name: businessName } });
      return tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: Role.owner,
          businessId: business.id,
        },
      });
    });

    return this.toAuthResponse(user, this.signToken(user));
  }

  // PRD US-03.5: the owner creates a staff account under their own business.
  // No email infrastructure exists yet, so the temporary password is
  // returned to the owner to relay to the staff member directly.
  async createStaff(ownerBusinessId: string | null, email: string, name: string, phone?: string) {
    if (!ownerBusinessId) {
      throw new BadRequestException('Your account is not associated with a business');
    }
    await this.assertEmailAvailable(email);

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: Role.staff,
        businessId: ownerBusinessId,
      },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      temporaryPassword,
    };
  }

  // Backs the owner's "Manage Staff" screen and the booking-assignment
  // picker: everyone (staff + owner) who could be an assignStaff target,
  // per bookings.service.assignStaff's isAssignable check.
  async listStaff(ownerBusinessId: string | null) {
    if (!ownerBusinessId) {
      throw new BadRequestException('Your account is not associated with a business');
    }

    const users = await this.prisma.user.findMany({
      where: { businessId: ownerBusinessId, role: { in: [Role.staff, Role.owner] } },
      orderBy: { createdAt: 'asc' },
    });

    return users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
    }));
  }
}
