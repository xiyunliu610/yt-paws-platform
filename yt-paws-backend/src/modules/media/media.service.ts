import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

type MediaUser = { userId: string; role: string; businessId: string | null };

@Injectable()
export class MediaService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  private settings() {
    const bucket = this.config.get<string>('OBJECT_STORAGE_BUCKET');
    const publicWebUrl = this.config.get<string>('PUBLIC_WEB_URL');
    const region = this.config.get<string>('OBJECT_STORAGE_REGION') ?? 'auto';
    const endpoint = this.config.get<string>('OBJECT_STORAGE_ENDPOINT');
    const accessKeyId = this.config.get<string>('OBJECT_STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('OBJECT_STORAGE_SECRET_ACCESS_KEY');
    if (!bucket || !publicWebUrl || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException('Media storage is not configured');
    }
    return {
      bucket,
      publicWebUrl: publicWebUrl.replace(/\/$/, ''),
      client: new S3Client({
        region,
        endpoint,
        forcePathStyle: Boolean(endpoint),
        credentials: { accessKeyId, secretAccessKey },
      }),
    };
  }

  async createUploadUrl(userId: string, purpose: string, contentType: string, size: number) {
    const { bucket, publicWebUrl, client } = this.settings();
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `${purpose}/${userId}/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size }),
      { expiresIn: 300 },
    );
    const encodedKey = Buffer.from(key).toString('base64url');
    return { uploadUrl, publicUrl: `${publicWebUrl}/media/files/${encodedKey}`, expiresIn: 300 };
  }

  async createReadUrl(user: MediaUser, encodedKey: string) {
    let key: string;
    try {
      key = Buffer.from(encodedKey, 'base64url').toString('utf8');
    } catch {
      throw new NotFoundException('Media not found');
    }
    if (!/^(pet|report|wechat-qr)\/[0-9a-f-]+\/[0-9a-f-]+\.(jpg|png|webp)$/.test(key)) {
      throw new NotFoundException('Media not found');
    }
    const protectedUrl = `${this.settings().publicWebUrl}/media/files/${encodedKey}`;
    const allowed = await this.canRead(user, protectedUrl);
    if (!allowed) throw new ForbiddenException('You do not have access to this media');
    const { bucket, client } = this.settings();
    return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 60 });
  }

  private async canRead(user: MediaUser, url: string) {
    const pet = await this.prisma.pet.findFirst({
      where: { photoUrl: url },
      select: { ownerId: true, bookings: { select: { customerId: true, assignedStaffId: true, businessId: true } } },
    });
    if (pet) return pet.ownerId === user.userId || pet.bookings.some((booking) =>
      booking.customerId === user.userId || booking.assignedStaffId === user.userId ||
      ((user.role === 'owner' || user.role === 'admin') && user.businessId === booking.businessId));

    const report = await this.prisma.dailyReport.findFirst({
      where: { mediaUrls: { has: url } },
      select: { booking: { select: { customerId: true, assignedStaffId: true, businessId: true } } },
    });
    if (report) {
      const booking = report.booking;
      return booking.customerId === user.userId || booking.assignedStaffId === user.userId ||
        ((user.role === 'owner' || user.role === 'admin') && user.businessId === booking.businessId);
    }

    const business = await this.prisma.business.findFirst({
      where: { wechatQrCodeUrl: url },
      select: { id: true, bookings: { where: { customerId: user.userId }, select: { id: true }, take: 1 } },
    });
    return Boolean(business && (user.businessId === business.id || business.bookings.length > 0));
  }
}
