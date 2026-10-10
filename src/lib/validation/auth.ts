import { z } from 'zod';
const email = z
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
const password = z.string().min(12).max(128);
const otp = z.string().regex(/^\d{8}$/);
export const authBodies = {
  'sign-up/email': z
    .object({ email, password, name: z.string().trim().min(1).max(80) })
    .strict(),
  'sign-in/email': z.object({ email, password }).strict(),
  'sign-out': z.object({}).strict(),
  'email-otp/send-verification-otp': z
    .object({ email, type: z.literal('email-verification') })
    .strict(),
  'email-otp/verify-email': z.object({ email, otp }).strict(),
  'email-otp/request-password-reset': z.object({ email }).strict(),
  'email-otp/reset-password': z.object({ email, otp, password }).strict(),
};
