import { api, setTokens, clearTokens } from './api';

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  profileType: string;
  avatarUrl?: string;
  platforms: string[];
  totalPoints: number;
  league: string;
  winCount: number;
  isPro: boolean;
  createdAt: string;
  streak?: {
    currentStreak: number;
    bestStreak: number;
    weeklyCount: number;
    weeklyTarget: number;
    atRisk: boolean;
  };
  stats?: {
    submissionCount: number;
    challengeCount: number;
  };
  achievements?: { id: string; unlocked: boolean }[];
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export async function register(data: {
  email: string;
  username: string;
  password: string;
  displayName: string;
  profileType?: string;
  platforms?: string[];
}): Promise<User> {
  const res = await api.post<AuthResponse>('/auth/register', data);
  setTokens(res.accessToken, res.refreshToken);
  return res.user;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  setTokens(res.accessToken, res.refreshToken);
  return res.user;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    clearTokens();
  }
}

export async function getMe(): Promise<User> {
  return api.get<User>('/users/me');
}

export async function updateProfile(data: {
  displayName?: string;
  bio?: string;
  profileType?: string;
  platforms?: string[];
}): Promise<User> {
  return api.put<User>('/users/me', data);
}
