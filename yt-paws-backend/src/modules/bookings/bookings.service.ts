import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Role, BookingStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

interface RequestingUser {
  userId: string;
  role: string;
  businessId: string | null;
}

interface CreateBookingInput {
  serviceId: string;
  petId: string;
  startDate: string;
  endDate: string;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // US-05.1: booking status labels the customer actually recognizes, not
  // the raw enum values.
  private static readonly STATUS_LABEL: Record<BookingStatus, string> = {
    pending: 'Pending Confirmation',
    confirmed: 'Confirmed',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  // Each role sees a different natural slice: a customer sees what they
  // booked, a staff member sees what's assigned to them, and an
  // owner/admin sees everything in their business.
  async findMine(user: RequestingUser) {
    // Pet/service names are joined in so list screens (e.g. the Home
    // screen's "Upcoming" widget) don't need a second round-trip per booking.
    const include = { pet: { select: { name: true } }, service: { select: { name: true } } };

    if (user.role === Role.customer) {
      return this.prisma.booking.findMany({
        where: { customerId: user.userId },
        orderBy: { createdAt: 'desc' },
        include,
      });
    }

    if (user.role === Role.staff) {
      return this.prisma.booking.findMany({
        where: { assignedStaffId: user.userId },
        orderBy: { createdAt: 'desc' },
        include,
      });
    }

    if (!user.businessId) {
      return [];
    }
    return this.prisma.booking.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: 'desc' },
      include,
    });
  }

  // US-03.2: creates a Booking in "pending" status. The pet must belong to
  // the requester and the service must be published; businessId is derived
  // from the service so the customer never has to know/supply it.
  async create(user: RequestingUser, data: CreateBookingInput) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new BadRequestException('startDate must be before endDate');
    }

    const pet = await this.prisma.pet.findUnique({ where: { id: data.petId } });
    if (!pet || pet.ownerId !== user.userId) {
      throw new ForbiddenException('You can only book for your own pet');
    }

    const service = await this.prisma.service.findUnique({ where: { id: data.serviceId } });
    if (!service || !service.isActive) {
      throw new NotFoundException('Service not available');
    }

    // Conflict scope: a pet can't be in two places at once. Business-capacity
    // limits beyond that aren't modeled yet (no capacity field on
    // Service/Business), so this only checks the pet's own overlapping bookings.
    //
    // The check-then-create is run inside a Serializable transaction, with
    // one retry on a serialization failure, so two concurrent requests for
    // the same pet/time-range can't both pass the conflict check before
    // either has created its row.
    const attempt = async () =>
      this.prisma.$transaction(
        async (tx) => {
          const conflict = await tx.booking.findFirst({
            where: {
              petId: data.petId,
              status: { in: [BookingStatus.pending, BookingStatus.confirmed, BookingStatus.in_progress] },
              startDate: { lt: end },
              endDate: { gt: start },
            },
          });
          if (conflict) {
            throw new ConflictException('This pet already has a booking during that time');
          }

          // Snapshot the service's current price/pricingUnit onto the
          // booking so a later price change doesn't alter what this booking
          // owes (see Booking.unitPrice in schema.prisma).
          return tx.booking.create({
            data: {
              businessId: service.businessId,
              customerId: user.userId,
              petId: data.petId,
              serviceId: data.serviceId,
              unitPrice: service.price,
              pricingUnit: service.pricingUnit,
              startDate: start,
              endDate: end,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

    try {
      return await attempt();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        return attempt();
      }
      throw err;
    }
  }

  // US-03.4: the customer who made the booking, or the business managing it,
  // can cancel while it's still pending/confirmed. The exact non-cancellable
  // time window is still TBD with the business (see PRD US-03.4 note), so
  // only the status check is enforced for now.
  async cancel(user: RequestingUser, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isRequestersBooking = booking.customerId === user.userId;
    const managesThisBusiness =
      (user.role === Role.owner || user.role === Role.admin) && user.businessId === booking.businessId;
    if (!isRequestersBooking && !managesThisBusiness) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    if (booking.status !== BookingStatus.pending && booking.status !== BookingStatus.confirmed) {
      throw new BadRequestException(`Booking cannot be cancelled once it is ${booking.status}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.cancelled },
    });

    // US-05.1: notify the customer regardless of who triggered the
    // cancellation (themselves or the business) — either way, it's news to
    // them about their booking.
    await this.notifications.notify(
      booking.customerId,
      'Booking Cancelled',
      `Your booking has been cancelled.`,
    );

    return updated;
  }

  // Forward-only lifecycle steps a booking passes through on its way to
  // completion. Not itself a named PRD user story, but required plumbing:
  // nothing else in the API can ever move a booking to in_progress, which
  // US-06.1 (daily reports) requires as a precondition.
  private static readonly NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
    [BookingStatus.pending]: BookingStatus.confirmed,
    [BookingStatus.confirmed]: BookingStatus.in_progress,
    [BookingStatus.in_progress]: BookingStatus.completed,
  };

  async updateStatus(requester: RequestingUser, bookingId: string, nextStatus: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (!requester.businessId || booking.businessId !== requester.businessId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const expectedNext = BookingsService.NEXT_STATUS[booking.status];
    if (!expectedNext || expectedNext !== nextStatus) {
      throw new BadRequestException(
        `Cannot move a booking from "${booking.status}" to "${nextStatus}"`,
      );
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: expectedNext },
    });

    // US-05.1
    await this.notifications.notify(
      booking.customerId,
      'Booking Update',
      `Your booking is now ${BookingsService.STATUS_LABEL[expectedNext]}.`,
    );

    return updated;
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
