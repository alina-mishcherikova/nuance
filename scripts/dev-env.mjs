import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const dbPassword = randomBytes(24).toString('hex');
const values = {
  DATABASE_URL: `postgresql://nuance:${dbPassword}@127.0.0.1:5432/nuance`,
  POSTGRES_USER: 'nuance',
  POSTGRES_PASSWORD: dbPassword,
  POSTGRES_DB: 'nuance',
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
  BETTER_AUTH_URL: 'http://localhost:3000',
  MINIO_ROOT_USER: 'nuance-local',
  MINIO_ROOT_PASSWORD: randomBytes(32).toString('hex'),
  S3_ENDPOINT: 'http://localhost:9000',
  S3_BUCKET: 'nuance-private',
  SMTP_HOST: 'localhost',
  SMTP_PORT: '1025',
  SMTP_FROM: 'Nuance <hello@nuance.local>',
};
writeFileSync(
  '.env',
  Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n') + '\n',
  { flag: 'wx', mode: 0o600 },
);
console.info('Created local .env; credentials are not printed.');
