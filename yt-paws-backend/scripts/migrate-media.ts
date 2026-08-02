import 'dotenv/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { PrismaService } from '../src/prisma/prisma.service';
import * as crypto from 'crypto';

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const bucket = required('OBJECT_STORAGE_BUCKET');
const publicBaseUrl = required('OBJECT_STORAGE_PUBLIC_URL').replace(/\/$/, '');
const client = new S3Client({
  region: process.env.OBJECT_STORAGE_REGION ?? 'auto',
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
  forcePathStyle: Boolean(process.env.OBJECT_STORAGE_ENDPOINT),
  credentials: {
    accessKeyId: required('OBJECT_STORAGE_ACCESS_KEY_ID'),
    secretAccessKey: required('OBJECT_STORAGE_SECRET_ACCESS_KEY'),
  },
});

async function upload(dataUri: string, purpose: string, owner: string) {
  const match = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(dataUri);
  if (!match) return dataUri;
  const extension = match[1] === 'jpeg' ? 'jpg' : match[1];
  const key = `${purpose}/${owner}/${crypto.randomUUID()}.${extension}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: Buffer.from(match[2], 'base64'),
    ContentType: `image/${match[1]}`,
  }));
  return `${publicBaseUrl}/${key}`;
}

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  try {
    for (const pet of await prisma.pet.findMany({ where: { photoUrl: { startsWith: 'data:image/' } } })) {
      await prisma.pet.update({ where: { id: pet.id }, data: { photoUrl: await upload(pet.photoUrl!, 'pet', pet.ownerId) } });
    }
    for (const business of await prisma.business.findMany({ where: { wechatQrCodeUrl: { startsWith: 'data:image/' } } })) {
      await prisma.business.update({ where: { id: business.id }, data: { wechatQrCodeUrl: await upload(business.wechatQrCodeUrl!, 'wechat-qr', business.id) } });
    }
    for (const report of await prisma.dailyReport.findMany({ where: { mediaUrls: { isEmpty: false } } })) {
      if (!report.mediaUrls.some((url) => url.startsWith('data:image/'))) continue;
      const booking = await prisma.booking.findUniqueOrThrow({ where: { id: report.bookingId }, select: { customerId: true } });
      const mediaUrls = await Promise.all(report.mediaUrls.map((url) => upload(url, 'report', booking.customerId)));
      await prisma.dailyReport.update({ where: { id: report.id }, data: { mediaUrls } });
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
