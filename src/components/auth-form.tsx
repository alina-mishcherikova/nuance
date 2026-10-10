'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from './ui/button';
export type AuthMode = 'login' | 'signup' | 'verify' | 'reset' | 'new-password';
type Fields = { name: string; email: string; password: string; otp: string };
export function AuthForm({ mode }: { mode: AuthMode }) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [notice, setNotice] = useState<string>();
  const [failed, setFailed] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<Fields>();
  async function post(path: string, body: object) {
    try {
      const result = await fetch(`/api/auth/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nuance-locale': locale,
        },
        body: JSON.stringify(body),
      });
      return result.ok;
    } catch {
      return false;
    }
  }
  async function submit(values: Fields) {
    setNotice(undefined);
    setFailed(false);
    const email = values.email.trim().toLowerCase();
    let ok = false;
    if (mode === 'signup')
      ok = await post('sign-up/email', {
        name: values.name,
        email,
        password: values.password,
      });
    else if (mode === 'login')
      ok = await post('sign-in/email', { email, password: values.password });
    else if (mode === 'verify')
      ok = await post('email-otp/verify-email', { email, otp: values.otp });
    else if (mode === 'reset')
      ok = await post('email-otp/request-password-reset', { email });
    else
      ok = await post('email-otp/reset-password', {
        email,
        otp: values.otp,
        password: values.password,
      });
    if (!ok) {
      setFailed(true);
      return;
    }
    if (mode === 'login') {
      router.push('/account');
      router.refresh();
    } else
      setNotice(
        mode === 'verify'
          ? 'verified'
          : mode === 'new-password'
            ? 'resetDone'
            : 'sent',
      );
  }
  const fields: Array<keyof Fields> = [
    ...(mode === 'signup' ? ['name' as const] : []),
    'email',
    ...(['login', 'signup', 'new-password'].includes(mode)
      ? ['password' as const]
      : []),
    ...(['verify', 'new-password'].includes(mode) ? ['otp' as const] : []),
  ];
  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="auth-form">
      {fields.map((field) => (
        <div className="form-field" key={field}>
          <label htmlFor={field}>{t(field === 'otp' ? 'code' : field)}</label>
          <input
            id={field}
            type={
              field === 'password'
                ? 'password'
                : field === 'email'
                  ? 'email'
                  : 'text'
            }
            inputMode={field === 'otp' ? 'numeric' : undefined}
            autoComplete={
              field === 'password'
                ? mode === 'login'
                  ? 'current-password'
                  : 'new-password'
                : field === 'otp'
                  ? 'one-time-code'
                  : field === 'name'
                    ? 'name'
                    : 'email'
            }
            maxLength={
              field === 'name'
                ? 80
                : field === 'email'
                  ? 254
                  : field === 'otp'
                    ? 8
                    : 128
            }
            aria-invalid={!!errors[field]}
            aria-describedby={errors[field] ? `${field}-error` : undefined}
            {...register(field, {
              required: true,
              minLength: field === 'password' ? 12 : field === 'otp' ? 8 : 1,
              maxLength:
                field === 'name'
                  ? 80
                  : field === 'email'
                    ? 254
                    : field === 'otp'
                      ? 8
                      : 128,
              pattern:
                field === 'email'
                  ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  : field === 'otp'
                    ? /^\d{8}$/
                    : undefined,
            })}
          />
          {errors[field] && (
            <p id={`${field}-error`} className="form-error">
              {t('invalid')}
            </p>
          )}
        </div>
      ))}
      {failed && (
        <p role="alert" className="form-error">
          {t('authError')}
        </p>
      )}
      {notice && <p role="status">{t(notice)}</p>}
      <Button disabled={isSubmitting} type="submit">
        {t(
          isSubmitting
            ? 'pending'
            : mode === 'verify'
              ? 'verify'
              : mode === 'reset'
                ? 'sendReset'
                : mode === 'new-password'
                  ? 'savePassword'
                  : 'submit',
        )}{' '}
        <span aria-hidden="true">↗</span>
      </Button>
      <div className="auth-links">
        {mode === 'login' ? (
          <>
            <Link href="/auth/signup">{t('signUp')}</Link>
            <Link href="/auth/reset">{t('resetTitle')}</Link>
            <Link href="/auth/verify">{t('verify')}</Link>
          </>
        ) : (
          <Link href="/auth/login">{t('backLogin')}</Link>
        )}
        {mode === 'signup' && <Link href="/auth/verify">{t('verify')}</Link>}
        {mode === 'reset' && (
          <Link href="/auth/new-password">{t('newPasswordTitle')}</Link>
        )}
        {mode === 'verify' && (
          <Button
            type="button"
            variant="quiet"
            onClick={async () => {
              const email = getValues('email');
              if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFailed(true);
                return;
              }
              const ok = await post('email-otp/send-verification-otp', {
                email,
                type: 'email-verification',
              });
              setFailed(!ok);
              if (ok) setNotice('sent');
            }}
          >
            {t('resend')}
          </Button>
        )}
      </div>
    </form>
  );
}
