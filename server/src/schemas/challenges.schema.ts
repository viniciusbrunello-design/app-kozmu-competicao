import { z } from 'zod';

export const createChallengeSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  type: z
    .enum(['consistency', 'volume', 'format_specific', 'multichannel', 'campaign', 'duel', 'squad_battle'])
    .default('consistency'),
  targetCount: z.number().int().min(1).default(5),
  targetDays: z.number().int().min(1).optional(),
  format: z.string().optional(),
  groupId: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
