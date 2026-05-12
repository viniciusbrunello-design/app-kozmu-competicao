import prisma from '../prisma';
import { NotFoundError } from '../utils/errors';
import { getStreakStatus } from './streak.service';

function computeAchievements(data: {
  submissionCount: number;
  bestStreak: number;
  winCount: number;
  challengeCount: number;
  hasGroups: boolean;
}) {
  return [
    { id: 'first_post', unlocked: data.submissionCount >= 1 },
    { id: 'streak_7',   unlocked: data.bestStreak >= 7 },
    { id: 'streak_14',  unlocked: data.bestStreak >= 14 },
    { id: 'streak_30',  unlocked: data.bestStreak >= 30 },
    { id: 'posts_50',   unlocked: data.submissionCount >= 50 },
    { id: 'champion',   unlocked: data.winCount >= 1 },
    { id: 'challenger', unlocked: data.challengeCount >= 1 },
    { id: 'social',     unlocked: data.hasGroups },
  ];
}

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

  const groupCount = await prisma.groupMember.count({ where: { userId } });

  const achievements = computeAchievements({
    submissionCount,
    bestStreak: streak.bestStreak,
    winCount: user.winCount,
    challengeCount,
    hasGroups: groupCount > 0,
  });

  return {
    ...user,
    platforms: JSON.parse(user.platforms),
    streak,
    stats: { submissionCount, challengeCount },
    achievements,
  };
}

export async function updateUserProfile(
  userId: string,
  data: { displayName?: string; username?: string; bio?: string; profileType?: string; platforms?: string[] },
) {
  if (data.username) {
    const existing = await prisma.user.findUnique({ where: { username: data.username } });
    if (existing && existing.id !== userId) {
      throw new Error('Este username já está em uso.');
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.displayName && { displayName: data.displayName }),
      ...(data.username && { username: data.username }),
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

export async function updateWeeklyTarget(userId: string, weeklyTarget: number): Promise<void> {
  await prisma.streak.upsert({
    where: { userId },
    update: { weeklyTarget },
    create: { userId, weeklyTarget, weekStart: new Date() },
  });
}

export async function getFormatStats(userId: string): Promise<{ format: string; count: number }[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.submission.groupBy({
    by: ['format'],
    where: { userId, status: 'validated', createdAt: { gte: since } },
    _count: { format: true },
    orderBy: { _count: { format: 'desc' } },
  });
  return grouped.map((g) => ({ format: g.format, count: g._count.format }));
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

  const submissionCount = await prisma.submission.count({
    where: { userId: user.id, status: 'validated' },
  });

  const heatmap = await getUserHeatmap(user.id);
  const activeDays = heatmap.filter((d) => d.count > 0).length;

  const groupCount = await prisma.groupMember.count({ where: { userId: user.id } });
  const challengeCount = await prisma.challengeParticipant.count({
    where: { userId: user.id, completed: true },
  });

  const achievements = computeAchievements({
    submissionCount,
    bestStreak: streak.bestStreak,
    winCount: user.winCount,
    challengeCount,
    hasGroups: groupCount > 0,
  });

  return { ...user, streak, submissionCount, activeDays, achievements };
}
