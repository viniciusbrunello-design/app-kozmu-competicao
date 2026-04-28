import { api } from './api';

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export async function getNotifications(unreadOnly = false): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  return api.get(`/notifications${unreadOnly ? '?unread=true' : ''}`);
}

export async function markAllRead(): Promise<void> {
  await api.put('/notifications/read-all');
}

export async function markRead(id: string): Promise<void> {
  await api.put(`/notifications/${id}/read`);
}
