import { describe, it, expect } from 'vitest';
import {
  quizDocumentSchema,
  responseSchema,
  saveAnswersSchema,
  translationDeficiencies,
  validateAnswers,
  type Answer,
} from '../../src/lib/validation/quiz';
import { seedDocuments } from '../../src/features/quizzes/seeds';
import {
  exactMatch,
  scaleSimilarity,
  jaccard,
  weightedMean,
  soloResult,
} from '../../src/lib/scoring';
import { imageSignature } from '../../src/lib/validation/media';
const quiz = seedDocuments()[0]!.document;
const answers: Answer[] = quiz.questions.map((q) =>
  q.type === 'SCALE'
    ? { questionId: q.id, type: 'SCALE', value: 4 }
    : { questionId: q.id, type: q.type, options: [q.options[0]!.id] },
);
describe('stage 2 trust boundaries', () => {
  it('has eight complete original localized datasets and all supported kinds', () => {
    const seeds = seedDocuments();
    expect(seeds).toHaveLength(8);
    for (const seed of seeds) {
      expect(translationDeficiencies(seed.document)).toEqual([]);
      expect(quizDocumentSchema.safeParse(seed.document).success).toBe(true);
      expect(seed.document.questions.map((q) => q.type)).toEqual([
        'YES_NO_MAYBE',
        'SINGLE_CHOICE',
        'MULTIPLE_CHOICE',
        'SCALE',
      ]);
    }
    expect(seeds.filter((s) => s.document.adultOnly)).toHaveLength(1);
  });
  it('reports every missing translation and rejects invalid bounds/duplicate stable IDs', () => {
    const bad = structuredClone(quiz);
    bad.title.fr = ' ';
    bad.questions[0]!.prompt.uk = '';
    bad.questions[1]!.options[0]!.label.en = '';
    expect(translationDeficiencies(bad)).toEqual(
      expect.arrayContaining([
        'title.fr',
        'questions.0.prompt.uk',
        'questions.1.options.0.en',
      ]),
    );
    bad.questions[1]!.stableId = bad.questions[0]!.stableId;
    expect(quizDocumentSchema.safeParse(bad).success).toBe(false);
    const multi = structuredClone(quiz);
    const q = multi.questions[2]!;
    if (q.type === 'MULTIPLE_CHOICE') q.max = 4;
    expect(quizDocumentSchema.safeParse(multi).success).toBe(false);
  });
  it('rejects free text, unknown fields, noninteger/out-of-range scales and oversize answers', () => {
    expect(
      responseSchema.safeParse({
        questionId: quiz.questions[3]!.id,
        type: 'TEXT',
        value: 'private',
      }).success,
    ).toBe(false);
    for (const value of [0, 6, 2.5])
      expect(
        responseSchema.safeParse({
          questionId: quiz.questions[3]!.id,
          type: 'SCALE',
          value,
        }).success,
      ).toBe(false);
    expect(
      saveAnswersSchema.safeParse({
        versionId: quiz.questions[0]!.id,
        revision: 0,
        responses: Array.from({ length: 101 }, () => answers[0]),
      }).success,
    ).toBe(false);
    expect(
      saveAnswersSchema.safeParse({
        versionId: quiz.questions[0]!.id,
        revision: 0,
        responses: [],
        userId: 'injected',
      }).success,
    ).toBe(false);
  });
  it('accepts partial saves but requires all required answers on submit', () => {
    expect(() => validateAnswers(quiz, [], false)).not.toThrow();
    expect(() => validateAnswers(quiz, [], true)).toThrow('REQUIRED');
    expect(() => validateAnswers(quiz, answers, true)).not.toThrow();
  });
  it('rejects duplicate/unknown questions, wrong kind, unknown/duplicate options and selection bounds', () => {
    expect(() =>
      validateAnswers(quiz, [answers[0]!, answers[0]!], false),
    ).toThrow();
    expect(() =>
      validateAnswers(
        quiz,
        [{ ...answers[0]!, questionId: crypto.randomUUID() }],
        false,
      ),
    ).toThrow();
    expect(() =>
      validateAnswers(
        quiz,
        [{ questionId: quiz.questions[0]!.id, type: 'SCALE', value: 3 }],
        false,
      ),
    ).toThrow();
    const q = quiz.questions[1]!;
    for (const options of [
      [crypto.randomUUID()],
      [q.options[0]!.id, q.options[0]!.id],
      q.options.map((o) => o.id),
    ])
      expect(() =>
        validateAnswers(
          quiz,
          [{ questionId: q.id, type: 'SINGLE_CHOICE', options }],
          false,
        ),
      ).toThrow();
    const multi = quiz.questions[2]!;
    expect(() =>
      validateAnswers(
        quiz,
        [
          {
            questionId: multi.id,
            type: 'MULTIPLE_CHOICE',
            options: multi.options.map((o) => o.id),
          },
        ],
        false,
      ),
    ).toThrow();
  });
  it('checks image signatures and limits without trusting MIME alone', () => {
    expect(
      imageSignature(
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        'image/png',
      ),
    ).toBe(true);
    expect(imageSignature(Buffer.from('not a png'), 'image/png')).toBe(false);
    expect(imageSignature(Buffer.from('<svg/>'), 'image/svg+xml')).toBe(false);
    expect(
      imageSignature(new Uint8Array(5 * 1024 * 1024 + 1), 'image/png'),
    ).toBe(false);
  });
});
describe('deterministic scoring foundations', () => {
  it('categorical exact match is symmetric and bounded', () => {
    expect(exactMatch('a', 'a')).toBe(1);
    expect(exactMatch('a', 'b')).toBe(0);
  });
  it('scale similarity is linear, symmetric and rejects invalid inputs', () => {
    expect(scaleSimilarity(1, 5)).toBe(0);
    expect(scaleSimilarity(4, 4)).toBe(1);
    expect(scaleSimilarity(2, 3)).toBe(0.75);
    expect(scaleSimilarity(3, 2)).toBe(0.75);
    expect(() => scaleSimilarity(0, 5)).toThrow();
  });
  it('Jaccard uses sets with a documented empty-set convention', () => {
    expect(jaccard([], [])).toBe(1);
    expect(jaccard(['a'], [])).toBe(0);
    expect(jaccard(['a', 'b', 'a'], ['b', 'c'])).toBeCloseTo(1 / 3);
  });
  it('normalizes weighted aggregation and rejects invalid numbers', () => {
    expect(
      weightedMean([
        { score: 1, weight: 3 },
        { score: 0, weight: 1 },
      ]),
    ).toBe(0.75);
    expect(weightedMean([])).toBe(0);
    expect(weightedMean([{ score: 1, weight: 0 }])).toBe(0);
    expect(() => weightedMean([{ score: NaN, weight: 1 }])).toThrow();
    expect(() => weightedMean([{ score: 1, weight: -1 }])).toThrow();
  });
  it('solo profiles derive actual distributions and observations without a compatibility score', () => {
    const result = soloResult(quiz, answers);
    expect(result.categories[0]?.scaleMean).toBe(4);
    expect(result.observation).toBe('high');
    expect(Object.values(result.distribution).reduce((a, b) => a + b, 0)).toBe(
      3,
    );
    expect(result).not.toHaveProperty('compatibility');
    expect(soloResult(quiz, answers)).toEqual(result);
    const low = answers.map((a) =>
      a.type === 'SCALE' ? { ...a, value: 1 } : a,
    );
    expect(soloResult(quiz, low).observation).toBe('low');
    const middle = answers.map((a) =>
      a.type === 'SCALE' ? { ...a, value: 3 } : a,
    );
    expect(soloResult(quiz, middle).observation).toBe('balanced');
  });
});
