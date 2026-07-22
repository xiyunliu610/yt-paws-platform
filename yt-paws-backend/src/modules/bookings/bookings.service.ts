import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  // Each role sees a different natural slice: a customer sees what they
  // booked, a staff member sees what's assigned to them, and an
  // owner/admin sees everything in their business.
  async findMine(user: RequestingUser) {
    if (user.role === Role.customer) {
      return this.prisma.booking.findMany({
        where: { customerId: user.userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (user.role === Role.staff) {
      return this.prisma.booking.findMany({
        where: { assignedStaffId: user.userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!user.businessId) {
      return [];
    }
    return this.prisma.booking.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // PRD US-03.6: owner assigns a booking to a staff member of the same business.
  async assignStaff(requester: RequestingUser, bookingId: string, staffId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (!requester.businessId || booking.businessId !== requester.businessId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const staff = await this.prisma.user.findUnique({ where: { id: staffId } });
    const isAssignable = staff && staff.businessId === booking.businessId
      && (staff.role === Role.staff || staff.role === Role.owner);
    if (!isAssignable) {
      throw new BadRequestException('That user is not a staff member of this business');
    }

    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { assignedStaffId: staffId },
    });
  }
}
