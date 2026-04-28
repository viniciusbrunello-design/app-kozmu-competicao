import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, MessageCircle, Copy, Share2 } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getGroupDetails, getGroupRanking, getGroupActivity } from '../services/groups.service';
import type { Group, RankingEntry, ActivityEntry } from '../services/groups.service';
import { api } from '../services/api';
import styles from './GrupoDetalhe.module.css';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#b5e0ff', cosmos: '#a78bfa', nova: '#f59e0b', orbit: '#34d399',
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'agora';
}

function activityLabel(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'post_submitted':
    case 'post_validated':
      return `Registrou um ${String(data.format ?? 'post')} (+${data.points ?? 0} pts)`;
    case 'streak_extended':
      return `🔥 ${data.currentStreak} dias de streak`;
    case 'streak_milestone':
      return `🔥 ${data.currentStreak} dias de streak!`;
    case 'challenge_completed':
      return `Completou o desafio "${data.challengeTitle ?? ''}"! 🎯`;
    case 'group_joined':
      return 'Entrou no grupo';
    default:
      return type;
  }
}

export function GrupoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'ranking' | 'atividade'>('ranking');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getGroupDetails(id).then(setGroup),
      getGroupRanking(id, 'weekly').then(setRanking),
      getGroupActivity(id).then(setActivity),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleNudge = useCallback(async (targetUserId: string) => {
    if (!id) return;
    setNudgedIds((prev) => new Set(prev).add(targetUserId));
    api.post(`/groups/${id}/nudge/${targetUserId}`).catch(() => {});
  }, [id]);

  async function handleShare() {
    if (!group) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entrar no grupo "${group.name}" no Kozmu`,
          text: `Use o código ${group.inviteCode} para entrar no grupo "${group.name}" no Kozmu!`,
        });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(group.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mobile-container">
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <div className={styles.headerInfo}>
            <div className={styles.skeletonTitle} />
          </div>
        </header>
        <div className="page-content">
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="mobile-container">
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <span className={styles.headerTitle}>Grupo não encontrado</span>
        </header>
      </div>
    );
  }

  const myRankEntry = ranking.find((r) => r.userId === user?.id);
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(group.currentCycleEnd).getTime() - Date.now()) / 86400000,
  ));

  return (
    <div className="mobile-container">
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>{group.name}</h1>
          <span className={styles.headerSub}>{group.memberCount} membros · {daysLeft}d para reset</span>
        </div>
        <button className={styles.shareBtn} onClick={handleShare} aria-label="Compartilhar convite">
          {copied ? <Copy size={18} /> : navigator.share ? <Share2 size={18} /> : <Copy size={18} />}
        </button>
      </header>

      {copied && <div className={styles.copiedToast}>Código copiado!</div>}

      <div className="page-content">

        {/* My position card */}
        {myRankEntry && (
          <Card variant="glass" glow="purple" className={styles.myCard}>
            <div className={styles.myCardLabel}>Sua posição neste ciclo</div>
            <div className={styles.myCardContent}>
              <span className={styles.myRank}>#{myRankEntry.rank}</span>
              <div className={styles.myStats}>
                <span className={styles.myPoints}>{myRankEntry.points} pts</span>
                {myRankEntry.currentStreak > 0 && (
                  <span className={styles.myStreak}>
                    <Flame size={13} /> {myRankEntry.currentStreak} dias
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'ranking' ? styles.tabActive : ''}`}
            onClick={() => setTab('ranking')}
          >
            Ranking
          </button>
          <button
            className={`${styles.tab} ${tab === 'atividade' ? styles.tabActive : ''}`}
            onClick={() => setTab('atividade')}
          >
            Atividade
          </button>
        </div>

        {tab === 'ranking' && (
          <Card>
            {ranking.length === 0 ? (
              <div className={styles.empty}>Nenhuma publicação registrada ainda.</div>
            ) : (
              ranking.map((entry) => {
                const isMe = entry.userId === user?.id;
                const nudged = nudgedIds.has(entry.userId);
                return (
                  <div
                    key={entry.userId}
                    className={`${styles.rankRow} ${isMe ? styles.rankRowMe : ''}`}
                  >
                    <span className={styles.rankPos}>
                      {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
                    </span>
                    <Avatar
                      alt={entry.displayName}
                      size="sm"
                      fallback={entry.displayName.slice(0, 2).toUpperCase()}
                      src={entry.avatarUrl}
                    />
                    <div className={styles.rankInfo}>
                      <span className={styles.rankName}>
                        {entry.displayName}
                        {isMe && <span className={styles.youBadge}>você</span>}
                      </span>
                      <span
                        className={styles.rankLeague}
                        style={{ color: LEAGUE_COLORS[entry.league] ?? 'var(--text-muted)' }}
                      >
                        {entry.submissionCount} posts
                        {entry.currentStreak > 0 && ` · 🔥${entry.currentStreak}`}
                      </span>
                    </div>
                    <div className={styles.rankRight}>
                      <span className={styles.rankPoints}>{entry.points} pts</span>
                      {!isMe && (
                        <button
                          className={`${styles.nudgeBtn} ${nudged ? styles.nudgeDone : ''}`}
                          onClick={() => handleNudge(entry.userId)}
                          disabled={nudged}
                          title={nudged ? 'Cobrado!' : 'Cobrar'}
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        )}

        {tab === 'atividade' && (
          <Card>
            {activity.length === 0 ? (
              <div className={styles.empty}>Nenhuma atividade ainda.</div>
            ) : (
              activity.slice(0, 15).map((item) => (
                <div key={item.id} className={styles.activityRow}>
                  <Avatar
                    alt={item.user.displayName}
                    size="sm"
                    fallback={item.user.displayName.slice(0, 2).toUpperCase()}
                    src={item.user.avatarUrl}
                  />
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>{item.user.displayName}</span>
                    <span className={styles.activityAction}>{activityLabel(item.type, item.data)}</span>
                  </div>
                  <span className={styles.activityTime}>{timeAgo(item.createdAt)}</span>
                </div>
              ))
            )}
          </Card>
        )}

      </div>
    </div>
  );
}
