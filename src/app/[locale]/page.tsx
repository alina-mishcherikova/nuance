import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
export default async function Home() {
  const t = await getTranslations();
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1>
            {t('heroA')}
            <br />
            <span>{t('heroB')}</span>
          </h1>
          <p className="lead">{t('heroBody')}</p>
          <div className="actions">
            <Button asChild>
              <Link href="/auth/signup">
                {t('cta')} <span aria-hidden="true">↗</span>
              </Link>
            </Button>
            <a className="text-link" href="#how">
              {t('explore')} <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="small-note">{t('note')}</p>
        </div>
        <aside className="question-card">
          <div className="card-top">
            <span className="eyebrow">{t('cardLabel')}</span>
            <span aria-hidden="true">✳</span>
          </div>
          <p className="sample-question">{t('cardQuestion')}</p>
          <div className="card-bottom">
            <span>{t('cardFoot')}</span>
            <span aria-hidden="true">↗</span>
          </div>
        </aside>
      </section>
      <section className="how" id="how">
        <div className="section-intro">
          <h2>{t('howTitle')}</h2>
          <p>{t('howBody')}</p>
        </div>
        <ol className="steps">
          {[1, 2, 3].map((i) => (
            <li key={i}>
              <span className="step-number" aria-hidden="true">
                0{i}
              </span>
              <h3>{t(`step${i}`)}</h3>
              <p>{t(`step${i}Body`)}</p>
            </li>
          ))}
        </ol>
      </section>
      <section className="catalog-empty">
        <h2>{t('quiz.catalog')}</h2>
        <p>{t('quiz.catalogIntro')}</p>
        <Button asChild>
          <Link href="/catalog">{t('quiz.catalog')}</Link>
        </Button>
      </section>
    </>
  );
}
