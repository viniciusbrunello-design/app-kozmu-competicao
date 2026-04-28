import { api } from './api';
import type { RankingEntry } from './groups.service';

export async function getWeeklyRanking(groupId?: string): Promise<RankingEntry[]> {
  const query = groupId ? `?groupId=${groupId}` : '';
  return api.get<RankingEntry[]>(`/ranking/weekly${query}`);
}

export async function getMonthlyRanking(groupId?: string): Promise<RankingEntry[]> {
  const query = groupId ? `?groupId=${groupId}` : '';
  return api.get<RankingEntry[]>(`/ranking/monthly${query}`);
}

export async function getStreakRanking(): Promise<
  { rank: number; userId: string; displayName: string; username: string; currentStreak: number; bestStreak: number; league: string }[]
> {
  return api.get('/ranking/streak');
}

export async function getMyRank(period: 'weekly' | 'monthly' = 'weekly', groupId?: string) {
  const params = new URLSearchParams({ period });
  if (groupId) params.set('groupId', groupId);
  return api.get<{ rank: number; total: number; points: number } | null>(
    `/ranking/me?${params.toString()}`,
  );
}
