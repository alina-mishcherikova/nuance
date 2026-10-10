import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { currentSession } from '@/features/auth/session';
import { accountForPrincipal } from '@/db/repositories/users';
import { Preferences } from '@/components/preferences';
import { SignOut } from '@/components/sign-out';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Account({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await currentSession();
  if (!session) return redirect({ href: '/auth/login', locale });
  const account = await accountForPrincipal({ userId: session.user.id });
  if (!account) return redirect({ href: '/auth/login', locale });
  const t = await getTranslations();
  return (
    <section className="account-panel">
      <p className="eyebrow">NUANCE</p>
      <h1>{t('accountTitle')}</h1>
      <p>{t('accountBody')}</p>
      <div className="account-card">
        <h2>{account.name}</h2>
        <p>{account.email}</p>
        <p className="badge">{t('verifiedEmail')}</p>
        <hr />
        <h2>{t('settings')}</h2>
        <Preferences />
        <p>{t('futureHistory')}</p>
        <SignOut />
      </div>
    </section>
  );
}
