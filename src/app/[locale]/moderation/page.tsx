import { getTranslations } from 'next-intl/server';
import { currentSession } from '@/features/auth/session';
import { canModerate } from '@/lib/security/authorization';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Moderation() {
  const session = await currentSession();
  const t = await getTranslations();
  if (
    !canModerate(
      session
        ? { kind: 'user', userId: session.user.id, role: session.user.role }
        : null,
    )
  )
    return (
      <section className="auth-panel">
        <h1>{t('denied')}</h1>
      </section>
    );
  return (
    <section className="auth-panel">
      <h1>{t('moderationTitle')}</h1>
      <p>{t('coming')}</p>
    </section>
  );
}
