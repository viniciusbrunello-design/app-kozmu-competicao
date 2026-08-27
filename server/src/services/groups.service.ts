import prisma from '../prisma';
import { generateInviteCode } from '../utils/inviteCode';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { createActivity } from './activity.service';
import { createNotification } from './notifications.service';
import { DEFAULT_POINTS } from './points.service';
import type { CreateGroupInput, JoinGroupInput } from '../schemas/groups.schema';

function cycleEndDate(duration: string, customDays?: number): Date {
  const now = new Date();
  switch (duration) {
    case 'biweekly':
      now.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      now.setMonth(now.getMonth() + 1);
      break;
    case 'none':
      now.setFullYear(now.getFullYear() + 100);
      break;
    case 'custom':
      now.setDate(now.getDate() + (customDays ?? 7));
      break;
    default:
      now.setDate(now.getDate() + 7);
  }
  return now;
}

type CycleMemberSnapshot = {
  userId: string;
  cyclePoints: number;
  user: { displayName: string; username: string; avatarUrl: string | null; league: string };
};

async function notifyMemberJoined(groupId: string, groupName: string, newUserId: string, existingMemberIds: string[]): Promise<void> {
  const newUser = await prisma.user.findUnique({
    where: { id: newUserId },
    select: { displayName: true, username: true },
  });
  if (!newUser) return;

  await Promise.all(
    existingMemberIds.map((memberId) =>
      createNotification(
        memberId,
        'group_invite',
        `👋 ${newUser.displayName} entrou no ${groupName}!`,
        `@${newUser.username} acabou de entrar no grupo. A competição está esquentando!`,
        { groupId, newMemberId: newUserId },
      ),
    ),
  );
}

async function awardAndNotifyCycleResult(
  group: { id: string; name: string; currentCycleEnd: Date },
  sortedMembers: CycleMemberSnapshot[],
  newCycleStarted: boolean,
): Promise<void> {
  const winner = sortedMembers[0];
  const hasActivity = (winner?.cyclePoints ?? 0) > 0;

  const podium = sortedMembers.slice(0, 3).map((m, i) => ({
    rank: i + 1,
    userId: m.userId,
    displayName: m.user.displayName,
    username: m.user.username,
    avatarUrl: m.user.avatarUrl,
    league: m.user.league,
    cyclePoints: m.cyclePoints,
  }));

  if (hasActivity) {
    await prisma.user.update({ where: { id: winner.userId }, data: { winCount: { increment: 1 } } });
  }

  await Promise.all(
    sortedMembers.map((m, i) => {
      const isWinner = hasActivity && m.userId === winner.userId;
      const title = isWinner
        ? `🏆 Você venceu o ciclo do ${group.name}!`
        : `🏁 Ciclo encerrado no ${group.name}!`;
      const body = hasActivity
        ? `Você terminou em #${i + 1} com ${m.cyclePoints} pts.${isWinner ? '' : ` Vencedor: ${winner.user.displayName}.`}${newCycleStarted ? ' Um novo ciclo já começou!' : ''}`
        : `O ciclo terminou sem publicações.${newCycleStarted ? ' Um novo ciclo já começou — bora publicar!' : ''}`;
      return createNotification(m.userId, 'cycle_ended', title, body, {
        groupId: group.id,
        groupName: group.name,
        cycleEnd: group.currentCycleEnd.toISOString(),
        podium,
        myRank: i + 1,
        myPoints: m.cyclePoints,
        newCycleStarted,
      });
    }),
  );
}

async function finishCycleAndStartNext(groupId: string): Promise<boolean> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { cyclePoints: 'desc' },
        include: {
          user: { select: { displayName: true, username: true, avatarUrl: true, league: true } },
        },
      },
    },
  });
  if (!group || !group.isActive || group.cycleDuration === 'none') return false;

  // Ciclos personalizados: a duração é derivada do intervalo do ciclo anterior,
  // já que o número de dias não é persistido no schema.
  const customDays =
    group.cycleDuration === 'custom'
      ? Math.max(
          1,
          Math.round(
            (group.currentCycleEnd.getTime() - group.currentCycleStart.getTime()) / 86400000,
          ),
        )
      : undefined;

  const newEnd = cycleEndDate(group.cycleDuration, customDays);

  // Claim otimista: só a primeira requisição concorrente processa o ciclo
  const claimed = await prisma.group.updateMany({
    where: { id: groupId, currentCycleEnd: group.currentCycleEnd },
    data: { currentCycleStart: new Date(), currentCycleEnd: newEnd },
  });
  if (claimed.count === 0) return false;

  await prisma.groupMember.updateMany({ where: { groupId }, data: { cyclePoints: 0 } });
  await awardAndNotifyCycleResult(group, group.members, true);
  return true;
}

