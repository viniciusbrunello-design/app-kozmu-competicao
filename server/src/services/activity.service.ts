import prisma from '../prisma';

export type ActivityType =
  | 'post_submitted'
  | 'post_validated'
  | 'streak_extended'
  | 'streak_milestone'
  | 'streak_broken'
  | 'rank_up'
  | 'goal_completed'
  | 'badge_earned'
  | 'challenge_completed'
  | 'group_joined'
  | 'cycle_reset';

export async function createActivity(
  userId: string,
  type: ActivityType,
  data: Record<string, unknown>,
  groupId?: string,
): Promise<void> {
  await prisma.activity.create({
    data: {
      userId,
      groupId,
      type,
      data: JSON.stringify(data),
    },
  });
}

export async function getGroupActivity(
  groupId: string,
  limit = 20,
  offset = 0,
): Promise<unknown[]> {
  const activities = await prisma.activity.findMany({
    where: { groupId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      user: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
    },
  });

  return activities.map((a) => ({
    ...a,
    data: JSON.parse(a.data),
  }));
}

export async function getUserFeed(userId: string, limit = 30): Promise<unknown[]> {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    select: { groupId: true },
  });
  const groupIds = memberships.map((m) => m.groupId);

  const activities = await prisma.activity.findMany({
    where: {
      OR: [{ userId }, { groupId: { in: groupIds } }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
    },
  });

  return activities.map((a) => ({
    ...a,
    data: JSON.parse(a.data),
  }));
}
