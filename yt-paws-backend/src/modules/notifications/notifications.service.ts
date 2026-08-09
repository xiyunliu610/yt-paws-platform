import { Injectable, NotFoundException, ForbiddenException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sendExpoPushBestEffort } from './expo-push.util';

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private receiptTimer?: NodeJS.Timeout;
  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.receiptTimer = setInterval(() => void this.reconcilePushReceipts(), 60_000);
    this.receiptTimer.unref();
  }
  onModuleDestroy() { if (this.receiptTimer) clearInterval(this.receiptTimer); }

  // Called as a side effect from bookings/payments (US-05.1/US-05.2), per
  // the Version 1 simplified notification architecture (see
  // docs/03_System_Architecture.md §7) — there is no public "create"
  // endpoint. Always writes the in-app row; push is best-effort on top.
  async notify(userId: string, title: string, body: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body },
    });

    const devices = await this.prisma.pushDevice.findMany({ where: { userId }, select: { id: true, token: true } });
    for (const device of devices) void this.deliver(device, title, body);

    return notification;
  }

  private async deliver(device: { id: string; token: string }, title: string, body: string) {
    const expoTicketId = await sendExpoPushBestEffort(device.token, title, body);
    if (expoTicketId) await this.prisma.pushTicket.create({
      data: { deviceId: device.id, expoTicketId, nextCheckAt: new Date(Date.now() + 60_000) },
    }).catch(() => undefined);
  }

  async reconcilePushReceipts() {
    const tickets = await this.prisma.pushTicket.findMany({
      where: { status: 'pending', nextCheckAt: { lte: new Date() }, attempts: { lt: 4 } },
      take: 100,
    });
    if (!tickets.length) return;
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ids: tickets.map((ticket) => ticket.expoTicketId) }),
      });
      const payload = await response.json() as { data?: Record<string, { status: string; message?: string; details?: { error?: string } }> };
      for (const ticket of tickets) {
        const receipt = payload.data?.[ticket.expoTicketId];
        if (!receipt) continue;
        if (receipt.status === 'ok') {
          await this.prisma.pushTicket.update({ where: { id: ticket.id }, data: { status: 'delivered', attempts: { increment: 1 } } });
        } else if (receipt.details?.error === 'DeviceNotRegistered') {
          await this.prisma.pushDevice.delete({ where: { id: ticket.deviceId } });
        } else {
          const attempts = ticket.attempts + 1;
          await this.prisma.pushTicket.update({ where: { id: ticket.id }, data: {
            attempts, status: attempts >= 4 ? 'failed' : 'pending', error: receipt.details?.error ?? receipt.message,
            nextCheckAt: new Date(Date.now() + 2 ** attempts * 60_000),
          } });
        }
      }
    } catch {
      await this.prisma.pushTicket.updateMany({ where: { id: { in: tickets.map((ticket) => ticket.id) } }, data: { nextCheckAt: new Date(Date.now() + 120_000) } });
    }
  }

  // Same as notify(), but for every owner/admin of a business at once —
  // used when a business (not a single user) needs to hear about something,
  // e.g. a customer confirming a WeChat transfer that still needs reconciling.
  async notifyBusinessManagers(businessId: string, title: string, body: string) {
    const managers = await this.prisma.user.findMany({
      where: { businessId, role: { in: ['owner', 'admin'] } },
    });
    await Promise.all(managers.map((manager) => this.notify(manager.id, title, body)));
  }

  async findMine(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async registerDevice(userId: string, pushToken: string) {
    await this.prisma.pushDevice.upsert({
      where: { token: pushToken },
      create: { userId, token: pushToken },
      update: { userId },
    });
    return { registered: true };
  }

  async unregisterDevice(userId: string, pushToken: string) {
    await this.prisma.pushDevice.deleteMany({ where: { userId, token: pushToken } });
    return { registered: false };
  }
}
