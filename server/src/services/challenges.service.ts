import prisma from '../prisma';
import { ConflictError, NotFoundError } from '../utils/errors';
import type { CreateChallengeInput } from '../schemas/challenges.schema';

export async function createChallenge(userId: string, input: CreateChallengeInput) {
  return prisma.challenge.create({
    data: {
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      type: input.type,
      targetCount: input.targetCount,
      targetDays: input.targetDays,
      format: input.format,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      participants: {
        create: { userId },
      },
    },
    include: { participants: true },
  });
}

export async function joinChallenge(userId: string, challengeId: string) {
  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
  if (!challenge) throw new NotFoundError('Desafio');

  const existing = await prisma.challengeParticipant.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (existing) throw new ConflictError('Você já está participando deste desafio');

  return prisma.challengeParticipant.create({ data: { challengeId, userId } });
}

export async function getUserChallenges(userId: string) {
  const participants = await prisma.challengeParticipant.findMany({
    where: { userId },
    include: {
      challenge: {
        include: { _count: { select: { participants: true } } },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return participants.map((p) => ({
    ...p.challenge,
    participantCount: p.challenge._count.participants,
    myProgress: p.progress,
    myCompleted: p.completed,
    progressPercent: Math.min(100, Math.round((p.progress / p.challenge.targetCount) * 100)),
    daysLeft: Math.max(0, Math.ceil((new Date(p.challenge.endDate).getTime() - Date.now()) / 86400000)),
  }));
}

export async function getChallengeDetails(challengeId: string, userId?: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
        },
        orderBy: { progress: 'desc' },
      },
    },
  });

  if (!challenge) throw new NotFoundError('Desafio');

  const myParticipation = userId
    ? challenge.participants.find((p) => p.userId === userId)
    : null;

  return {
    ...challenge,
    myProgress: myParticipation?.progress ?? 0,
    myCompleted: myParticipation?.completed ?? false,
    progressPercent: myParticipation
      ? Math.min(100, Math.round((myParticipation.progress / challenge.targetCount) * 100))
      : 0,
  };
}

export async function getGroupChallenges(groupId: string, userId?: string) {
  const challenges = await prisma.challenge.findMany({
    where: { groupId, isActive: true },
    include: {
      _count: { select: { participants: true } },
      ...(userId
        ? {
            participants: {
              where: { userId },
              select: { progress: true, completed: true },
            },
          }
        : {}),
    },
    orderBy: { startDate: 'desc' },
  });

  return challenges.map((c) => ({
    ...c,
    participantCount: c._count.participants,
    myProgress: (c as { participants?: { progress: number }[] }).participants?.[0]?.progress ?? 0,
    myCompleted: (c as { participants?: { completed: boolean }[] }).participants?.[0]?.completed ?? false,
    daysLeft: Math.max(0, Math.ceil((new Date(c.endDate).getTime() - Date.now()) / 86400000)),
  }));
}
