import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { routing } from '@/i18n/routing';
import { Link } from '@/i18n/navigation';
import { Providers } from '@/components/providers';
import { Preferences } from '@/components/preferences';
import { AboutDialog } from '@/components/ui/dialog';
import '../globals.css';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return {
    title: { default: 'Nuance', template: '%s · Nuance' },
    description: t('tagline'),
  };
}
export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Providers nonce={nonce}>
            <a className="skip-link" href="#main">
              {t('skip')}
            </a>
            <header className="site-header">
              <Link href="/" className="wordmark" aria-label="Nuance">
                nuance<span aria-hidden="true">✳</span>
              </Link>
              <nav aria-label={t('navHome')}>
                <Link href="/#how">{t('navHome')}</Link>
                <Link href="/account">{t('navAccount')}</Link>
              </nav>
              <Preferences />
            </header>
            <main id="main" tabIndex={-1}>
              {children}
            </main>
            <footer className="site-footer">
              <Link className="wordmark" href="/">
                nuance<span aria-hidden="true">✳</span>
              </Link>
              <p>{t('footer')}</p>
              <AboutDialog />
            </footer>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
