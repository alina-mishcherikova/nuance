'use client';
import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { QuizControls } from './quiz-controls';
import { Button } from './ui/button';
import {
  validateAnswers,
  type QuizDocument,
  type Answer,
  type Locale,
} from '@/lib/validation/quiz';
type State = {
  id: string;
  versionId: string;
  revision: number;
  document: QuizDocument;
  responses: Answer[];
};
export function SoloRunner({ initial }: { initial: State }) {
  const t = useTranslations('quiz'),
    locale = useLocale() as Locale,
    router = useRouter();
  const [responses, setResponses] = useState(initial.responses),
    [revision, setRevision] = useState(initial.revision),
    [index, setIndex] = useState(0),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(true),
    [error, setError] = useState('');
  const savingRef = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const question = initial.document.questions[index]!;
  useEffect(() => {
    if (saved && !busy) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saved, busy]);
  async function persist(next: Answer[], submit = false) {
    savingRef.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/solo/${initial.id}`, {
        method: submit ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: initial.versionId,
          revision,
          responses: next,
        }),
      });
      const data = (await response.json()) as {
        revision: number;
        error?: string;
      };
      if (!response.ok) {
        setError(
          data.error === 'CONFLICT'
            ? 'conflict'
            : data.error === 'REQUIRED_ANSWERS'
              ? 'missing'
              : data.error === 'NOT_FOUND'
                ? 'unavailable'
                : 'error',
        );
        return;
      }
      setRevision(data.revision);
      setSaved(true);
      if (submit) router.refresh();
    } catch {
      setError('error');
    } finally {
      savingRef.current = false;
      setBusy(false);
    }
  }
  function change(answer: Answer) {
    if (savingRef.current) return;
    const next = [
      ...responses.filter((a) => a.questionId !== answer.questionId),
      answer,
    ].filter((a) => a.type === 'SCALE' || a.options.length > 0);
    setResponses(next);
    setSaved(false);
    try {
      validateAnswers(initial.document, next, false);
      void persist(next);
    } catch {
      /* Incomplete multi-selection remains local until valid. */
    }
  }
  let complete = true;
  try {
    validateAnswers(initial.document, responses, true);
  } catch {
    complete = false;
  }
  let currentValid = true;
  try {
    validateAnswers(
      { ...initial.document, questions: [question] },
      responses.filter((a) => a.questionId === question.id),
      true,
    );
  } catch {
    currentValid = false;
  }
  return (
    <section className="quiz-panel">
      <p className="eyebrow">{initial.document.title[locale]}</p>
      <h1 className="quiz-heading" ref={heading} tabIndex={-1}>
        {t('progress', {
          current: index + 1,
          total: initial.document.questions.length,
        })}
      </h1>
      <progress
        aria-label={t('progress', {
          current: index + 1,
          total: initial.document.questions.length,
        })}
        value={index + 1}
        max={initial.document.questions.length}
      />
      <QuizControls
        question={question}
        answer={responses.find((a) => a.questionId === question.id)}
        onChange={change}
        disabled={busy}
      />
      <p role="status" aria-live="polite">
        {t(busy ? 'saving' : saved ? 'saved' : 'unsaved')}
      </p>
      {error && <p role="alert">{t(error)}</p>}
      {!saved && !busy && (
        <Button variant="outline" onClick={() => void persist(responses)}>
          {t('retry')}
        </Button>
      )}
      {error === 'conflict' && (
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('reconnect')}
        </Button>
      )}
      <div className="actions">
        <Button
          variant="outline"
          disabled={busy || index === 0}
          onClick={() => {
            setIndex(index - 1);
            heading.current?.focus();
          }}
        >
          {t('previous')}
        </Button>
        {index < initial.document.questions.length - 1 ? (
          <Button
            disabled={busy || !saved || !currentValid}
            onClick={() => {
              setIndex(index + 1);
              heading.current?.focus();
            }}
          >
            {t('next')}
          </Button>
        ) : (
          <Button
            disabled={busy || !saved || !complete}
            onClick={() => void persist(responses, true)}
          >
            {t('submit')}
          </Button>
        )}
      </div>
      {!complete && index === initial.document.questions.length - 1 && (
        <p>{t('missing')}</p>
      )}
      <p>{t('startNote')}</p>
      <Link
        href="/catalog"
        onClick={(e) => {
          if ((!saved || busy) && !window.confirm(t('leave')))
            e.preventDefault();
        }}
      >
        {t('exit')}
      </Link>
    </section>
  );
}
