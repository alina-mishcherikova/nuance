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
export type AggregateResult = z.infer<typeof aggregateResultSchema>;
