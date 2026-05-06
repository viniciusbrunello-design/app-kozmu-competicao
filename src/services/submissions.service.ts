import { api } from './api';

export interface Submission {
  id: string;
  userId: string;
  groupId?: string;
  url: string;
  format: string;
  points: number;
  status: 'pending' | 'validated' | 'rejected';
  createdAt: string;
  validatedAt?: string;
  newRecord?: boolean;
}

export async function createSubmission(data: {
  url: string;
  format: string;
  groupId?: string;
  platform?: string;
}): Promise<Submission> {
  return api.post<Submission>('/submissions', data);
}

export async function getMySubmissions(status?: string): Promise<Submission[]> {
  const query = status ? `?status=${status}` : '';
  return api.get<Submission[]>(`/submissions${query}`);
}
