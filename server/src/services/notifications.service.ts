import prisma from '../prisma';

export type NotificationType =
  | 'streak_at_risk'
  | 'streak_broken'
  | 'streak_milestone'
  | 'rank_up'
  | 'rank_drop'
  | 'rival_overtook'
  | 'goal_almost_complete'
  | 'weekly_goal_completed'
  | 'new_cycle'
  | 'badge_earned'
  | 'proof_validated'
  | 'proof_rejected'
  | 'group_invite'
  | 'nudge'
  | 'streak_record';

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  await prisma.notification.create({
    data: { userId, type, title, body, data: JSON.stringify(data) },
  });
}

export async function getUserNotifications(userId: string, unreadOnly = false) {
  const notifications = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return notifications.map((n) => ({
    ...n,
    data: JSON.parse(n.data),
  }));
}

export async function markNotificationRead(notificationId: string, userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}
