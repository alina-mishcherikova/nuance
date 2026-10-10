import { adultAllowed } from '@/features/solo/identity';
import { getTranslations } from 'next-intl/server';
import { currentSession } from '@/features/auth/session';
import { listDrafts } from '@/features/builder/service';
import { QuizAction } from '@/components/quiz-actions';
import { Link, redirect } from '@/i18n/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Builder({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params,
    session = await currentSession();
  if (!session) return redirect({ href: '/auth/login', locale });
  const t = await getTranslations('quiz');
  const drafts = await listDrafts(session.user.id, await adultAllowed());
  return (
    <section className="builder-panel">
      <h1>{t('builder')}</h1>
      <p>{t('draftIntro')}</p>
      <QuizAction action="draft" />
      <div className="quiz-grid">
        {drafts
          .filter((d) => d.locale === locale)
          .map((d) => (
            <article className="quiz-card" key={d.id}>
              <p className="eyebrow">{t(d.status)}</p>
              <h2>
                <Link href={`/builder/${d.id}`}>
                  {d.title || t('untitled')}
                </Link>
              </h2>
            </article>
          ))}
      </div>
    </section>
  );
}
