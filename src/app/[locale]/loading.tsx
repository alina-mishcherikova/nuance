import { getTranslations } from 'next-intl/server';
export default async function Loading() {
  const t = await getTranslations();
  return (
    <section className="auth-panel" role="status">
      <p>{t('loading')}</p>
      <div className="skeleton" aria-hidden="true" />
    </section>
  );
}
