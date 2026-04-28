import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, CheckCheck, Flame, TrendingUp, TrendingDown, Trophy, Star, ShieldCheck, ShieldX, Users, Target, Zap } from 'lucide-react';
import { api } from '../services/api';
import styles from './Notificacoes.module.css';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  data: Record<string, unknown>;
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'agora';
}

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    streak_at_risk:       { icon: <Flame size={18} />,        color: 'var(--accent-orange, #f97316)' },
    streak_broken:        { icon: <Flame size={18} />,        color: 'var(--text-muted)' },
    streak_milestone:     { icon: <Flame size={18} />,        color: 'var(--accent-lime)' },
    rank_up:              { icon: <TrendingUp size={18} />,   color: 'var(--accent-lime)' },
    rank_drop:            { icon: <TrendingDown size={18} />, color: 'var(--accent-red, #ef4444)' },
    rival_overtook:       { icon: <Zap size={18} />,          color: 'var(--accent-purple)' },
    goal_almost_complete: { icon: <Target size={18} />,       color: 'var(--accent-blue)' },
    weekly_goal_completed:{ icon: <Trophy size={18} />,       color: 'var(--accent-lime)' },
    new_cycle:            { icon: <Star size={18} />,         color: 'var(--accent-blue)' },
    badge_earned:         { icon: <Trophy size={18} />,       color: 'var(--accent-purple)' },
    proof_validated:      { icon: <ShieldCheck size={18} />,  color: 'var(--accent-lime)' },
    proof_rejected:       { icon: <ShieldX size={18} />,      color: 'var(--accent-red, #ef4444)' },
    group_invite:         { icon: <Users size={18} />,        color: 'var(--accent-blue)' },
  };

  const entry = map[type] ?? { icon: <Bell size={18} />, color: 'var(--text-secondary)' };
  return (
    <span className={styles.icon} style={{ color: entry.color }}>
      {entry.icon}
    </span>
  );
}

export function Notificacoes() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ notifications: Notification[]; unreadCount: number }>('/notifications')
      .then((r) => setNotifications(r.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Mark all as read silently
    api.put('/notifications/read-all').catch(() => {});
  }, []);

  const unread = notifications.filter((n) => !n.read);

  return (
    <div className="mobile-container">
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Notificações</h1>
        {unread.length > 0 && (
          <span className={styles.badge}>{unread.length}</span>
        )}
      </header>

      <div className="page-content">
        {loading ? (
          <div className={styles.empty}>Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={40} className={styles.emptyIcon} />
            <p>Tudo limpo por aqui!</p>
            <span>Quando você bater metas e subir no ranking, as notificações aparecem aqui.</span>
          </div>
        ) : (
          <ul className={styles.list}>
            {notifications.map((n) => (
              <li key={n.id} className={`${styles.item} ${!n.read ? styles.unread : ''}`}>
                <NotifIcon type={n.type} />
                <div className={styles.content}>
                  <span className={styles.notifTitle}>{n.title}</span>
                  <span className={styles.notifBody}>{n.body}</span>
                </div>
                <span className={styles.time}>{timeAgo(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}

        {notifications.length > 0 && (
          <button
            className={styles.markAll}
            onClick={() => {
              api.put('/notifications/read-all').catch(() => {});
              setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            }}
          >
            <CheckCheck size={14} />
            Marcar todas como lidas
          </button>
        )}
      </div>
    </div>
  );
}
