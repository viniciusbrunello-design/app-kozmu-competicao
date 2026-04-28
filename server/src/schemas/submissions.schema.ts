import { z } from 'zod';

export const createSubmissionSchema = z.object({
  url: z.string().url('URL inválida'),
  format: z.enum(['reel', 'carousel', 'feed', 'story', 'live', 'linkedin', 'shorts', 'tiktok']),
  groupId: z.string().optional(),
  platform: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
});

export const validateSubmissionSchema = z.object({
  action: z.enum(['validate', 'reject']),
  rejectionReason: z.string().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
