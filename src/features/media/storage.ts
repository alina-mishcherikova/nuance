import 'server-only';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
export function storage() {
  return new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION ?? 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.MINIO_ROOT_USER!,
      secretAccessKey:
        process.env.S3_SECRET_ACCESS_KEY || process.env.MINIO_ROOT_PASSWORD!,
    },
  });
}
export async function storeImage(key: string, bytes: Buffer) {
  await storage().send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET ?? 'nuance-private',
      Key: key,
      Body: bytes,
      ContentType: 'image/webp',
    }),
  );
}
export async function retrieveImage(key: string) {
  return storage().send(
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET ?? 'nuance-private',
      Key: key,
    }),
  );
}
