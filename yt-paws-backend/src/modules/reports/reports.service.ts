import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, BookingStatus } from '@prisma/client';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

interface CreateReportInput {
  text?: string;
  mediaUrls?: string[];
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private async loadBookingForWrite(user: RequestingUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isBusinessMember = !!user.businessId && booking.businessId === user.businessId;
    const isAssignedStaff = user.role === Role.staff && booking.assignedStaffId === user.userId;
    const isManager = (user.role === Role.owner || user.role === Role.admin) && isBusinessMember;
    if (!isAssignedStaff && !isManager) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  // Matches loadBookingForWrite's permission, not "anyone in the business":
  // an unassigned staff member knowing a bookingId could otherwise read
  // another customer's photos and notes just by being employed by the same
  // business. Owner/admin still see everything in their business — they're
  // the ones actually managing it.
  private async loadBookingForRead(user: RequestingUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isCustomer = booking.customerId === user.userId;
    const isAssignedStaff = user.role === Role.staff && booking.assignedStaffId === user.userId;
    const isManager = (user.role === Role.owner || user.role === Role.admin) && booking.businessId === user.businessId;
    if (!isCustomer && !isAssignedStaff && !isManager) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  // US-06.1: only while the booking is actively being carried out. The App
  // uploads images directly through MediaService's presigned URLs, so this
  // endpoint receives and persists only hosted HTTPS URLs.
  async create(user: RequestingUser, bookingId: string, data: CreateReportInput) {
    const booking = await this.loadBookingForWrite(user, bookingId);
    if (booking.status !== BookingStatus.in_progress) {
      throw new BadRequestException('Daily reports can only be added while the booking is in progress');
    }
    if (!data.text?.trim() && (!data.mediaUrls || data.mediaUrls.length === 0)) {
      throw new BadRequestException('A daily report needs text or at least one media URL');
    }

    return this.prisma.dailyReport.create({
      data: {
        bookingId,
        text: data.text,
        mediaUrls: data.mediaUrls ?? [],
      },
    });
  }

  // US-06.2: multiple reports in one day show as separate chronological
  // entries rather than overwriting each other, so this is just a plain list.
  async findForBooking(user: RequestingUser, bookingId: string) {
    await this.loadBookingForRead(user, bookingId);
    return this.prisma.dailyReport.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
