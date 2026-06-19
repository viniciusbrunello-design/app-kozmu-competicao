import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(3, 'Nome deve ter no mínimo 3 caracteres').max(60),
  description: z.string().max(300).optional(),
  type: z.enum(['private', 'public', 'mastermind', 'corporate', 'thematic']).default('private'),
  cycleDuration: z.enum(['weekly', 'biweekly', 'monthly', 'custom', 'none']).default('weekly'),
  customCycleDays: z.number().int().min(1).max(365).optional(),
  maxMembers: z.number().int().min(2).max(100).default(20),
  scoringRules: z
    .array(z.object({ format: z.string(), points: z.number().int().min(1) }))
    .optional(),
});

export const joinGroupSchema = z.object({
  inviteCode: z.string().min(1, 'Código de convite obrigatório'),
});

export const updateGroupSchema = z.object({
  name: z.string().min(3).max(60).optional(),
  description: z.string().max(300).optional(),
  maxMembers: z.number().int().min(2).max(100).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type JoinGroupInput = z.infer<typeof joinGroupSchema>;
