import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

@Injectable()
export class MediaService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const bucket = this.config.get<string>('OBJECT_STORAGE_BUCKET');
    const publicBaseUrl = this.config.get<string>('OBJECT_STORAGE_PUBLIC_URL');
    const region = this.config.get<string>('OBJECT_STORAGE_REGION') ?? 'auto';
    const endpoint = this.config.get<string>('OBJECT_STORAGE_ENDPOINT');
    const accessKeyId = this.config.get<string>('OBJECT_STORAGE_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('OBJECT_STORAGE_SECRET_ACCESS_KEY');
    if (!bucket || !publicBaseUrl || !accessKeyId || !secretAccessKey) {
      throw new ServiceUnavailableException('Media storage is not configured');
    }
    return {
      bucket,
      publicBaseUrl: publicBaseUrl.replace(/\/$/, ''),
      client: new S3Client({
        region,
        endpoint,
        forcePathStyle: Boolean(endpoint),
        credentials: { accessKeyId, secretAccessKey },
      }),
    };
  }

  async createUploadUrl(userId: string, purpose: string, contentType: string, size: number) {
    const { bucket, publicBaseUrl, client } = this.settings();
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    const key = `${purpose}/${userId}/${crypto.randomUUID()}.${extension}`;
    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size }),
      { expiresIn: 300 },
    );
    return { uploadUrl, publicUrl: `${publicBaseUrl}/${key}`, expiresIn: 300 };
  }
}
