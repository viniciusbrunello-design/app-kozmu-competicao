import { api } from './api';

export interface Challenge {
  id: string;
  groupId?: string;
  title: string;
  description: string;
  type: string;
  targetCount: number;
  format?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  participantCount: number;
  myProgress: number;
  myCompleted: boolean;
  progressPercent: number;
  daysLeft: number;
}

export async function getMyChallenges(): Promise<Challenge[]> {
  return api.get<Challenge[]>('/challenges');
}

export async function joinChallenge(challengeId: string): Promise<void> {
  await api.post(`/challenges/${challengeId}/join`);
}

export async function createChallenge(data: {
  title: string;
  description: string;
  type?: string;
  targetCount: number;
  format?: string;
  groupId?: string;
  startDate: string;
  endDate: string;
}): Promise<Challenge> {
  return api.post<Challenge>('/challenges', data);
}
