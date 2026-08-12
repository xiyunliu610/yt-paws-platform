import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Role, BookingStatus } from '@prisma/client';

function makePrisma(booking: any) {
  return {
    booking: { findUnique: jest.fn().mockResolvedValue(booking) },
    dailyReport: {
      create: jest.fn().mockResolvedValue({ id: 'report-1' }),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
}

const inProgressBooking = {
  id: 'booking-1',
  businessId: 'business-1',
  customerId: 'customer-1',
  assignedStaffId: 'staff-1',
  status: BookingStatus.in_progress,
};

describe('ReportsService', () => {
  describe('create (write permission)', () => {
    it('throws NotFoundException when the booking does not exist', async () => {
      const prisma = makePrisma(null);
      const service = new ReportsService(prisma as any);
      await expect(
        service.create({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1', { text: 'ok' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows the assigned staff member to create a report', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await service.create({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1', { text: 'All good' });
      expect(prisma.dailyReport.create).toHaveBeenCalledWith({
        data: { bookingId: 'booking-1', text: 'All good', mediaUrls: [] },
      });
    });

    it('forbids a staff member of the same business who is not assigned to the booking', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.create({ userId: 'staff-2', role: Role.staff, businessId: 'business-1' }, 'booking-1', { text: 'ok' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids the customer from writing a report', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.create({ userId: 'customer-1', role: Role.customer, businessId: null }, 'booking-1', { text: 'ok' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the business owner to create a report', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await service.create({ userId: 'owner-1', role: Role.owner, businessId: 'business-1' }, 'booking-1', { text: 'ok' });
      expect(prisma.dailyReport.create).toHaveBeenCalled();
    });

    it('rejects an owner from a different business', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.create({ userId: 'owner-2', role: Role.owner, businessId: 'business-2' }, 'booking-1', { text: 'ok' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects reports on a booking that is not in progress', async () => {
      const prisma = makePrisma({ ...inProgressBooking, status: BookingStatus.confirmed });
      const service = new ReportsService(prisma as any);
      await expect(
        service.create({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1', { text: 'ok' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a report with neither text nor media', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.create({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('accepts a report with only media and no text', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await service.create({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1', {
        mediaUrls: ['https://example.com/photo.jpg'],
      });
      expect(prisma.dailyReport.create).toHaveBeenCalledWith({
        data: { bookingId: 'booking-1', text: undefined, mediaUrls: ['https://example.com/photo.jpg'] },
      });
    });
  });

  describe('findForBooking (read permission)', () => {
    it('allows the booking customer to read reports', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await service.findForBooking({ userId: 'customer-1', role: Role.customer, businessId: null }, 'booking-1');
      expect(prisma.dailyReport.findMany).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('allows the assigned staff member to read reports', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.findForBooking({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1'),
      ).resolves.toEqual([]);
    });

    // Regression test for the 2026-08-01 fix (docs/03_System_Architecture.md):
    // read permission previously matched "any user with the same businessId",
    // letting an unassigned staff member read another customer's report
    // photos/notes just by working at the same business.
    it('forbids a staff member of the same business who is not assigned to the booking', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.findForBooking({ userId: 'staff-2', role: Role.staff, businessId: 'business-1' }, 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids a customer who does not own the booking', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.findForBooking({ userId: 'customer-2', role: Role.customer, businessId: null }, 'booking-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows owner/admin of the business to read reports', async () => {
      const prisma = makePrisma(inProgressBooking);
      const service = new ReportsService(prisma as any);
      await expect(
        service.findForBooking({ userId: 'admin-1', role: Role.admin, businessId: 'business-1' }, 'booking-1'),
      ).resolves.toEqual([]);
    });

    it('throws NotFoundException when the booking does not exist', async () => {
      const prisma = makePrisma(null);
      const service = new ReportsService(prisma as any);
      await expect(
        service.findForBooking({ userId: 'staff-1', role: Role.staff, businessId: 'business-1' }, 'booking-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
