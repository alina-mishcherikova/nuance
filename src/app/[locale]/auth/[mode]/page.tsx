import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { AuthForm, type AuthMode } from '@/components/auth-form';
export const metadata = { robots: { index: false, follow: false } };
export default async function AuthPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!['login', 'signup', 'verify', 'reset', 'new-password'].includes(mode))
    notFound();
  const t = await getTranslations();
  const title =
    {
      login: 'authTitle',
      signup: 'signupTitle',
      verify: 'verifyTitle',
      reset: 'resetTitle',
      'new-password': 'newPasswordTitle',
    }[mode] ?? 'authTitle';
  return (
    <section className="auth-panel">
      <p className="eyebrow">NUANCE</p>
      <h1>{t(title)}</h1>
      <AuthForm mode={mode as AuthMode} />
    </section>
  );
}
