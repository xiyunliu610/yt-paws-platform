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
import { Prisma, Role, User } from '@prisma/client';

// PRD US-01.1: at least 8 characters, containing both letters and numbers.
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;

// Unambiguous charset (no 0/O/1/l/I) for temporary passwords handed to owners
// to relay to new staff (PRD US-03.5).
const TEMP_PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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

  private signToken(user: Pick<User, 'id' | 'email' | 'role' | 'businessId' | 'tokenVersion'>) {
    return this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId,
      tokenVersion: user.tokenVersion,
    });
  }

  private toAuthResponse(user: User, token: string) {
    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    };
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
    if (!user || !user.isActive || user.deletedAt) {
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
        mustChangePassword: true,
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
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    }));
  }

  async updateStaffStatus(requester: RequestingUser, targetId: string, isActive: boolean) {
    if (!requester.businessId) {
      throw new BadRequestException('Your account is not associated with a business');
    }
    if (requester.userId === targetId) {
      throw new BadRequestException('You cannot change your own active status');
    }

    const target = await this.prisma.user.findUnique({ where: { id: targetId } });
    if (
      !target ||
      target.businessId !== requester.businessId ||
      (target.role !== Role.staff && target.role !== Role.owner && target.role !== Role.admin)
    ) {
      throw new ForbiddenException('You do not have access to this staff account');
    }
    if (target.deletedAt) {
      throw new BadRequestException('A deleted account cannot be reactivated');
    }

    const update = () =>
      this.prisma.$transaction(
        async (tx) => {
          if (!isActive && target.role === Role.owner) {
            const activeOwners = await tx.user.count({
              where: { businessId: requester.businessId, role: Role.owner, isActive: true, deletedAt: null },
            });
            if (activeOwners <= 1) {
              throw new BadRequestException('The last active owner cannot be deactivated');
            }
          }
          return tx.user.update({
            where: { id: targetId },
            data: { isActive, tokenVersion: { increment: 1 }, pushToken: isActive ? undefined : null },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    let user: User;
    try {
      user = await update();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        user = await update();
      } else {
        throw error;
      }
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });
    let rawToken: string | undefined;
    if (user?.isActive && !user.deletedAt) {
      rawToken = crypto.randomBytes(32).toString('base64url');
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
        this.prisma.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: hashResetToken(rawToken),
            expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
          },
        }),
      ]);
      // Email delivery is intentionally outside this basic flow. Tests may
      // opt in to seeing the token; production always returns only the same
      // generic response used for unknown email addresses.
    }
    return {
      accepted: true,
      ...(process.env.EXPOSE_PASSWORD_RESET_TOKEN === 'true' && rawToken ? { resetToken: rawToken } : {}),
    };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashResetToken(rawToken) },
      include: { user: true },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.isActive || token.user.deletedAt) {
      throw new BadRequestException('This password reset token is invalid or expired');
    }
    const password = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new BadRequestException('This password reset token is invalid or expired');
      await tx.user.update({
        where: { id: token.userId },
        data: { password, tokenVersion: { increment: 1 }, mustChangePassword: false },
      });
      await tx.passwordResetToken.deleteMany({ where: { userId: token.userId, id: { not: token.id } } });
    });
    return { reset: true };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    this.validatePasswordStrength(newPassword);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt || !(await bcrypt.compare(currentPassword, user.password))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (await bcrypt.compare(newPassword, user.password)) {
      throw new BadRequestException('New password must be different from the current password');
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: await bcrypt.hash(newPassword, 10),
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
      },
    });
    return this.toAuthResponse(updated, this.signToken(updated));
  }

  async deleteAccount(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive || user.deletedAt || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Password is incorrect');
    }
    const anonymizedEmail = `deleted-${user.id}@deleted.invalid`;
    const replacementPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
    const anonymize = () => this.prisma.$transaction(async (tx) => {
      if (user.role === Role.owner && user.businessId) {
        const activeOwners = await tx.user.count({
          where: { businessId: user.businessId, role: Role.owner, isActive: true, deletedAt: null },
        });
        if (activeOwners <= 1) {
          throw new BadRequestException('Transfer ownership or activate another owner before deleting this account');
        }
      }
      const pets = await tx.pet.findMany({ where: { ownerId: userId }, select: { id: true } });
      const petIds = pets.map((pet) => pet.id);
      await tx.notification.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.petHealthRecord.deleteMany({ where: { petId: { in: petIds } } });
      await tx.dailyReport.updateMany({
        where: { booking: { customerId: userId } },
        data: { text: null, mediaUrls: [] },
      });
      await tx.pet.updateMany({
        where: { ownerId: userId },
        data: {
          name: 'Deleted pet',
          species: null,
          breed: null,
          age: null,
          weight: null,
          personality: null,
          dietNotes: null,
          isNeutered: null,
          photoUrl: null,
        },
      });
      await tx.booking.updateMany({ where: { assignedStaffId: userId }, data: { assignedStaffId: null } });
      await tx.payment.updateMany({ where: { refundedById: userId }, data: { refundedById: null } });
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          password: replacementPassword,
          name: null,
          phone: null,
          pushToken: null,
          isActive: false,
          tokenVersion: { increment: 1 },
          mustChangePassword: false,
          deletedAt: new Date(),
        },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    try {
      await anonymize();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
        await anonymize();
      } else {
        throw error;
      }
    }
    return { deleted: true };
  }
}
