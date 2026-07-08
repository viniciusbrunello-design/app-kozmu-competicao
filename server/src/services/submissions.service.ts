import prisma from '../prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { getPointsForFormat, addPointsToUser } from './points.service';
import { processCheckIn } from './streak.service';
import { createActivity } from './activity.service';
import { createNotification } from './notifications.service';
import { ensureGroupCycleCurrent } from './groups.service';
import type { CreateSubmissionInput } from '../schemas/submissions.schema';

export async function createSubmission(userId: string, input: CreateSubmissionInput) {
  // Normalise URL: strip trailing slashes and query strings for comparison
  const normalizedUrl = normalizeUrl(input.url);

  // Reject duplicate URLs — same post cannot be registered twice by the same user.
  // Rejected submissions are excluded: user may fix a wrong URL and resubmit.
  const duplicate = await prisma.submission.findFirst({
    where: {
      userId,
      status: { not: 'rejected' },
      url: { in: [input.url, normalizedUrl] },
    },
  });
  if (duplicate) {
    throw new ConflictError('Você já registrou esta publicação anteriormente.');
  }

  const points = await getPointsForFormat(input.format, input.groupId);

  if (input.groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: input.groupId } },
      include: { group: { select: { isActive: true } } },
    });
    if (!member) throw new ForbiddenError('Você não é membro deste grupo');
    if (!member.group.isActive) throw new ForbiddenError('Este grupo foi encerrado');

    // Se o ciclo expirou, processa a virada antes de pontuar,
    // para que a publicação conte no ciclo novo e não no antigo.
    await ensureGroupCycleCurrent(input.groupId);
  }

  const submission = await prisma.submission.create({
    data: {
      userId,
      groupId: input.groupId,
      url: input.url,
      format: input.format,
      platform: input.platform,
      screenshotUrl: input.screenshotUrl,
      points,
      status: 'pending',
    },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
    },
  });

  await createActivity(
    userId,
    'post_submitted',
    { format: input.format, platform: input.platform, url: input.url, points, submissionId: submission.id },
    input.groupId,
  );

  // Auto-validate for MVP (no manual review required by default)
  const { newRecord } = await validateSubmission(submission.id, userId, 'auto');

  return { ...submission, newRecord };
}

export async function validateSubmission(
  submissionId: string,
  validatorId: string,
  validatorType: 'auto' | 'moderator' = 'moderator',
) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new NotFoundError('Submissão');

  if (submission.status !== 'pending') return { submission, newRecord: false };

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      status: 'validated',
      validatedAt: new Date(),
      validatedBy: validatorType === 'auto' ? 'auto' : validatorId,
    },
  });

  // Award points
  await addPointsToUser(submission.userId, submission.points, submission.groupId ?? undefined);

  // Process streak
  const streakResult = await processCheckIn(submission.userId);

  // Update challenge progress
  await updateChallengeProgress(submission.userId, submission.format, submission.groupId ?? undefined);

  // Create activity
  await createActivity(
    submission.userId,
    'post_validated',
    {
      format: submission.format,
      platform: submission.platform,
      url: submission.url,
      points: submission.points,
      streakExtended: streakResult.extended,
      currentStreak: streakResult.currentStreak,
    },
    submission.groupId ?? undefined,
  );

  if (streakResult.extended && streakResult.currentStreak > 0) {
    await createActivity(
      submission.userId,
      'streak_extended',
      { currentStreak: streakResult.currentStreak },
      submission.groupId ?? undefined,
    );

    if ([3, 7, 14, 30].includes(streakResult.currentStreak)) {
      await createNotification(
        submission.userId,
        'streak_milestone',
        `🔥 ${streakResult.currentStreak} dias de streak!`,
        `Você atingiu ${streakResult.currentStreak} dias consecutivos publicando. Continue assim!`,
        { streak: streakResult.currentStreak },
      );
    }

    if (streakResult.newRecord && streakResult.currentStreak > 1) {
      await createNotification(
        submission.userId,
        'streak_record',
        `🏆 Novo recorde pessoal!`,
        `${streakResult.currentStreak} dias consecutivos — você superou seu melhor registro!`,
        { streak: streakResult.currentStreak },
      );
    }
  }

  await createNotification(
    submission.userId,
    'proof_validated',
    'Prova validada! ✅',
    `Sua publicação de ${submission.format} foi validada. +${submission.points} pontos!`,
    { points: submission.points, format: submission.format },
  );

  return { submission, newRecord: streakResult.newRecord };
}

export async function rejectSubmission(
  submissionId: string,
  moderatorId: string,
  reason: string,
) {
  const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
  if (!submission) throw new NotFoundError('Submissão');

  if (submission.status !== 'pending') throw new ForbiddenError('Submissão já processada');

  await prisma.submission.update({
    where: { id: submissionId },
    data: { status: 'rejected', validatedBy: moderatorId, rejectionReason: reason },
  });

  await createNotification(
    submission.userId,
    'proof_rejected',
    'Prova rejeitada ❌',
    `Sua publicação foi rejeitada. Motivo: ${reason}`,
    { reason, format: submission.format },
  );
}

export async function getUserSubmissions(userId: string, status?: string) {
  return prisma.submission.findMany({
    where: { userId, ...(status ? { status } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

async function updateChallengeProgress(userId: string, format: string, groupId?: string) {
  const participants = await prisma.challengeParticipant.findMany({
    where: {
      userId,
      completed: false,
      challenge: {
        isActive: true,
        endDate: { gte: new Date() },
        OR: [
          { groupId: groupId ?? undefined },
          { groupId: null },
        ],
      },
    },
    include: { challenge: true },
  });

  for (const participant of participants) {
    const matches =
      !participant.challenge.format || participant.challenge.format === format;

    if (!matches) continue;

    const newProgress = participant.progress + 1;
    const completed = newProgress >= participant.challenge.targetCount;

    await prisma.challengeParticipant.update({
      where: { id: participant.id },
      data: { progress: newProgress, completed },
    });

    if (completed) {
      await createActivity(
        userId,
        'challenge_completed',
        { challengeTitle: participant.challenge.title },
        groupId,
      );
      await createNotification(
        userId,
        'badge_earned',
        '🏆 Desafio concluído!',
        `Você completou o desafio "${participant.challenge.title}"!`,
        { challengeId: participant.challengeId },
      );
    }
  }
}

/**
 * Strips query strings and trailing slashes so that
 * instagram.com/p/ABC123/ and instagram.com/p/ABC123?igsh=xyz
 * are treated as the same post.
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url.trim().replace(/\/$/, '');
  }
}
