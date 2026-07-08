import { api } from './api';
import type { RankingEntry } from './groups.service';

export async function getWeeklyRanking(groupId?: string, mode?: 'points' | 'count'): Promise<RankingEntry[]> {
  const params = new URLSearchParams();
  if (groupId) params.set('groupId', groupId);
  if (mode) params.set('mode', mode);
  const query = params.toString();
  return api.get<RankingEntry[]>(`/ranking/weekly${query ? `?${query}` : ''}`);
}

export async function getMonthlyRanking(groupId?: string, mode?: 'points' | 'count'): Promise<RankingEntry[]> {
  const params = new URLSearchParams();
  if (groupId) params.set('groupId', groupId);
  if (mode) params.set('mode', mode);
  const query = params.toString();
  return api.get<RankingEntry[]>(`/ranking/monthly${query ? `?${query}` : ''}`);
}

export interface StreakRankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  currentStreak: number;
  bestStreak: number;
  league: string;
}

export async function getStreakRanking(): Promise<StreakRankingEntry[]> {
  return api.get('/ranking/streak');
}

export async function getMyRank(period: 'weekly' | 'monthly' = 'weekly', groupId?: string) {
  const params = new URLSearchParams({ period });
  if (groupId) params.set('groupId', groupId);
  return api.get<{ rank: number; total: number; points: number } | null>(
    `/ranking/me?${params.toString()}`,
  );
}
