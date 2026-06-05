import { api } from './api';

export interface UserGoal {
  id: string;
  title: string;
  targetCount: number;
  format?: string;
  startDate: string;
  endDate: string;
  completed: boolean;
  progress: number;
  percentage: number;
  isActive: boolean;
}

export async function getMyGoals(): Promise<UserGoal[]> {
  return api.get<UserGoal[]>('/goals');
}

export async function createGoal(data: {
  title: string;
  targetCount: number;
  format?: string;
  startDate: string;
  endDate: string;
}): Promise<UserGoal> {
  return api.post<UserGoal>('/goals', data);
}

export async function deleteGoal(id: string): Promise<void> {
  await api.del(`/goals/${id}`);
}
