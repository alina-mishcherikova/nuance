'use client';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import type { Question, Answer, Locale } from '@/lib/validation/quiz';
export function QuizControls({
  question,
  answer,
  onChange,
  disabled = false,
}: {
  question: Question;
  answer?: Answer;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
}) {
  const locale = useLocale() as Locale,
    t = useTranslations('quiz');
  const options =
    question.type === 'SCALE'
      ? [1, 2, 3, 4, 5].map((value) => ({
          id: String(value),
          label: String(value),
        }))
      : question.options.map((o) => ({ id: o.id, label: o.label[locale] }));
  return (
    <fieldset disabled={disabled} className="question-inputs">
      <legend>
        {question.prompt[locale]}{' '}
        <span className="badge">
          {t(question.required ? 'required' : 'optional')}
        </span>
      </legend>
      {question.imageId && (
        <Image
          unoptimized
          width={1600}
          height={900}
          className="quiz-image"
          src={`/api/media/${question.imageId}`}
          alt=""
        />
      )}
      {question.type === 'MULTIPLE_CHOICE' && (
        <p>{t('selection', { min: question.min, max: question.max })}</p>
      )}
      {question.type === 'SCALE' && <p>{t('scaleHelp')}</p>}
      {options.map((option) => {
        const checked =
          answer?.type === 'SCALE'
            ? String(answer.value) === option.id
            : (answer?.options.includes(option.id) ?? false);
        return (
          <label className="answer-choice" key={option.id}>
            <input
              type={question.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
              name={question.id}
              value={option.id}
              checked={checked}
              onChange={() => {
                if (question.type === 'SCALE')
                  onChange({
                    questionId: question.id,
                    type: 'SCALE',
                    value: Number(option.id),
                  });
                else {
                  const old =
                    answer && answer.type !== 'SCALE' ? answer.options : [];
                  const selected =
                    question.type === 'MULTIPLE_CHOICE'
                      ? checked
                        ? old.filter((id) => id !== option.id)
                        : [...old, option.id]
                      : [option.id];
                  onChange({
                    questionId: question.id,
                    type: question.type,
                    options: selected,
                  });
                }
              }}
            />{' '}
            <span>{option.label}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
