import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { eligibleVersion } from '@/features/quizzes/catalog';
import { adultAllowed } from '@/features/solo/identity';
import { QuizAction } from '@/components/quiz-actions';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/lib/validation/quiz';
export const dynamic = 'force-dynamic';
// Generic metadata, including for gated/missing IDs, never contains adult descriptions.
export const metadata = { robots: { index: false, follow: false } };
export default async function Detail({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const doc = await eligibleVersion(id, await adultAllowed());
  if (!doc) notFound();
  const t = await getTranslations('quiz');
  return (
    <section className="quiz-panel">
      <p className="eyebrow">{t(doc.adultOnly ? 'adult' : 'age')}</p>
      <h1>{doc.title[locale as Locale]}</h1>
      <p className="lead">{doc.description[locale as Locale]}</p>
      {doc.coverId && (
        <Image
          unoptimized
          width={1600}
          height={900}
          className="quiz-image"
          src={`/api/media/${doc.coverId}`}
          alt=""
        />
      )}
      <p>
        {t('count', {
          count: doc.questions.length,
          minutes: Math.max(1, Math.ceil((doc.questions.length * 25) / 60)),
        })}
      </p>
      <p>{t('startNote')}</p>
      <QuizAction action="start" versionId={id} />
      <p>
        <Link href="/catalog">{t('exit')}</Link>
      </p>
    </section>
  );
}
