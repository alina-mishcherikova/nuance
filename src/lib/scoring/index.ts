import type { Answer, QuizDocument } from '../validation/quiz';
export const ALGORITHM_VERSION = 'agreement-v1';
export function exactMatch(a: string, b: string) {
  return a === b ? 1 : 0;
}
export function scaleSimilarity(a: number, b: number) {
  if (![a, b].every((n) => Number.isInteger(n) && n >= 1 && n <= 5))
    throw new Error('Invalid scale');
  return 1 - Math.abs(a - b) / 4;
}
export function jaccard(a: readonly string[], b: readonly string[]) {
  const left = new Set(a),
    right = new Set(b);
  const union = new Set([...left, ...right]);
  return union.size
    ? [...left].filter((x) => right.has(x)).length / union.size
    : 1;
}
export function weightedMean(
  items: readonly { score: number; weight: number }[],
) {
  if (
    items.some(
      (i) =>
        !Number.isFinite(i.score) ||
        i.score < 0 ||
        i.score > 1 ||
        !Number.isFinite(i.weight) ||
        i.weight < 0,
    )
  )
    throw new Error('Invalid aggregation');
  const total = items.reduce((n, i) => n + i.weight, 0);
  return total ? items.reduce((n, i) => n + i.score * i.weight, 0) / total : 0;
}
export function soloResult(quiz: QuizDocument, responses: Answer[]) {
  const categories = [...new Set(quiz.questions.map((q) => q.category))].map(
    (category) => {
      const entries = responses.filter((a) =>
        quiz.questions.some(
          (q) => q.id === a.questionId && q.category === category,
        ),
      );
      const scales = entries.filter((a) => a.type === 'SCALE');
      return {
        category,
        answered: entries.length,
        scaleMean: scales.length
          ? scales.reduce((n, a) => n + a.value, 0) / scales.length
          : null,
      };
    },
  );
  const distribution: Record<string, number> = {};
  for (const response of responses) {
    if (response.type === 'SCALE') continue;
    for (const id of response.options) {
      distribution[id] = (distribution[id] ?? 0) + 1;
    }
  }
  const scaleValues = responses
    .filter((a) => a.type === 'SCALE')
    .map((a) => a.value);
  const observation = scaleValues.length
    ? scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length >= 4
      ? 'high'
      : scaleValues.reduce((a, b) => a + b, 0) / scaleValues.length <= 2
        ? 'low'
        : 'balanced'
    : 'choices';
  return {
    schemaVersion: 2 as const,
    kind: 'solo' as const,
    categories,
    distribution,
    observation,
  };
}
