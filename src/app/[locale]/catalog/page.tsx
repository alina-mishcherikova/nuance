import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { publicCatalog, catalogQuerySchema } from '@/features/quizzes/catalog';
import { catalogFacets } from '@/features/quizzes/repository';
import { applicationRate } from '@/features/quizzes/transport';
import { adultAllowed } from '@/features/solo/identity';
import type { Locale } from '@/lib/validation/quiz';
export const dynamic = 'force-dynamic';
export default async function Catalog({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const t = await getTranslations('quiz');
  const raw = await searchParams;
  const safe = catalogQuerySchema.safeParse(
    Object.fromEntries(
      Object.entries(raw).filter(([key]) =>
        ['search', 'category', 'tag', 'sort', 'page'].includes(key),
      ),
    ),
  );
  const query = safe.success ? safe.data : catalogQuerySchema.parse({});
  try {
    await applicationRate('catalog');
  } catch {
    return (
      <section className="catalog-panel">
        <h1>{t('catalog')}</h1>
        <p role="alert">{t('error')}</p>
      </section>
    );
  }
  const adult = await adultAllowed();
  const [catalog, facets] = await Promise.all([
    publicCatalog(locale as Locale, query, adult),
    catalogFacets(locale as Locale, adult),
  ]);
  const pageLink = (page: number) =>
    `/catalog?${new URLSearchParams({ ...query, page: String(page) })}`;
  return (
    <section className="catalog-panel">
      <p className="eyebrow">NUANCE</p>
      <h1>{t('catalog')}</h1>
      <p className="lead">{t('catalogIntro')}</p>
      <form className="catalog-filters" action={`/${locale}/catalog`}>
        <label>
          {t('search')}
          <input name="search" maxLength={80} defaultValue={query.search} />
        </label>
        <label>
          {t('category')}
          <select name="category" defaultValue={query.category}>
            <option value="">{t('all')}</option>
            {facets.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('tag')}
          <select name="tag" defaultValue={query.tag}>
            <option value="">{t('all')}</option>
            {facets.tags.map((tag) => (
              <option key={tag.slug} value={tag.slug}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('sort')}
          <select name="sort" defaultValue={query.sort}>
            {['featured', 'new', 'title'].map((sort) => (
              <option key={sort} value={sort}>
                {t(sort === 'title' ? 'titleSort' : sort)}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-primary">{t('filter')}</button>
      </form>
      <div className="quiz-grid">
        {catalog.items.map((item) => (
          <article className="quiz-card" key={item.id}>
            <p className="eyebrow">
              {item.featured ? t('featured') : t('new')} ·{' '}
              {t(item.adult ? 'adult' : 'age')}
            </p>
            <h2>
              <Link href={`/quizzes/${item.id}`}>{item.title}</Link>
            </h2>
            <p>{item.description}</p>
            <p>{t('count', { count: item.count, minutes: item.minutes })}</p>
          </article>
        ))}
      </div>
      {!catalog.items.length && <p role="status">{t('empty')}</p>}
      <nav className="actions" aria-label={t('catalog')}>
        {query.page > 1 && (
          <Link href={pageLink(query.page - 1)}>{t('previous')}</Link>
        )}
        <span>{t('page', { page: query.page, total: catalog.total })}</span>
        {query.page * 6 < catalog.total && (
          <Link href={pageLink(query.page + 1)}>{t('next')}</Link>
        )}
      </nav>
      <div className="actions">
        <Link href="/age">{t('gateLink')}</Link>
        <Link href="/builder">{t('builder')}</Link>
      </div>
    </section>
  );
}
