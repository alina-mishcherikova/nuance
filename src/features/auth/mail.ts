import 'server-only';
import nodemailer from 'nodemailer';
const copy = {
  en: {
    verify: 'Verify your Nuance email',
    reset: 'Reset your Nuance password',
    body: 'Your single-use code is',
    expiry:
      'It expires in 10 minutes. If you did not request this, ignore this message.',
  },
  uk: {
    verify: 'Підтвердіть email у Nuance',
    reset: 'Скиньте пароль Nuance',
    body: 'Ваш одноразовий код',
    expiry:
      'Код дійсний 10 хвилин. Якщо ви не надсилали запит, проігноруйте цей лист.',
  },
  fr: {
    verify: 'Confirmez votre adresse Nuance',
    reset: 'Réinitialisez votre mot de passe Nuance',
    body: 'Votre code à usage unique est',
    expiry:
      'Il expire dans 10 minutes. Si vous n’avez rien demandé, ignorez ce message.',
  },
};
export async function sendCode(
  email: string,
  code: string,
  kind: 'verify' | 'reset',
  locale: keyof typeof copy,
) {
  if (!process.env.SMTP_HOST) throw new Error('Mail transport unavailable');
  const smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: process.env.SMTP_SECURE === 'true',
    ...(process.env.SMTP_USER
      ? {
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        }
      : {}),
  });
  const t = copy[locale];
  await smtp.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: t[kind],
    text: `${t.body}: ${code}\n\n${t.expiry}`,
  });
}
