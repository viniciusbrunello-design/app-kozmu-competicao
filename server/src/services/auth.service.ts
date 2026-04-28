import prisma from '../prisma';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { ensureStreak } from './streak.service';
import type { RegisterInput, LoginInput } from '../schemas/auth.schema';

export async function register(input: RegisterInput) {
  const exists = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { username: input.username }] },
  });

  if (exists) {
    if (exists.email === input.email) throw new ConflictError('Este email já está em uso');
    throw new ConflictError('Este username já está em uso');
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      username: input.username,
      passwordHash,
      displayName: input.displayName,
      profileType: input.profileType,
      platforms: JSON.stringify(input.platforms),
    },
  });

  await ensureStreak(user.id);

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.passwordHash) throw new UnauthorizedError('Credenciais inválidas');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw new UnauthorizedError('Credenciais inválidas');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken } });

  return { user: sanitizeUser(user), accessToken, refreshToken };
}

export async function refresh(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new UnauthorizedError('Refresh token inválido');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.refreshToken !== token) throw new UnauthorizedError('Refresh token revogado');

  const accessToken = signAccessToken({ userId: user.id, email: user.email });
  const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email });

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: newRefreshToken } });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { refreshToken: null } });
}

function sanitizeUser(user: { id: string; email: string; username: string; displayName: string; profileType: string; avatarUrl: string | null; platforms: string; totalPoints: number; league: string; winCount: number; isPro: boolean; createdAt: Date }) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    profileType: user.profileType,
    avatarUrl: user.avatarUrl,
    platforms: JSON.parse(user.platforms),
    totalPoints: user.totalPoints,
    league: user.league,
    winCount: user.winCount,
    isPro: user.isPro,
    createdAt: user.createdAt,
  };
}
