import 'dotenv/config';
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
const endpoint = new URL(process.env.S3_ENDPOINT ?? '');
if (
  process.env.NODE_ENV === 'production' ||
  !['localhost', '127.0.0.1', 'minio'].includes(endpoint.hostname)
)
  throw new Error('Storage initialization is local development only');
const client = new S3Client({
  endpoint: endpoint.toString(),
  region: 'us-east-1',
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER!,
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD!,
  },
});
const Bucket = process.env.S3_BUCKET ?? 'nuance-private';
try {
  await client.send(new HeadBucketCommand({ Bucket }));
} catch (error) {
  if (
    (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode !== 404
  )
    throw new Error('Local storage unavailable');
  await client.send(new CreateBucketCommand({ Bucket }));
}
console.info(
  'Local private bucket is ready; no public access policy was installed.',
);
client.destroy();
