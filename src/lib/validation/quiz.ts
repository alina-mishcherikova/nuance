import { z } from 'zod';
export const locales = ['en', 'uk', 'fr'] as const;
export type Locale = (typeof locales)[number];
const text = (max: number) => z.string().trim().max(max);
export const localizedSchema = z
  .object({ en: text(2000), uk: text(2000), fr: text(2000) })
  .strict();
const optionSchema = z
  .object({
    id: z.uuid(),
    label: z.object({ en: text(500), uk: text(500), fr: text(500) }).strict(),
    value: z.string().regex(/^[a-z0-9_-]{1,80}$/),
  })
  .strict();
const common = {
  id: z.uuid(),
  stableId: z.uuid(),
  prompt: localizedSchema,
  category: z.string().regex(/^[a-z0-9-]{1,60}$/),
  required: z.boolean(),
  weight: z.number().int().min(0).max(10),
  imageId: z.uuid().nullable(),
};
export const questionSchema = z.discriminatedUnion('type', [
  z
    .object({
      ...common,
      type: z.literal('YES_NO_MAYBE'),
      options: z.array(optionSchema).length(3),
    })
    .strict(),
  z
    .object({
      ...common,
      type: z.literal('SINGLE_CHOICE'),
      options: z.array(optionSchema).min(2).max(12),
    })
    .strict(),
  z
    .object({
      ...common,
      type: z.literal('MULTIPLE_CHOICE'),
      options: z.array(optionSchema).min(2).max(12),
      min: z.number().int().min(1).max(12),
      max: z.number().int().min(1).max(12),
    })
    .strict(),
  z
    .object({
      ...common,
      type: z.literal('SCALE'),
      options: z.array(optionSchema).length(0),
    })
    .strict(),
]);
export const quizDocumentSchema = z
  .object({
    title: z.object({ en: text(160), uk: text(160), fr: text(160) }).strict(),
    description: localizedSchema,
    category: z.string().regex(/^[a-z0-9-]{1,60}$/),
    tags: z.array(z.string().regex(/^[a-z0-9-]{1,60}$/)).max(8),
    adultOnly: z.boolean(),
    coverId: z.uuid().nullable(),
    questions: z.array(questionSchema).min(1).max(100),
  })
  .strict()
  .superRefine((quiz, ctx) => {
    if (new Set(quiz.tags).size !== quiz.tags.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate tags',
        path: ['tags'],
      });
    if (
      new Set(quiz.questions.map((q) => q.id)).size !== quiz.questions.length ||
      new Set(quiz.questions.map((q) => q.stableId)).size !==
        quiz.questions.length
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Duplicate questions',
        path: ['questions'],
      });
    quiz.questions.forEach((q, i) => {
      if (
        new Set(q.options.map((o) => o.id)).size !== q.options.length ||
        new Set(q.options.map((o) => o.value)).size !== q.options.length
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Duplicate options',
          path: ['questions', i, 'options'],
        });
      if (
        q.type === 'MULTIPLE_CHOICE' &&
        (q.min > q.max || q.max > q.options.length)
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Invalid selection bounds',
          path: ['questions', i, 'min'],
        });
      if (
        q.type === 'YES_NO_MAYBE' &&
        q.options.map((o) => o.value).join(',') !== 'yes,no,maybe'
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Expected yes, no, maybe',
          path: ['questions', i, 'options'],
        });
    });
  });
export type QuizDocument = z.infer<typeof quizDocumentSchema>;
export type Question = QuizDocument['questions'][number];
export function translationDeficiencies(quiz: QuizDocument): string[] {
  const missing: string[] = [];
  for (const locale of locales) {
    for (const key of ['title', 'description'] as const)
      if (!quiz[key][locale].trim()) missing.push(`${key}.${locale}`);
    quiz.questions.forEach((q, i) => {
      if (!q.prompt[locale].trim())
        missing.push(`questions.${i}.prompt.${locale}`);
      q.options.forEach((o, j) => {
        if (!o.label[locale].trim())
          missing.push(`questions.${i}.options.${j}.${locale}`);
      });
    });
  }
  return missing;
}
export const responseSchema = z.discriminatedUnion('type', [
  z
    .object({
      questionId: z.uuid(),
      type: z.literal('SCALE'),
      value: z.number().int().min(1).max(5),
    })
    .strict(),
  z
    .object({
      questionId: z.uuid(),
      type: z.enum(['YES_NO_MAYBE', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
      options: z.array(z.uuid()).min(1).max(12),
    })
    .strict(),
]);
export const saveAnswersSchema = z
  .object({
    versionId: z.uuid(),
    revision: z.number().int().min(0),
    responses: z.array(responseSchema).max(100),
  })
  .strict();
export type Answer = z.infer<typeof responseSchema>;
export function validateAnswers(
  quiz: QuizDocument,
  responses: Answer[],
  complete: boolean,
) {
  if (!z.array(responseSchema).max(100).safeParse(responses).success)
    throw new Error('INVALID_ANSWERS');
  const seen = new Set<string>();
  for (const response of responses) {
    const question = quiz.questions.find((q) => q.id === response.questionId);
    if (
      !question ||
      seen.has(response.questionId) ||
      question.type !== response.type
    )
      throw new Error('INVALID_ANSWERS');
    seen.add(question.id);
    if (response.type !== 'SCALE') {
      if (
        new Set(response.options).size !== response.options.length ||
        response.options.some(
          (id) => !question.options.some((o) => o.id === id),
        )
      )
        throw new Error('INVALID_ANSWERS');
      const min = question.type === 'MULTIPLE_CHOICE' ? question.min : 1;
      const max = question.type === 'MULTIPLE_CHOICE' ? question.max : 1;
      if (response.options.length < min || response.options.length > max)
        throw new Error('INVALID_ANSWERS');
    }
  }
  if (complete && quiz.questions.some((q) => q.required && !seen.has(q.id)))
    throw new Error('REQUIRED_ANSWERS');
}
