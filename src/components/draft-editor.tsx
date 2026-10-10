'use client';
import Image from 'next/image';
import { useHydrated } from '@/lib/use-hydrated';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  quizDocumentSchema,
  translationDeficiencies,
  locales,
  type QuizDocument,
  type Question,
  type Answer,
  type Locale,
} from '@/lib/validation/quiz';
import { Button } from './ui/button';
import { QuizAction } from './quiz-actions';
import { QuizControls } from './quiz-controls';
const blank = () => ({ en: '', uk: '', fr: '' });
function newQuestion(category: string): Question {
  return {
    id: crypto.randomUUID(),
    stableId: crypto.randomUUID(),
    prompt: blank(),
    category,
    required: true,
    weight: 1,
    imageId: null,
    type: 'YES_NO_MAYBE',
    options: ['yes', 'no', 'maybe'].map((value, i) => ({
      id: crypto.randomUUID(),
      value,
      label: {
        en: ['Yes', 'No', 'Maybe'][i]!,
        uk: ['Так', 'Ні', 'Можливо'][i]!,
        fr: ['Oui', 'Non', 'Peut-être'][i]!,
      },
    })),
  };
}
export function DraftEditor({
  initial,
  categories,
  tags,
}: {
  initial: {
    id: string;
    status: string;
    revision: number;
    document: QuizDocument;
  };
  categories: { slug: string; name: string }[];
  tags: { slug: string; name: string }[];
}) {
  const hydrated = useHydrated();
  const t = useTranslations('quiz'),
    locale = useLocale() as Locale,
    router = useRouter();
  const form = useForm<QuizDocument>({
    resolver: zodResolver(quizDocumentSchema),
    defaultValues: initial.document,
  });
  const watched = useWatch({ control: form.control });
  const [revision, setRevision] = useState(initial.revision),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [preview, setPreview] = useState(false),
    [previewAnswers, setPreviewAnswers] = useState<Answer[]>([]);
  const parsed = quizDocumentSchema.safeParse(watched),
    deficiencies = parsed.success ? translationDeficiencies(parsed.data) : [];
  function deficiencyLabel(path: string) {
    const parts = path.split('.');
    const language = parts.at(-1)!.toUpperCase();
    if (parts[0] === 'title' || parts[0] === 'description')
      return `${t(parts[0] === 'title' ? 'quizTitle' : 'description')} · ${language}`;
    const question = t('progress', {
      current: Number(parts[1]) + 1,
      total: watched.questions?.length ?? 0,
    });
    return parts[2] === 'options'
      ? `${question} · ${t('option', { number: Number(parts[3]) + 1 })} · ${language}`
      : `${question} · ${language}`;
  }
  const dirty = form.formState.isDirty,
    editable = initial.status === 'DRAFT';
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    const link = (e: MouseEvent) => {
      if (
        (e.target as HTMLElement).closest('a[href]') &&
        !window.confirm(t('leave'))
      )
        e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', link, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', link, true);
    };
  }, [dirty, t]);
  async function save(document: QuizDocument) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/drafts/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revision, document }),
      });
      const data = (await response.json()) as {
        revision: number;
        error?: string;
      };
      if (!response.ok) {
        setError(
          data.error === 'CONFLICT'
            ? 'conflict'
            : data.error === 'AGE_REQUIRED'
              ? 'gateBody'
              : 'error',
        );
        return;
      }
      setRevision(data.revision);
      form.reset(document);
    } catch {
      setError('error');
    } finally {
      setBusy(false);
    }
  }
  async function upload(
    file: File,
    path: 'coverId' | `questions.${number}.imageId`,
  ) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/media', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as { id: string };
      form.setValue(path, data.id, { shouldDirty: true });
    } catch {
      setError('error');
    } finally {
      setBusy(false);
    }
  }
  function changeQuestions(questions: Question[]) {
    form.setValue('questions', questions, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }
  function setType(i: number, type: Question['type']) {
    const questions = form.getValues('questions'),
      q = questions[i]!;
    const options =
      type === 'SCALE'
        ? []
        : type === 'YES_NO_MAYBE'
          ? newQuestion(q.category).options
          : q.options.length >= 2
            ? q.options
            : [1, 2].map((n) => ({
                id: crypto.randomUUID(),
                value: `option-${n}`,
                label: blank(),
              }));
    const base = {
      id: q.id,
      stableId: q.stableId,
      prompt: q.prompt,
      category: q.category,
      required: q.required,
      weight: q.weight,
      imageId: q.imageId,
      options,
    };
    questions[i] =
      type === 'MULTIPLE_CHOICE'
        ? { ...base, type, min: 1, max: Math.min(2, options.length) }
        : { ...base, type };
    changeQuestions(questions);
  }
  const imageInput = (
    label: string,
    path: 'coverId' | `questions.${number}.imageId`,
    id: string | null,
  ) => (
    <div className="form-field">
      <label>
        {label}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={`${label}: ${t('upload')}`}
          disabled={!hydrated || busy || !editable}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file, path);
            e.target.value = '';
          }}
        />
      </label>
      {id && (
        <>
          <Image
            unoptimized
            width={1600}
            height={900}
            className="quiz-image"
            src={`/api/media/${id}`}
            alt=""
          />
          <Button
            type="button"
            variant="quiet"
            onClick={() => form.setValue(path, null, { shouldDirty: true })}
          >
            {t('removeImage')}
          </Button>
        </>
      )}
    </div>
  );
  return (
    <section className="builder-panel">
      <p className="eyebrow">{t(initial.status)}</p>
      <h1>{t('edit')}</h1>
      <p>{t('draftIntro')}</p>
      {!editable && <QuizAction action="draft" sourceId={initial.id} />}
      <p role="status">{t(busy ? 'saving' : dirty ? 'unsaved' : 'saved')}</p>
      {error && <p role="alert">{t(error)}</p>}
      {error === 'gateBody' && <Link href="/age">{t('gateLink')}</Link>}
      {error === 'conflict' && (
        <Button
          onClick={() => {
            if (window.confirm(t('leave'))) window.location.reload();
          }}
        >
          {t('reconnect')}
        </Button>
      )}
      <form
        method="post"
        onSubmit={form.handleSubmit(save, () => setError('validation'))}
      >
        <fieldset
          disabled={!hydrated || busy || !editable}
          className="editor-fields"
        >
          <legend>{t('quizTitle')}</legend>
          <div className="translation-grid">
            {locales.map((lang) => (
              <div key={lang}>
                <h2>{lang.toUpperCase()}</h2>
                <label>
                  {t('quizTitle')} ({lang})
                  <input
                    {...form.register(`title.${lang}`)}
                    maxLength={160}
                    aria-invalid={!!form.formState.errors.title?.[lang]}
                  />
                </label>
                <label>
                  {t('description')} ({lang})
                  <textarea
                    {...form.register(`description.${lang}`)}
                    maxLength={2000}
                    aria-invalid={!!form.formState.errors.description?.[lang]}
                  />
                </label>
              </div>
            ))}
          </div>
          <label>
            {t('category')}
            <select {...form.register('category')}>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>{t('tag')}</legend>
            {tags.map((tag) => (
              <label className="answer-choice" key={tag.slug}>
                <input
                  type="checkbox"
                  value={tag.slug}
                  {...form.register('tags')}
                />
                {tag.name}
              </label>
            ))}
          </fieldset>
          <label className="answer-choice">
            <input type="checkbox" {...form.register('adultOnly')} />
            {t('adultFlag')}
          </label>
          {imageInput(t('cover'), 'coverId', watched.coverId ?? null)}
          {(watched.questions ?? []).map((q, i) => (
            <fieldset className="question-editor" key={q.id}>
              <legend>
                {t('progress', {
                  current: i + 1,
                  total: watched.questions?.length ?? 0,
                })}
              </legend>
              <div className="actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={i === 0}
                  onClick={() => {
                    const next = form.getValues('questions');
                    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                    changeQuestions(next);
                  }}
                >
                  {t('up')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={i === (watched.questions?.length ?? 0) - 1}
                  onClick={() => {
                    const next = form.getValues('questions');
                    [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                    changeQuestions(next);
                  }}
                >
                  {t('down')}
                </Button>
                <Button
                  type="button"
                  variant="quiet"
                  disabled={watched.questions?.length === 1}
                  onClick={() =>
                    changeQuestions(
                      form
                        .getValues('questions')
                        .filter((_, index) => index !== i),
                    )
                  }
                >
                  {t('remove')}
                </Button>
              </div>
              <label>
                {t('type')}
                <select
                  value={q.type}
                  onChange={(e) =>
                    setType(i, e.target.value as Question['type'])
                  }
                >
                  {[
                    'YES_NO_MAYBE',
                    'SINGLE_CHOICE',
                    'MULTIPLE_CHOICE',
                    'SCALE',
                  ].map((type) => (
                    <option key={type} value={type}>
                      {t(type)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="translation-grid">
                {locales.map((lang) => (
                  <label key={lang}>
                    {t('prompt')} ({lang})
                    <textarea
                      {...form.register(`questions.${i}.prompt.${lang}`)}
                      maxLength={2000}
                      aria-invalid={
                        !!form.formState.errors.questions?.[i]?.prompt?.[lang]
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                {t('category')}
                <select {...form.register(`questions.${i}.category`)}>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t('weight')}
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  {...form.register(`questions.${i}.weight`, {
                    valueAsNumber: true,
                  })}
                />
              </label>
              <label className="answer-choice">
                <input
                  type="checkbox"
                  {...form.register(`questions.${i}.required`)}
                />
                {t('required')}
              </label>
              {q.type === 'MULTIPLE_CHOICE' && (
                <div className="translation-grid">
                  <label>
                    {t('min')}
                    <input
                      type="number"
                      min={1}
                      max={12}
                      {...form.register(`questions.${i}.min`, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                  <label>
                    {t('max')}
                    <input
                      type="number"
                      min={1}
                      max={12}
                      {...form.register(`questions.${i}.max`, {
                        valueAsNumber: true,
                      })}
                    />
                  </label>
                </div>
              )}
              {(q.options ?? []).map((option, j) => (
                <div className="option-editor" key={option.id}>
                  <h3>{t('option', { number: j + 1 })}</h3>
                  <div className="translation-grid">
                    {locales.map((lang) => (
                      <label key={lang}>
                        {t('option', { number: j + 1 })} ({lang})
                        <input
                          {...form.register(
                            `questions.${i}.options.${j}.label.${lang}`,
                          )}
                          maxLength={500}
                        />
                      </label>
                    ))}
                  </div>
                  {q.type !== 'YES_NO_MAYBE' && (
                    <Button
                      type="button"
                      variant="quiet"
                      disabled={(q.options?.length ?? 0) <= 2}
                      onClick={() => {
                        const next = form.getValues('questions');
                        next[i]!.options = next[i]!.options.filter(
                          (_, n) => n !== j,
                        );
                        changeQuestions(next);
                      }}
                    >
                      {t('remove')}
                    </Button>
                  )}
                </div>
              ))}
              {q.type !== 'SCALE' && q.type !== 'YES_NO_MAYBE' && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={(q.options?.length ?? 0) >= 12}
                  onClick={() => {
                    const next = form.getValues('questions');
                    next[i]!.options.push({
                      id: crypto.randomUUID(),
                      value: `option-${crypto.randomUUID()}`,
                      label: blank(),
                    });
                    changeQuestions(next);
                  }}
                >
                  {t('addOption')}
                </Button>
              )}
              {imageInput(
                t('image'),
                `questions.${i}.imageId`,
                q.imageId ?? null,
              )}
            </fieldset>
          ))}
          <Button
            type="button"
            variant="outline"
            disabled={(watched.questions?.length ?? 0) >= 100}
            onClick={() =>
              changeQuestions([
                ...form.getValues('questions'),
                newQuestion(form.getValues('category')),
              ])
            }
          >
            {t('addQuestion')}
          </Button>
        </fieldset>
        <p>{t('deficiencies', { count: deficiencies.length })}</p>
        {deficiencies.length > 0 && (
          <ul className="deficiencies">
            {deficiencies.map((path) => (
              <li key={path}>{deficiencyLabel(path)}</li>
            ))}
          </ul>
        )}
        {editable && (
          <Button type="submit" disabled={!hydrated || busy}>
            {t('save')}
          </Button>
        )}
      </form>
      <div className="actions">
        <Button variant="outline" onClick={() => setPreview(!preview)}>
          {t('preview')}
        </Button>
        {editable && (
          <Button
            disabled={
              busy || dirty || !parsed.success || deficiencies.length > 0
            }
            onClick={async () => {
              setBusy(true);
              try {
                const response = await fetch(`/api/drafts/${initial.id}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ revision }),
                });
                if (!response.ok) throw new Error();
                router.refresh();
              } catch {
                setError('error');
                setBusy(false);
              }
            }}
          >
            {t('review')}
          </Button>
        )}
      </div>
      {preview && parsed.success && (
        <section className="preview-panel">
          <h2>{parsed.data.title[locale] || t('untitled')}</h2>
          <p>{parsed.data.description[locale]}</p>
          <p>{t('previewNote')}</p>
          {parsed.data.questions.map((question) => (
            <QuizControls
              key={question.id}
              question={question}
              answer={previewAnswers.find((a) => a.questionId === question.id)}
              onChange={(answer) =>
                setPreviewAnswers([
                  ...previewAnswers.filter(
                    (a) => a.questionId !== answer.questionId,
                  ),
                  answer,
                ])
              }
            />
          ))}
        </section>
      )}
      <p>
        <Link href="/builder">{t('builder')}</Link>
      </p>
    </section>
  );
}
