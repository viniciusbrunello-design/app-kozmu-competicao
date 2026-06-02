import prisma from '../prisma';
import { NotFoundError, ForbiddenError } from '../utils/errors';

export async function getUserGoals(userId: string) {
  const goals = await prisma.userGoal.findMany({
    where: { userId },
    orderBy: { endDate: 'asc' },
  });

  const now = new Date();

  return Promise.all(
    goals.map(async (goal) => {
      const progress = await prisma.submission.count({
        where: {
          userId,
          status: 'validated',
          createdAt: { gte: goal.startDate, lte: goal.endDate },
          ...(goal.format ? { format: goal.format } : {}),
        },
      });
      const percentage = Math.min(100, Math.round((progress / goal.targetCount) * 100));
      const isActive = now <= new Date(goal.endDate) && !goal.completed;
      const completed = goal.completed || (percentage >= 100);
      return { ...goal, progress, percentage, isActive, completed };
    }),
  );
}

export async function createUserGoal(
  userId: string,
  data: { title: string; targetCount: number; format?: string; startDate: Date; endDate: Date },
) {
  return prisma.userGoal.create({ data: { userId, ...data } });
}

export async function deleteUserGoal(userId: string, goalId: string): Promise<void> {
  const goal = await prisma.userGoal.findUnique({ where: { id: goalId } });
  if (!goal) throw new NotFoundError('Meta');
  if (goal.userId !== userId) throw new ForbiddenError('Acesso negado');
  await prisma.userGoal.delete({ where: { id: goalId } });
}
