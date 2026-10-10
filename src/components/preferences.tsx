'use client';
import { useId } from 'react';
import { useTheme } from 'next-themes';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Button } from './ui/button';
export function Preferences() {
  const id = useId();
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="preferences">
      <label className="sr-only" htmlFor={id}>
        {t('language')}
      </label>
      <select
        id={id}
        value={locale}
        onChange={(e) => router.replace(pathname, { locale: e.target.value })}
      >
        <option value="en">EN</option>
        <option value="uk">УК</option>
        <option value="fr">FR</option>
      </select>
      <Button
        variant="quiet"
        aria-label={t('theme')}
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      >
        <span aria-hidden="true">◐</span>
      </Button>
    </div>
  );
}
