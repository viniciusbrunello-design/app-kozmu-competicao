import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, TrendingUp, Plus, Trophy, MessageCircle, Shield, Zap } from 'lucide-react';
import { SkeletonActivityItem } from '../components/ui/Skeleton';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { getMyRank } from '../services/ranking.service';
import type { ActivityEntry } from '../services/groups.service';
import { api } from '../services/api';
import styles from './Home.module.css';

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'agora';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia,';
  if (h < 18) return 'Boa tarde,';
  return 'Boa noite,';
}

function activityLabel(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'post_submitted':
    case 'post_validated':
      return `Registrou um ${String(data.format ?? 'post')} (+${data.points ?? 0} pts)`;
    case 'streak_extended':
      return `🔥 ${data.currentStreak} dias no streak`;
    case 'streak_milestone':
      return `🔥 ${data.currentStreak} dias de streak!`;
    case 'rank_up':
      return 'Subiu no ranking! 📈';
    case 'goal_completed':
      return '🏆 Bateu a meta da semana!';
    case 'challenge_completed':
      return `Completou o desafio "${data.challengeTitle ?? ''}"! 🎯`;
    case 'group_joined':
      return `Entrou no grupo "${data.groupName ?? ''}"`;
    default:
      return type;
  }
}

// Daily mission — seeded by day of year so everyone sees the same one
const DAILY_MISSIONS = [
  { emoji: '🎬', title: 'Poste um Reel hoje', desc: 'Reels têm o maior alcance. Aproveite o algoritmo!', format: 'reel' },
  { emoji: '🖼️', title: 'Suba um Carrossel', desc: 'Carrosséis educam e engajam. Qual conhecimento você compartilha?', format: 'carousel' },
  { emoji: '🔴', title: 'Faça uma Live hoje', desc: 'Lives constroem conexão real. Apareça ao vivo!', format: 'live' },
  { emoji: '💼', title: 'Publique no LinkedIn', desc: 'Seu network profissional está esperando por você.', format: 'linkedin' },
  { emoji: '📷', title: 'Poste no Feed', desc: 'Consistência no feed aumenta sua autoridade.', format: 'feed' },
  { emoji: '⭕', title: 'Story de bastidores', desc: 'Mostre o processo. Stories aproximam sua audiência.', format: 'story' },
  { emoji: '🚀', title: 'Publique em 2 formatos', desc: 'Diversifique! Quanto mais formatos, mais pontos.', format: null },
];

function getDailyMission() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return DAILY_MISSIONS[dayOfYear % DAILY_MISSIONS.length];
}

