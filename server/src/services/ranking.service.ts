import prisma from '../prisma';

function getWeekStart(): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getMonthStart(): Date {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function buildRanking(since: Date, groupId?: string) {
  const where: Record<string, unknown> = {
    status: 'validated',
    createdAt: { gte: since },
  };
  if (groupId) where.groupId = groupId;

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
          avatarUrl: true,
          league: true,
          streak: { select: { currentStreak: true } },
        },
      },
    },
  });

  const map = new Map<
    string,
    { user: (typeof submissions)[0]['user']; points: number; count: number }
  >();

  for (const s of submissions) {
    const existing = map.get(s.userId) ?? { user: s.user, points: 0, count: 0 };
    existing.points += s.points;
    existing.count += 1;
    map.set(s.userId, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.points - a.points || (b.user.streak?.currentStreak ?? 0) - (a.user.streak?.currentStreak ?? 0))
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.user.id,
      displayName: entry.user.displayName,
      username: entry.user.username,
      avatarUrl: entry.user.avatarUrl,
      league: entry.user.league,
      points: entry.points,
      submissionCount: entry.count,
      currentStreak: entry.user.streak?.currentStreak ?? 0,
    }));
}

export async function getWeeklyRanking(groupId?: string) {
  return buildRanking(getWeekStart(), groupId);
}

export async function getMonthlyRanking(groupId?: string) {
  return buildRanking(getMonthStart(), groupId);
}

export async function getStreakRanking() {
  const streaks = await prisma.streak.findMany({
    where: { currentStreak: { gt: 0 } },
    orderBy: [{ currentStreak: 'desc' }, { bestStreak: 'desc' }],
    take: 50,
    include: {
      user: {
        select: { id: true, displayName: true, username: true, avatarUrl: true, league: true },
      },
    },
  });

  return streaks.map((s, index) => ({
    rank: index + 1,
    userId: s.user.id,
    displayName: s.user.displayName,
    username: s.user.username,
    avatarUrl: s.user.avatarUrl,
    league: s.user.league,
    currentStreak: s.currentStreak,
    bestStreak: s.bestStreak,
  }));
}

export async function getUserRank(
  userId: string,
  period: 'weekly' | 'monthly' = 'weekly',
  groupId?: string,
) {
  const ranking = period === 'weekly'
    ? await getWeeklyRanking(groupId)
    : await getMonthlyRanking(groupId);

  const entry = ranking.find((r) => r.userId === userId);
  return entry ? { rank: entry.rank, total: ranking.length, points: entry.points } : null;
}
