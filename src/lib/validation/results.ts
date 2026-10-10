import { z } from 'zod';
export const scoringConfigSchema = z
  .object({
    schemaVersion: z.literal(1),
    algorithm: z.enum(['none', 'agreement-v1']),
    weights: z
      .array(
        z.object({ questionId: z.uuid(), weight: z.number().min(0).max(10) }),
      )
      .max(100),
  })
  .strict();
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;
export const aggregateResultSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.enum(['solo', 'group']),
    highlights: z
      .array(
        z.object({
          label: z.string().max(160),
          value: z.number().min(0).max(100),
        }),
      )
      .max(20),
  })
  .strict();
export const soloResultSchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal('solo'),
    categories: z
      .array(
        z
          .object({
            category: z.string().max(60),
            answered: z.number().int().min(0).max(100),
            scaleMean: z.number().min(1).max(5).nullable(),
          })
          .strict(),
      )
      .max(100),
    distribution: z.record(z.uuid(), z.number().int().min(0).max(100)),
    observation: z.enum(['high', 'low', 'balanced', 'choices']),
  })
  .strict();
export const resultPayloadSchema = z.union([
  aggregateResultSchema,
  soloResultSchema,
]);
export type AggregateResult = z.infer<typeof resultPayloadSchema>;
