import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class SecurityService {
  private lastPrunedAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  emailHash(email: string) {
    return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
  }

  async enforceRateLimit(type: string, ipAddress: string, email: string, ipLimit: number, emailLimit: number, windowMs: number) {
    const emailHash = this.emailHash(email);
    const since = new Date(Date.now() - windowMs);
    const [byIp, byEmail] = await Promise.all([
      this.prisma.securityEvent.count({ where: { type, ipAddress, createdAt: { gte: since } } }),
      this.prisma.securityEvent.count({ where: { type, emailHash, createdAt: { gte: since } } }),
    ]);
    if (byIp >= ipLimit || byEmail >= emailLimit) {
      throw new HttpException('Too many requests. Please try again later', HttpStatus.TOO_MANY_REQUESTS);
    }
    return emailHash;
  }

  async log(type: string, data: { ipAddress?: string; email?: string; userId?: string; metadata?: object } = {}) {
    await this.pruneExpiredEvents();
    await this.prisma.securityEvent.create({
      data: {
        type,
        ipAddress: data.ipAddress,
        emailHash: data.email ? this.emailHash(data.email) : undefined,
        userId: data.userId,
        metadata: data.metadata,
      },
    });
  }

  private async pruneExpiredEvents() {
    const now = Date.now();
    if (now - this.lastPrunedAt < 60 * 60 * 1000) return;
    this.lastPrunedAt = now;
    await this.prisma.securityEvent.deleteMany({
      where: { createdAt: { lt: new Date(now - 90 * 24 * 60 * 60 * 1000) } },
    });
  }
}
