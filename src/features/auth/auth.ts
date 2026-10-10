import 'server-only';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { emailOTP } from 'better-auth/plugins';
import { hash, verify } from '@node-rs/argon2';
import { db } from '@/db/client';
import * as schema from '@/db/schema';
import { sendCode } from './mail';
function createAuth() {
  return betterAuth({
    appName: 'Nuance',
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg', schema, transaction: true }),
    trustedOrigins: process.env.BETTER_AUTH_URL
      ? [process.env.BETTER_AUTH_URL]
      : [],
    logger: { disabled: true },
    advanced: {
      database: { generateId: 'uuid' },
      ipAddress: { ipAddressHeaders: [], disableIpTracking: true },
      useSecureCookies:
        process.env.BETTER_AUTH_URL?.startsWith('https://') ?? false,
    },
    user: {
      additionalFields: {
        role: {
          type: ['user', 'moderator', 'admin'],
          defaultValue: 'user',
          input: false,
        },
        locale: { type: ['en', 'uk', 'fr'], defaultValue: 'en', input: false },
      },
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
      cookieCache: { enabled: false },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      autoSignIn: false,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
      password: {
        hash: (password) =>
          hash(password, {
            algorithm: 2,
            memoryCost: 65536,
            timeCost: 3,
            parallelism: 1,
          }),
        verify: ({ hash: encoded, password }) => verify(encoded, password),
      },
    },
    rateLimit: {
      enabled: true,
      storage: 'database',
      window: 60,
      max: 20,
      customRules: {
        '/sign-in/email': { window: 60, max: 5 },
        '/sign-up/email': { window: 60, max: 5 },
        '/email-otp/*': { window: 60, max: 5 },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 8,
        expiresIn: 600,
        allowedAttempts: 5,
        storeOTP: 'hashed',
        disableSignUp: true,
        sendVerificationOnSignUp: true,
        overrideDefaultEmailVerification: true,
        sendVerificationOTP: async ({ email, otp, type }, ctx) => {
          const locale = ctx?.request?.headers.get('x-nuance-locale');
          await sendCode(
            email,
            otp,
            type === 'forget-password' ? 'reset' : 'verify',
            locale === 'uk' || locale === 'fr' ? locale : 'en',
          );
        },
      }),
    ],
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL)
    throw new Error('Authentication configuration unavailable');
  return (instance ??= createAuth());
}