interface CycleResult {
  groupId: string;
  groupName: string;
  cycleEnd: string;
  isEnded?: boolean;
  podium: { rank: number; userId: string; displayName: string; username: string; avatarUrl?: string; league: string; cyclePoints: number }[];
  myRank: number;
  myPoints: number;
  totalMembers: number;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const FORMAT_EMOJI: Record<string, string> = {
  reel: '🎬', carousel: '🖼️', feed: '📷', live: '🔴', linkedin: '💼', story: '⭕',
};
const FORMAT_LABEL: Record<string, string> = {
  reel: 'Reels', carousel: 'Carrosseis', feed: 'Posts', live: 'Lives', linkedin: 'LinkedIn', story: 'Stories',
};

export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState<ActivityEntry[]>([]);
  const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set());
  const [cycleModal, setCycleModal] = useState<CycleResult | null>(null);
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [formatStats, setFormatStats] = useState<{ format: string; count: number }[]>([]);

  useEffect(() => {
    Promise.all([
      getUserFeed(20).then(setFeed).catch(() => {}),
      getMyRank('weekly').then(setRank).catch(() => {}),
      api
        .get<{ notifications: unknown[]; unreadCount: number }>('/notifications?unread=true')
        .then((r) => setUnreadCount(r.unreadCount))
        .catch(() => {}),
      api.get<{ date: string; count: number }[]>('/users/me/heatmap').then(setHeatmap).catch(() => {}),
      api.get<{ formatBreakdown: { format: string; count: number }[] }>('/users/me/stats')
        .then((r) => setFormatStats(r.formatBreakdown))
        .catch(() => {}),
    ]).finally(() => setLoadingFeed(false));

    checkEndedCycles();
  }, []);

  async function checkEndedCycles() {
    try {
      interface GroupSummary { id: string; currentCycleEnd: string }
      const groups = await api.get<GroupSummary[]>('/groups');
      const ended = groups.find((g) => new Date(g.currentCycleEnd) < new Date());
      if (!ended) return;

      const sessionKey = `cycle_dismissed_${ended.id}_${ended.currentCycleEnd}`;
      if (sessionStorage.getItem(sessionKey)) return;

      const result = await api.get<CycleResult>(`/groups/${ended.id}/cycle-result`);
      if (result.isEnded) setCycleModal(result);
    } catch { /* silently ignore */ }
  }

  const handleNudge = useCallback(async (item: ActivityEntry) => {
    if (!item.groupId) return;
    setNudgedIds((prev) => new Set(prev).add(item.userId));
    api.post(`/groups/${item.groupId}/nudge/${item.userId}`).catch(() => {});
  }, []);

  function dismissCycleModal() {
    if (!cycleModal) return;
    sessionStorage.setItem(`cycle_dismissed_${cycleModal.groupId}_${cycleModal.cycleEnd}`, '1');
    setCycleModal(null);
  }

  const streak = user?.streak;
  const weeklyCount = streak?.weeklyCount ?? 0;
  const weeklyTarget = streak?.weeklyTarget ?? 5;
  const weeklyProgress = Math.min(100, Math.round((weeklyCount / weeklyTarget) * 100));
  const shields = (streak as { catchUpTokens?: number } | undefined)?.catchUpTokens ?? 0;
  const dailyMission = getDailyMission();
  const currentStreak = streak?.currentStreak ?? 0;

  // Heatmap-derived metrics
  const last7Days = heatmap.slice(-7);
  const last30Days = heatmap.slice(-30);
  const activeDays = heatmap.filter((d) => d.count > 0).length;
  const consistency = last30Days.length
    ? Math.round((last30Days.filter((d) => d.count > 0).length / last30Days.length) * 100)
    : 0;
  const totalPosts = user?.stats?.submissionCount ?? 0;

  // Show comeback nudge if 3+ days with no posts and no active streak
  const last3Empty = heatmap.length >= 3 && heatmap.slice(-3).every((d) => d.count === 0);
  const showComeback = last3Empty && currentStreak === 0 && heatmap.length > 0;

  // Milestone messages
  const MILESTONES: Record<number, string> = {
    7: '🎉 7 dias consecutivos! Uma semana de constância!',
    14: '🔥 14 dias! Duas semanas sem parar — incrível!',
    21: '⚡ 21 dias! Você criou um hábito de verdade!',
    30: '🚀 30 dias! Um mês de consistência. Lendário!',
    60: '💎 60 dias! Você é uma máquina de conteúdo!',
    100: '🌌 100 dias!! Você está em órbita, criador(a)!',
  };
  const milestoneMsg = MILESTONES[currentStreak] ?? null;

  return (
    <>
      <Header title="Kozmu" showNotifications hasUnreadNotif={unreadCount > 0} showSettings />

      <div className="page-content">
        <div className={styles.home}>

          {/* Greeting */}
          <div className={styles.welcome}>
            <div className={styles.greeting}>
              <span>{greeting()}</span>
              <h2>@{user?.username ?? '...'}</h2>
            </div>
            <Avatar alt={user?.displayName ?? ''} size="md" status={streak?.atRisk ? 'danger' : 'active'} />
          </div>

          {/* Comeback nudge */}
          {showComeback && (
            <div className={styles.comebackBanner}>
              👋 Faz alguns dias que você não publica. Volte à órbita — seu público está esperando!
            </div>
          )}

          {/* Milestone banner */}
          {milestoneMsg && !showComeback && (
            <div className={styles.milestoneBanner}>{milestoneMsg}</div>
          )}

          {/* Streak card */}
          <Card variant="glass" glow="lime" className={styles.streakCard}>
            <Flame size={48} className={styles.fireIcon} />
            <div className={styles.streakTitle}>Streak Atual</div>
            <div className={styles.streakValue}>{currentStreak}</div>
            <div className={styles.streakSub}>
              {streak?.atRisk
                ? '⚠️ Publique hoje para não perder o streak!'
                : currentStreak >= 30
                ? 'dias — lendário! 🌌'
                : currentStreak >= 7
                ? 'dias consecutivos — continue assim! 🔥'
                : currentStreak > 0
                ? 'dias consecutivos publicando!'
                : 'Publique agora para iniciar seu streak!'}
            </div>

            {/* Last 7 days dots */}
            {last7Days.length > 0 && (
              <div className={styles.weekDots}>
                {last7Days.map(({ date, count }) => {
                  const day = new Date(date + 'T12:00:00').getDate();
                  return (
                    <div key={date} className={styles.dayDot}>
                      <div className={`${styles.dot} ${count > 0 ? styles.dotActive : ''}`} />
                      <span className={styles.dayNum}>{day}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {shields > 0 && (
              <div className={styles.shieldBadge}>
                <Shield size={13} />
                <span>{shields} escudo{shields > 1 ? 's' : ''} disponível{shields > 1 ? 'is' : ''}</span>
              </div>
            )}
          </Card>

          {/* Stats row */}
          <div className={styles.statsRow}>
            <div className={styles.statItem}>
              <span className={styles.statNum}>{totalPosts}</span>
              <span className={styles.statLabel}>Check-ins</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum}>{activeDays}</span>
              <span className={styles.statLabel}>Dias ativos</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statNum} style={{ color: consistency >= 70 ? 'var(--accent-lime)' : consistency >= 40 ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                {consistency}%
              </span>
              <span className={styles.statLabel}>Constância</span>
            </div>
          </div>

          {/* Format breakdown */}
          {formatStats.length > 0 && (
            <div className={styles.formatStatsRow}>
              {formatStats.map(({ format, count }) => (
                <div key={format} className={styles.formatStatPill}>
                  <span>{FORMAT_EMOJI[format] ?? '📝'}</span>
                  <span className={styles.formatStatCount}>{count}</span>
                  <span className={styles.formatStatLabel}>{FORMAT_LABEL[format] ?? format}</span>
                </div>
              ))}
            </div>
          )}

          {/* Weekly goal */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Meta Semanal</h3>
              {rank && (
                <span className={styles.rankBadge}>
                  <TrendingUp size={12} /> #{rank.rank}
                </span>
              )}
            </div>
            <Card>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {weeklyCount >= weeklyTarget
                    ? '🎉 Meta batida! +1 escudo ganho'
                    : weeklyCount >= weeklyTarget - 1
                    ? `Só mais 1 post para fechar! 💪`
                    : `Faltam ${weeklyTarget - weeklyCount} posts para fechar`}
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-lime)' }}>
                  {weeklyCount}/{weeklyTarget}
                </span>
              </div>
              <ProgressBar progress={weeklyProgress} label="Progresso" color="blue" />
            </Card>
          </div>

          {/* Daily mission */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Missão do Dia</h3>
              <span className={styles.missionBadge}>
                <Zap size={11} /> Hoje
              </span>
            </div>
            <Card
              variant="glass"
              className={styles.missionCard}
              onClick={() => navigate('/registrar')}
              style={{ cursor: 'pointer' }}
            >
              <span className={styles.missionEmoji}>{dailyMission.emoji}</span>
              <div className={styles.missionContent}>
                <span className={styles.missionTitle}>{dailyMission.title}</span>
                <span className={styles.missionDesc}>{dailyMission.desc}</span>
              </div>
              <Plus size={18} className={styles.missionArrow} />
            </Card>
          </div>

          {/* CTA */}
          <div className={styles.ctaSection}>
            <Button variant="primary" fullWidth icon={<Plus size={18} />} onClick={() => navigate('/registrar')}>
              Registrar Publicação
            </Button>
          </div>

          {/* Group activity */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Atividade do Grupo</h3>
              <a
                href="#"
                className={styles.seeAll}
                onClick={(e) => { e.preventDefault(); navigate('/grupos'); }}
              >
                Ver tudo
              </a>
            </div>

            <Card>
              {loadingFeed ? (
                <>{[0, 1, 2].map((i) => <SkeletonActivityItem key={i} />)}</>
              ) : feed.length === 0 ? (
                <div className={styles.emptyFeed}>
                  Seu grupo ainda está quieto. Seja o primeiro a publicar hoje! 🚀
                </div>
              ) : (
                feed.slice(0, 5).map((item) => {
                  const isMe = item.userId === user?.id;
                  const nudged = nudgedIds.has(item.userId);
                  return (
                    <div key={item.id} className={styles.activityItem}>
                      <Avatar
                        alt={item.user.displayName}
                        size="sm"
                        fallback={item.user.displayName.slice(0, 2).toUpperCase()}
                        src={item.user.avatarUrl}
                      />
                      <div className={styles.activityContent}>
                        <span className={styles.activityUser}>{item.user.displayName}</span>
                        <span className={styles.activityAction}>
                          {activityLabel(item.type, item.data)}
                        </span>
                      </div>
                      <div className={styles.activityRight}>
                        <span className={styles.activityTime}>{timeAgo(item.createdAt)}</span>
                        {!isMe && item.groupId && (
                          <button
                            className={`${styles.nudgeBtn} ${nudged ? styles.nudgeDone : ''}`}
                            onClick={() => handleNudge(item)}
                            disabled={nudged}
                            title={nudged ? 'Cobrado! 💪' : 'Cobrar para publicar'}
                            aria-label="Cobrar"
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
          </div>

        </div>
      </div>

      {/* Cycle end modal */}
      {cycleModal && (
        <div className={styles.modalOverlay} onClick={dismissCycleModal}>
          <div className={styles.cycleModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.cycleModalHeader}>
              <Trophy size={32} className={styles.cycleModalTrophy} />
              <h2 className={styles.cycleModalTitle}>Ciclo Encerrado!</h2>
              <p className={styles.cycleModalGroup}>{cycleModal.groupName}</p>
            </div>

            <div className={styles.cyclePodium}>
              {cycleModal.podium.map((entry) => (
                <div key={entry.userId} className={`${styles.cyclePodiumItem} ${entry.rank === 1 ? styles.cyclePodiumFirst : ''}`}>
                  <span className={styles.cycleMedal}>{RANK_MEDAL[entry.rank]}</span>
                  <Avatar
                    alt={entry.displayName}
                    size={entry.rank === 1 ? 'md' : 'sm'}
                    fallback={entry.displayName.slice(0, 2).toUpperCase()}
                    src={entry.avatarUrl}
                  />
                  <span className={styles.cyclePodiumName}>{entry.displayName.split(' ')[0]}</span>
                  <span className={styles.cyclePodiumPts}>{entry.cyclePoints} pts</span>
                </div>
              ))}
            </div>

            {cycleModal.myRank > 0 && (
              <div className={styles.cycleMyResult}>
                Você ficou em <strong>#{cycleModal.myRank}</strong> com{' '}
                <strong style={{ color: 'var(--accent-lime)' }}>{cycleModal.myPoints} pts</strong>
              </div>
            )}

            <Button variant="primary" fullWidth onClick={dismissCycleModal}>
              Bora pro próximo ciclo! 🚀
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

async function getUserFeed(limit: number): Promise<ActivityEntry[]> {
  return api.get<ActivityEntry[]>(`/activity?limit=${limit}`);
}
