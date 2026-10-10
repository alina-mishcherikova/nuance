import { getTranslations } from 'next-intl/server';
import { QuizAction } from '@/components/quiz-actions';
import { Link } from '@/i18n/navigation';
export const metadata = { robots: { index: false, follow: false } };
export default async function Age() {
  const t = await getTranslations('quiz');
  return (
    <section className="quiz-panel">
      <h1>{t('gateTitle')}</h1>
      <p>{t('gateBody')}</p>
      <QuizAction action="age" />
      <p>
        <Link href="/catalog">{t('exit')}</Link>
      </p>
    </section>
  );
}
