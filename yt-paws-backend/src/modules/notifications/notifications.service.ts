import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { sendExpoPushBestEffort } from './expo-push.util';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  // Called as a side effect from bookings/payments (US-05.1/US-05.2), per
  // the Version 1 simplified notification architecture (see
  // docs/03_System_Architecture.md §7) — there is no public "create"
  // endpoint. Always writes the in-app row; push is best-effort on top.
  async notify(userId: string, title: string, body: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, title, body },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.pushToken) {
      void sendExpoPushBestEffort(user.pushToken, title, body);
    }

    return notification;
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
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken } });
    return { registered: true };
  }

  async unregisterDevice(userId: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { pushToken: null } });
    return { registered: false };
  }
}
