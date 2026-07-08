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

async function buildRanking(since: Date, groupId?: string, rankingMode = 'points') {
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
    { user: (typeof submissions)[0]['user']; points: number; count: number; formatCounts: Record<string, number> }
  >();

  for (const s of submissions) {
    const existing = map.get(s.userId) ?? { user: s.user, points: 0, count: 0, formatCounts: {} };
    existing.points += s.points;
    existing.count += 1;
    existing.formatCounts[s.format] = (existing.formatCounts[s.format] ?? 0) + 1;
    map.set(s.userId, existing);
  }

  const targetFormat = rankingMode.startsWith('format:') ? rankingMode.split(':')[1] : null;

  const sorted = Array.from(map.values()).sort((a, b) => {
    if (rankingMode === 'count') return b.count - a.count || b.points - a.points;
    if (targetFormat) {
      const af = a.formatCounts[targetFormat] ?? 0;
      const bf = b.formatCounts[targetFormat] ?? 0;
      return bf - af || b.points - a.points;
    }
    return b.points - a.points || (b.user.streak?.currentStreak ?? 0) - (a.user.streak?.currentStreak ?? 0);
  });

  return sorted.map((entry, index) => ({
    rank: index + 1,
    userId: entry.user.id,
    displayName: entry.user.displayName,
    username: entry.user.username,
    avatarUrl: entry.user.avatarUrl,
    league: entry.user.league,
    points: entry.points,
    submissionCount: entry.count,
    currentStreak: entry.user.streak?.currentStreak ?? 0,
    ...(targetFormat ? { formatCount: entry.formatCounts[targetFormat] ?? 0 } : {}),
  }));
}

export async function getWeeklyRanking(groupId?: string, mode?: string) {
  let rankingMode = mode ?? 'points';
  if (groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { rankingMode: true } });
    rankingMode = group?.rankingMode ?? 'points';
  }
  return buildRanking(getWeekStart(), groupId, rankingMode);
}

export async function getMonthlyRanking(groupId?: string, mode?: string) {
  let rankingMode = mode ?? 'points';
  if (groupId) {
    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { rankingMode: true } });
    rankingMode = group?.rankingMode ?? 'points';
  }
  return buildRanking(getMonthStart(), groupId, rankingMode);
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
