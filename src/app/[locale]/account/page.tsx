import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { currentSession } from '@/features/auth/session';
import { accountForPrincipal } from '@/db/repositories/users';
import { Preferences } from '@/components/preferences';
import { attemptHistory } from '@/features/solo/service';
import { Link } from '@/i18n/navigation';
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
  const history = await attemptHistory(session.user.id);
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
        <h2>{t('quiz.history')}</h2>
        <p>{t('quiz.startNote')}</p>
        {!history.length && <p>{t('quiz.noHistory')}</p>}
        <ul>
          {history.map((a) => (
            <li key={a.id}>
              <Link href={`/solo/${a.id}`}>{t('quiz.openResult')}</Link> ·{' '}
              {a.completedAt?.toLocaleDateString(locale)}
            </li>
          ))}
        </ul>
        <p>
          <Link href="/builder">{t('quiz.builder')}</Link>
        </p>
        <SignOut />
      </div>
    </section>
  );
}
