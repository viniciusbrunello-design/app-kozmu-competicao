import prisma from '../prisma';
import { NotFoundError } from '../utils/errors';
import { getStreakStatus } from './streak.service';

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      profileType: true,
      avatarUrl: true,
      platforms: true,
      totalPoints: true,
      league: true,
      winCount: true,
      isPro: true,
      createdAt: true,
    },
  });

  if (!user) throw new NotFoundError('Usuário');

  const streak = await getStreakStatus(userId);

  const submissionCount = await prisma.submission.count({
    where: { userId, status: 'validated' },
  });

  const challengeCount = await prisma.challengeParticipant.count({
    where: { userId, completed: true },
  });

  return {
    ...user,
    platforms: JSON.parse(user.platforms),
    streak,
    stats: { submissionCount, challengeCount },
  };
}

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string; bio?: string; profileType?: string; platforms?: string[] },
) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.bio !== undefined && { bio: data.bio }),
      ...(data.profileType && { profileType: data.profileType }),
      ...(data.platforms && { platforms: JSON.stringify(data.platforms) }),
    },
    select: {
      id: true,
      email: true,
      username: true,
      displayName: true,
      bio: true,
      profileType: true,
      avatarUrl: true,
      platforms: true,
      totalPoints: true,
      league: true,
      winCount: true,
      isPro: true,
    },
  });

  return { ...updated, platforms: JSON.parse(updated.platforms) };
}

export async function getUserHeatmap(userId: string): Promise<{ date: string; count: number }[]> {
  const TZ = 'America/Sao_Paulo';
  const days = 84;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const submissions = await prisma.submission.findMany({
    where: { userId, status: { not: 'rejected' }, createdAt: { gte: cutoff } },
    select: { createdAt: true },
  });

  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: TZ });
  const countByDate = new Map<string, number>();
  for (const s of submissions) {
    const d = fmt.format(new Date(s.createdAt));
    countByDate.set(d, (countByDate.get(d) ?? 0) + 1);
  }

  const result: { date: string; count: number }[] = [];
  const seen = new Set<string>();
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = fmt.format(new Date(Date.now() - i * 24 * 60 * 60 * 1000));
    if (!seen.has(dateStr)) {
      seen.add(dateStr);
      result.push({ date: dateStr, count: countByDate.get(dateStr) ?? 0 });
    }
  }
  return result;
}

export async function getPublicProfile(username: string) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      profileType: true,
      avatarUrl: true,
      totalPoints: true,
      league: true,
      winCount: true,
      createdAt: true,
    },
  });

  if (!user) throw new NotFoundError('Usuário');

  const streak = await getStreakStatus(user.id);
  return { ...user, streak };
}
