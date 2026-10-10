import { getTranslations } from 'next-intl/server';
import { z } from 'zod';
import { Link } from '@/i18n/navigation';
import { soloPrincipal, adultAllowed } from '@/features/solo/identity';
import { readAttempt } from '@/features/solo/service';
import { catalogFacets } from '@/features/quizzes/repository';
import { ApiError } from '@/features/quizzes/transport';
import { SoloRunner } from '@/components/solo-runner';
import type { Locale } from '@/lib/validation/quiz';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false } };
export default async function Solo({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params,
    t = await getTranslations('quiz');
  const principal = await soloPrincipal();
  let attempt;
  try {
    if (!principal || !z.uuid().safeParse(id).success)
      throw new ApiError('NOT_FOUND', 404);
    attempt = await readAttempt(id, principal, await adultAllowed());
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return (
      <section className="quiz-panel">
        <h1>{t('unavailable')}</h1>
        <Link href="/catalog">{t('exit')}</Link>
      </section>
    );
  }
  if (attempt.status !== 'SUBMITTED') return <SoloRunner initial={attempt} />;
  const facets = await catalogFacets(locale as Locale);
  const result = attempt.result;
  if (!result || result.schemaVersion !== 2)
    throw new Error('Result unavailable');
  return (
    <section className="quiz-panel">
      <p className="eyebrow">{attempt.document.title[locale as Locale]}</p>
      <h1>{t('results')}</h1>
      <p>{t('resultNote')}</p>
      <p>{t(result.observation)}</p>
      <h2>{t('profile')}</h2>
      {result.categories.map((category) => (
        <div className="quiz-card" key={category.category}>
          <h3>
            {facets.categories.find((c) => c.slug === category.category)
              ?.name ??
              (attempt.document.category === category.category
                ? attempt.document.title[locale as Locale]
                : category.category)}
          </h3>
          <p>{t('answered', { count: category.answered })}</p>
          {category.scaleMean !== null && (
            <p>
              {t('mean', {
                value: new Intl.NumberFormat(locale, {
                  maximumFractionDigits: 2,
                }).format(category.scaleMean),
              })}
            </p>
          )}
        </div>
      ))}
      <h2>{t('distribution')}</h2>
      <ul>
        {Object.entries(result.distribution).map(([value, count]) => {
          const label =
            attempt.document.questions
              .flatMap((q) => q.options)
              .find((o) => o.id === value)?.label[locale as Locale] ?? value;
          return (
            <li key={value}>
              {label}: {new Intl.NumberFormat(locale).format(count)}
            </li>
          );
        })}
      </ul>
      <p>{t('startNote')}</p>
      <Link href="/catalog">{t('exit')}</Link>
    </section>
  );
}
