import prisma from '../prisma';
import { generateInviteCode } from '../utils/inviteCode';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { createActivity } from './activity.service';
import { createNotification } from './notifications.service';
import { DEFAULT_POINTS } from './points.service';
import type { CreateGroupInput, JoinGroupInput } from '../schemas/groups.schema';

function cycleEndDate(duration: string): Date {
  const now = new Date();
  switch (duration) {
    case 'biweekly':
      now.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    default:
      now.setDate(now.getDate() + 7);
  }
  return now;
}

export async function createGroup(userId: string, input: CreateGroupInput) {
  const inviteCode = generateInviteCode();

  const defaultRules = Object.entries(DEFAULT_POINTS).map(([format, points]) => ({
    format,
    points,
  }));

  const rules = input.scoringRules ?? defaultRules;

  const group = await prisma.group.create({
    data: {
      name: input.name,
      description: input.description,
      inviteCode,
      type: input.type,
      cycleDuration: input.cycleDuration,
      maxMembers: input.maxMembers,
      currentCycleEnd: cycleEndDate(input.cycleDuration),
      members: {
        create: { userId, role: 'admin' },
      },
      scoringRules: {
        create: rules,
      },
    },
    include: {
      members: { include: { user: { select: { id: true, displayName: true, username: true, avatarUrl: true } } } },
      scoringRules: true,
    },
  });

  await createActivity(userId, 'group_joined', { groupName: group.name }, group.id);

  return group;
}

export async function joinGroup(userId: string, input: JoinGroupInput) {
  const group = await prisma.group.findUnique({
    where: { inviteCode: input.inviteCode },
    include: { members: true },
  });

  if (!group) throw new NotFoundError('Grupo');

  const existing = group.members.find((m) => m.userId === userId);
  if (existing) throw new ConflictError('Você já é membro deste grupo');

  if (group.members.length >= group.maxMembers) throw new ConflictError('Grupo cheio');

  await prisma.groupMember.create({ data: { userId, groupId: group.id } });
  await createActivity(userId, 'group_joined', { groupName: group.name }, group.id);

  return getGroupDetails(group.id, userId);
}

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership) throw new NotFoundError('Membro');

  await prisma.groupMember.delete({ where: { userId_groupId: { userId, groupId } } });
}

export async function getUserGroups(userId: string) {
  const memberships = await prisma.groupMember.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
            },
          },
          _count: { select: { members: true } },
          scoringRules: true,
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return memberships.map((m) => ({
    ...m.group,
    myRole: m.role,
    myPoints: m.cyclePoints,
    memberCount: m.group._count.members,
    daysUntilReset: Math.max(
      0,
      Math.ceil((new Date(m.group.currentCycleEnd).getTime() - Date.now()) / 86400000),
    ),
  }));
}

export async function getGroupDetails(groupId: string, userId?: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true, league: true } },
        },
        orderBy: { cyclePoints: 'desc' },
      },
      scoringRules: true,
      _count: { select: { members: true } },
    },
  });

  if (!group) throw new NotFoundError('Grupo');

  const myMembership = userId ? group.members.find((m) => m.userId === userId) : null;

  return {
    ...group,
    myRole: myMembership?.role ?? null,
    myPoints: myMembership?.cyclePoints ?? 0,
    memberCount: group._count.members,
    daysUntilReset: Math.max(
      0,
      Math.ceil((new Date(group.currentCycleEnd).getTime() - Date.now()) / 86400000),
    ),
  };
}

export async function getPublicGroups(userId: string) {
  const groups = await prisma.group.findMany({
    where: { type: 'public', isActive: true },
    include: { _count: { select: { members: true } } },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const myMemberships = await prisma.groupMember.findMany({
    where: { userId, groupId: { in: groups.map((g) => g.id) } },
    select: { groupId: true },
  });
  const myGroupIds = new Set(myMemberships.map((m) => m.groupId));

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    type: g.type,
    cycleDuration: g.cycleDuration,
    maxMembers: g.maxMembers,
    memberCount: g._count.members,
    isMember: myGroupIds.has(g.id),
  }));
}

