import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  username: z
    .string()
    .min(3, 'Username deve ter no mínimo 3 caracteres')
    .max(30, 'Username deve ter no máximo 30 caracteres')
    .regex(/^[a-z0-9_]+$/, 'Username só pode ter letras minúsculas, números e _'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  displayName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(60),
  profileType: z.enum(['creator', 'social_media', 'agency', 'specialist']).default('creator'),
  platforms: z.array(z.string()).default([]),
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token obrigatório'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
