import { useEffect, useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './NotificationToast.module.css';

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
}

const MOTIVATIONAL_TYPES = new Set([
  'rank_up', 'streak_record', 'streak_milestone', 'weekly_goal_completed', 'badge_earned',
]);

export function NotificationToast() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<Notif | null>(null);
  const queue = useRef<Notif[]>([]);
  const shown = useRef<Set<string>>(new Set());
  const isShowing = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNext = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const next = queue.current.shift();
    if (!next) {
      setCurrent(null);
      isShowing.current = false;
      return;
    }
    isShowing.current = true;
    setCurrent(next);
    timer.current = setTimeout(() => {
      api.put(`/notifications/${next.id}/read`).catch(() => {});
      showNext();
    }, 4500);
  }, []);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (current) {
      api.put(`/notifications/${current.id}/read`).catch(() => {});
    }
    showNext();
  }, [current, showNext]);

  const poll = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<{ notifications: Notif[]; unreadCount: number }>('/notifications?unread=true');
      const fresh = res.notifications.filter(
        (n) => MOTIVATIONAL_TYPES.has(n.type) && !shown.current.has(n.id),
      );
      if (fresh.length === 0) return;
      fresh.forEach((n) => { shown.current.add(n.id); queue.current.push(n); });
      if (!isShowing.current) showNext();
    } catch { /* ignore */ }
  }, [user, showNext]);

  useEffect(() => {
    if (!user) return;
    poll();
    const interval = setInterval(poll, 30_000);
    return () => {
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [user, poll]);

  if (!current) return null;

  return (
    <div className={styles.toast}>
      <div className={styles.toastContent}>
        <p className={styles.toastTitle}>{current.title}</p>
        <p className={styles.toastBody}>{current.body}</p>
      </div>
      <button className={styles.toastClose} onClick={dismiss} aria-label="Fechar">
        <X size={16} />
      </button>
    </div>
  );
}
