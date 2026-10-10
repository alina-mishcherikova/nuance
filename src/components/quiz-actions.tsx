'use client';
import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from './ui/button';
export function QuizAction({
  versionId,
  action,
  sourceId,
}: {
  versionId?: string;
  action: 'start' | 'age' | 'draft';
  sourceId?: string;
}) {
  const t = useTranslations('quiz'),
    locale = useLocale(),
    router = useRouter();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  return (
    <>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            const response = await fetch(
              action === 'start'
                ? '/api/solo'
                : action === 'age'
                  ? '/api/age'
                  : '/api/drafts',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                  action === 'start'
                    ? { versionId }
                    : action === 'age'
                      ? { adult: true }
                      : sourceId
                        ? { sourceId }
                        : {},
                ),
              },
            );
            if (!response.ok) throw new Error();
            const data = (await response.json()) as { id: string };
            if (action === 'age') {
              router.push('/catalog');
              router.refresh();
            } else
              router.push(
                action === 'start' ? `/solo/${data.id}` : `/builder/${data.id}`,
                { locale },
              );
          } catch {
            setError(true);
            setBusy(false);
          }
        }}
      >
        {t(
          action === 'start'
            ? 'alone'
            : action === 'age'
              ? 'gateConfirm'
              : sourceId
                ? 'clone'
                : 'create',
        )}
      </Button>
      {error && <p role="alert">{t('error')}</p>}
    </>
  );
}
