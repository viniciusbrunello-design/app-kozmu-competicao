import { api } from './api';

export interface Group {
  id: string;
  name: string;
  description?: string;
  emoji?: string;
  inviteCode: string;
  type: string;
  cycleDuration: string;
  maxMembers: number;
  isActive: boolean;
  rankingMode: string;
  currentCycleStart: string;
  currentCycleEnd: string;
  myRole: string | null;
  myPoints: number;
  memberCount: number;
  daysUntilReset: number;
  members: GroupMember[];
  scoringRules: ScoringRule[];
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: string;
  cyclePoints: number;
  totalPoints: number;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    league?: string;
  };
}

export interface ScoringRule {
  id: string;
  format: string;
  points: number;
}

export interface PublicGroup {
  id: string;
  name: string;
  description?: string;
  type: string;
  cycleDuration: string;
  maxMembers: number;
  memberCount: number;
  isMember: boolean;
}

export async function getMyGroups(): Promise<Group[]> {
  return api.get<Group[]>('/groups');
}

export async function getPublicGroups(): Promise<PublicGroup[]> {
  return api.get<PublicGroup[]>('/groups/public');
}

export async function joinPublicGroup(groupId: string): Promise<Group> {
  return api.post<Group>(`/groups/${groupId}/join-public`);
}

export async function getGroupDetails(groupId: string): Promise<Group> {
  return api.get<Group>(`/groups/${groupId}`);
}

export async function createGroup(data: {
  name: string;
  description?: string;
  emoji?: string;
  type?: string;
  cycleDuration?: string;
  customCycleDays?: number;
  maxMembers?: number;
  scoringRules?: { format: string; points: number }[];
}): Promise<Group> {
  return api.post<Group>('/groups', data);
}

export async function joinGroup(inviteCode: string): Promise<Group> {
  return api.post<Group>('/groups/join', { inviteCode });
}

export async function leaveGroup(groupId: string): Promise<void> {
  await api.post(`/groups/${groupId}/leave`);
}

export async function getGroupRanking(
  groupId: string,
  period: 'weekly' | 'monthly' = 'weekly',
): Promise<RankingEntry[]> {
  return api.get<RankingEntry[]>(`/groups/${groupId}/ranking?period=${period}`);
}

export async function getGroupActivity(groupId: string): Promise<ActivityEntry[]> {
  return api.get<ActivityEntry[]>(`/groups/${groupId}/activity`);
}

export async function getGroupInviteCode(groupId: string): Promise<string> {
  const res = await api.get<{ inviteCode: string }>(`/groups/${groupId}/invite`);
  return res.inviteCode;
}

export async function updateGroupSettings(
  groupId: string,
  data: { rankingMode?: string; name?: string; description?: string },
): Promise<void> {
  await api.put(`/groups/${groupId}/settings`, data);
}

export async function updateGroupScoringRules(
  groupId: string,
  rules: { format: string; points: number }[],
): Promise<void> {
  await api.put(`/groups/${groupId}/scoring-rules`, { rules });
}

export interface RankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
  league: string;
  points: number;
  submissionCount: number;
  currentStreak: number;
}

export interface ActivityEntry {
  id: string;
  userId: string;
  groupId?: string;
  type: string;
  data: Record<string, unknown>;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}
