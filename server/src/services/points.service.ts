import prisma from '../prisma';
import { createNotification } from './notifications.service';

export const DEFAULT_POINTS: Record<string, number> = {
  story: 1,
  other: 2,
  feed: 3,
  carousel: 4,
  linkedin: 4,
  reel: 5,
  shorts: 5,
  tiktok: 5,
  podcast: 3,
  live: 8,
};

export async function getPointsForFormat(format: string, groupId?: string): Promise<number> {
  if (groupId) {
    const rule = await prisma.groupScoringRule.findUnique({
      where: { groupId_format: { groupId, format } },
    });
    if (rule) return rule.points;
  }
  return DEFAULT_POINTS[format] ?? 3;
}

export async function addPointsToUser(userId: string, points: number, groupId?: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { totalPoints: { increment: points } },
  });

  if (groupId) {
    await prisma.groupMember.updateMany({
      where: { userId, groupId },
      data: {
        cyclePoints: { increment: points },
        totalPoints: { increment: points },
      },
    });
  }

  await updateLeague(userId);
}

const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'cosmos', 'nova', 'orbit'];
const LEAGUE_LABELS: Record<string, string> = {
  bronze: 'Bronze', silver: 'Prata', gold: 'Ouro',
  platinum: 'Platina', cosmos: 'Cosmos', nova: 'Nova', orbit: 'Orbit',
};

async function updateLeague(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totalPoints: true, league: true } });
  if (!user) return;

  const leagues = [
    { name: 'orbit', min: 5000 },
    { name: 'nova', min: 2000 },
    { name: 'cosmos', min: 1000 },
    { name: 'platinum', min: 500 },
    { name: 'gold', min: 200 },
    { name: 'silver', min: 75 },
    { name: 'bronze', min: 0 },
  ];

  const newLeague = leagues.find((l) => user.totalPoints >= l.min) ?? leagues[leagues.length - 1];

  await prisma.user.update({ where: { id: userId }, data: { league: newLeague.name } });

  const isUpgrade = LEAGUE_ORDER.indexOf(newLeague.name) > LEAGUE_ORDER.indexOf(user.league);
  if (isUpgrade) {
    await createNotification(
      userId,
      'rank_up',
      `🎉 Você subiu para ${LEAGUE_LABELS[newLeague.name]}!`,
      `Parabéns! Você alcançou a liga ${LEAGUE_LABELS[newLeague.name]}. Continue publicando para ir ainda mais longe!`,
      { league: newLeague.name },
    );
  }
}