export async function joinPublicGroup(userId: string, groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) throw new NotFoundError('Grupo');
  if (group.type !== 'public') throw new ForbiddenError('Este grupo é privado');

  const existing = group.members.find((m) => m.userId === userId);
  if (existing) throw new ConflictError('Você já é membro deste grupo');

  if (group.members.length >= group.maxMembers) throw new ConflictError('Grupo cheio');

  await prisma.groupMember.create({ data: { userId, groupId: group.id } });
  await createActivity(userId, 'group_joined', { groupName: group.name }, group.id);

  return getGroupDetails(group.id, userId);
}

export async function generateInviteLink(groupId: string, userId: string): Promise<string> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || !['admin', 'moderator'].includes(membership.role)) {
    throw new ForbiddenError('Apenas admins podem gerar convites');
  }

  const group = await prisma.group.findUnique({ where: { id: groupId }, select: { inviteCode: true } });
  if (!group) throw new NotFoundError('Grupo');

  return group.inviteCode;
}

export async function nudgeMember(senderId: string, groupId: string, targetUserId: string): Promise<void> {
  if (senderId === targetUserId) throw new ForbiddenError('Não pode se cobrar');

  const [senderMember, targetMember] = await Promise.all([
    prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: senderId, groupId } },
      include: { user: { select: { displayName: true, username: true } } },
    }),
    prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    }),
  ]);

  if (!senderMember) throw new ForbiddenError('Você não é membro deste grupo');
  if (!targetMember) throw new NotFoundError('Membro');

  await createNotification(
    targetUserId,
    'nudge',
    `${senderMember.user.displayName} está te cobrando! 💪`,
    `@${senderMember.user.username} quer te ver publicar hoje. Vai lá!`,
    { senderId, groupId },
  );
}

export async function getCycleResult(groupId: string, userId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { cyclePoints: 'desc' },
        include: {
          user: { select: { id: true, displayName: true, username: true, avatarUrl: true, league: true } },
        },
      },
    },
  });
  if (!group) throw new NotFoundError('Grupo');

  const podium = group.members.slice(0, 3).map((m, i) => ({
    rank: i + 1,
    userId: m.userId,
    displayName: m.user.displayName,
    username: m.user.username,
    avatarUrl: m.user.avatarUrl,
    league: m.user.league,
    cyclePoints: m.cyclePoints,
  }));

  const myIndex = group.members.findIndex((m) => m.userId === userId);
  const myEntry = group.members[myIndex];

  return {
    groupId: group.id,
    groupName: group.name,
    cycleEnd: group.currentCycleEnd,
    isEnded: new Date(group.currentCycleEnd) < new Date(),
    podium,
    myRank: myIndex + 1,
    myPoints: myEntry?.cyclePoints ?? 0,
    totalMembers: group.members.length,
  };
}

export async function updateGroupSettings(
  groupId: string,
  userId: string,
  data: { rankingMode?: string; name?: string; description?: string },
): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== 'admin') throw new ForbiddenError('Apenas admins podem editar o grupo');

  await prisma.group.update({
    where: { id: groupId },
    data: {
      ...(data.rankingMode !== undefined && { rankingMode: data.rankingMode }),
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}

export async function updateScoringRules(
  groupId: string,
  userId: string,
  rules: { format: string; points: number }[],
): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== 'admin') throw new ForbiddenError('Apenas admins podem editar o grupo');

  await Promise.all(
    rules.map((r) =>
      prisma.groupScoringRule.upsert({
        where: { groupId_format: { groupId, format: r.format } },
        update: { points: r.points },
        create: { groupId, format: r.format, points: r.points },
      }),
    ),
  );
}

export async function resetGroupCycle(groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { cycleDuration: true, members: { select: { userId: true, cyclePoints: true } } },
  });
  if (!group) throw new NotFoundError('Grupo');

  const winner = group.members.sort((a, b) => b.cyclePoints - a.cyclePoints)[0];

  if (winner) {
    await prisma.user.update({ where: { id: winner.userId }, data: { winCount: { increment: 1 } } });
  }

  await prisma.groupMember.updateMany({ where: { groupId }, data: { cyclePoints: 0 } });
  await prisma.group.update({
    where: { id: groupId },
    data: {
      currentCycleStart: new Date(),
      currentCycleEnd: cycleEndDate(group.cycleDuration),
    },
  });
}