export async function ensureGroupCycleCurrent(groupId: string): Promise<void> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { isActive: true, cycleDuration: true, currentCycleEnd: true },
  });
  if (!group || !group.isActive || group.cycleDuration === 'none') return;
  if (group.currentCycleEnd >= new Date()) return;
  await finishCycleAndStartNext(groupId);
}

export async function rolloverExpiredCycles(userId?: string): Promise<void> {
  const expired = await prisma.group.findMany({
    where: {
      isActive: true,
      cycleDuration: { not: 'none' },
      currentCycleEnd: { lt: new Date() },
      ...(userId ? { members: { some: { userId } } } : {}),
    },
    select: { id: true },
  });

  for (const g of expired) {
    await finishCycleAndStartNext(g.id);
  }
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
      avatarUrl: input.emoji,
      inviteCode,
      type: input.type,
      cycleDuration: input.cycleDuration,
      maxMembers: input.maxMembers,
      currentCycleEnd: cycleEndDate(input.cycleDuration, input.customCycleDays),
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
  await notifyMemberJoined(group.id, group.name, userId, group.members.map((m) => m.userId));

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
  await rolloverExpiredCycles(userId);

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
    emoji: m.group.avatarUrl ?? undefined,
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
  await ensureGroupCycleCurrent(groupId);

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
    emoji: group.avatarUrl ?? undefined,
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
  await notifyMemberJoined(group.id, group.name, userId, group.members.map((m) => m.userId));

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

export async function removeMember(groupId: string, adminUserId: string, targetUserId: string): Promise<void> {
  const adminMembership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: adminUserId, groupId } },
  });
  if (!adminMembership || adminMembership.role !== 'admin') throw new ForbiddenError('Apenas admins podem remover membros');
  if (adminUserId === targetUserId) throw new ForbiddenError('Você não pode se remover desta forma');

  const target = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: targetUserId, groupId } },
  });
  if (!target) throw new NotFoundError('Membro');

  await prisma.groupMember.delete({ where: { userId_groupId: { userId: targetUserId, groupId } } });
}

export async function endGroup(groupId: string, adminUserId: string): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: adminUserId, groupId } },
  });
  if (!membership || membership.role !== 'admin') throw new ForbiddenError('Apenas admins podem encerrar o grupo');

  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: {
        orderBy: { cyclePoints: 'desc' },
        include: {
          user: { select: { displayName: true, username: true, avatarUrl: true, league: true } },
        },
      },
    },
  });
  if (!group) throw new NotFoundError('Grupo');
  if (!group.isActive) return;

  await prisma.group.update({
    where: { id: groupId },
    data: { isActive: false, currentCycleEnd: new Date() },
  });

  // Resultado final: premia o vencedor e notifica os membros.
  // cyclePoints não são zerados para preservar o ranking final do grupo.
  await awardAndNotifyCycleResult(group, group.members, false);
}

export async function updateGroupSettings(
  groupId: string,
  userId: string,
  data: { rankingMode?: string; name?: string; description?: string; bannerUrl?: string | null },
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
      ...(data.bannerUrl !== undefined && { bannerUrl: data.bannerUrl }),
    },
  });
}

export async function uploadGroupBanner(
  groupId: string,
  userId: string,
  file: { buffer: Buffer; mimetype: string; originalname: string },
): Promise<string> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId, groupId } },
  });
  if (!membership || membership.role !== 'admin') throw new ForbiddenError('Apenas admins podem editar o grupo');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) throw new Error('Supabase Storage não configurado');

  const ext = (file.originalname.split('.').pop() ?? 'jpg').toLowerCase();
  const fileName = `${groupId}/${Date.now()}.${ext}`;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/group-banners/${fileName}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': file.mimetype,
      'x-upsert': 'true',
    },
    body: new Uint8Array(file.buffer),
  });

  if (!uploadRes.ok) {
    const text = await uploadRes.text();
    throw new Error(`Falha no upload: ${text}`);
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/group-banners/${fileName}`;

  await prisma.group.update({ where: { id: groupId }, data: { bannerUrl: publicUrl } });

  return publicUrl;
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

export async function resetGroupCycle(groupId: string, adminUserId: string): Promise<void> {
  const membership = await prisma.groupMember.findUnique({
    where: { userId_groupId: { userId: adminUserId, groupId } },
  });
  if (!membership || membership.role !== 'admin') throw new ForbiddenError('Apenas admins podem reiniciar o ciclo');

  await finishCycleAndStartNext(groupId);
}
