import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trophy, Zap, Shield, ChevronRight } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import type { UserGoal } from '../services/goals.service';
import styles from './Home.module.css';

// --------------- Calendar ---------------
function MiniCalendar({ heatmap }: { heatmap: { date: string; count: number }[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const today = now.getDate();

  const activeSet = new Set(heatmap.filter((d) => d.count > 0).map((d) => d.date));

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const raw = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const monthLabel = raw.charAt(0).toUpperCase() + raw.slice(1);

  return (
    <Card className={styles.calendar}>
      <p className={styles.calendarTitle}>{monthLabel}</p>
      <div className={styles.calendarGrid}>
        {weekDays.map((w, i) => (
          <div key={i} className={styles.calendarWeekDay}>{w}</div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isActive = activeSet.has(dateStr);
          const isToday = day === today;
          return (
            <div
              key={dateStr}
              className={[
                styles.calendarDay,
                isActive ? styles.calendarDayActive : '',
                isToday && !isActive ? styles.calendarDayToday : '',
              ].filter(Boolean).join(' ')}
            >
              {day}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// --------------- Types ---------------
interface MyGroup {
  id: string;
  name: string;
  emoji?: string;
  currentCycleEnd: string;
  isActive: boolean;
}

interface CycleResult {
  groupId: string;
  groupName: string;
  cycleEnd: string;
  isEnded?: boolean;
  podium: {
    rank: number;
    userId: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
    league: string;
    cyclePoints: number;
  }[];
  myRank: number;
  myPoints: number;
  totalMembers: number;
}

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// --------------- Daily Mission ---------------
const DAILY_MISSIONS = [
  { emoji: '🎬', title: 'Poste um Reel hoje', desc: 'Reels têm o maior alcance. Aproveite o algoritmo!', format: 'reel' },
  { emoji: '🖼️', title: 'Suba um Carrossel', desc: 'Carrosséis educam e engajam. Qual conhecimento você compartilha?', format: 'carousel' },
  { emoji: '🔴', title: 'Faça uma Live hoje', desc: 'Lives constroem conexão real. Apareça ao vivo!', format: 'live' },
  { emoji: '💼', title: 'Publique no LinkedIn', desc: 'Seu network profissional está esperando por você.', format: 'linkedin' },
  { emoji: '📷', title: 'Poste no Feed', desc: 'Consistência no feed aumenta sua autoridade.', format: 'feed' },
  { emoji: '⭕', title: 'Story de bastidores', desc: 'Mostre o processo. Stories aproximam sua audiência.', format: 'story' },
  { emoji: '🚀', title: 'Publique em 2 formatos', desc: 'Diversifique! Quanto mais formatos, mais pontos.', format: null },
];

const PLATFORM_FORMATS: Record<string, string[]> = {
  instagram: ['reel', 'carousel', 'feed', 'story'],
  tiktok: ['reel'],
  youtube: ['reel', 'live', 'feed'],
  linkedin: ['linkedin'],
  twitter: ['feed'],
};

function getDailyMission(platforms: string[] = []) {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  if (platforms.length > 0) {
    const supported = new Set<string>();
    for (const p of platforms)
      for (const fmt of PLATFORM_FORMATS[p] ?? []) supported.add(fmt);
    const filtered = DAILY_MISSIONS.filter((m) => m.format === null || supported.has(m.format));
    const pool = filtered.length > 0 ? filtered : DAILY_MISSIONS;
    return pool[dayOfYear % pool.length];
  }
  return DAILY_MISSIONS[dayOfYear % DAILY_MISSIONS.length];
}

// --------------- Component ---------------
export function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [cycleModal, setCycleModal] = useState<CycleResult | null>(null);
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);
  const [activeGoal, setActiveGoal] = useState<UserGoal | null>(null);
  const [myGroups, setMyGroups] = useState<MyGroup[]>([]);

  useEffect(() => {
    Promise.all([
      api
        .get<{ notifications: unknown[]; unreadCount: number }>('/notifications?unread=true')
        .then((r) => setUnreadCount(r.unreadCount))
        .catch(() => {}),
      api.get<{ date: string; count: number }[]>('/users/me/heatmap').then(setHeatmap).catch(() => {}),
      api
        .get<UserGoal[]>('/goals')
        .then((goals) => setActiveGoal(goals.find((g) => g.isActive && !g.completed) ?? null))
        .catch(() => {}),
      api.get<MyGroup[]>('/groups').then(setMyGroups).catch(() => {}),
    ]);
    checkEndedCycles();
  }, []);

  async function checkEndedCycles() {
    try {
      const groups = await api.get<MyGroup[]>('/groups');
      const ended = groups.find((g) => new Date(g.currentCycleEnd) < new Date());
      if (!ended) return;
      const key = `cycle_dismissed_${ended.id}_${ended.currentCycleEnd}`;
      if (sessionStorage.getItem(key)) return;
      const result = await api.get<CycleResult>(`/groups/${ended.id}/cycle-result`);
      if (result.isEnded) setCycleModal(result);
    } catch { /* ignore */ }
  }

  function dismissCycleModal() {
    if (!cycleModal) return;
    sessionStorage.setItem(`cycle_dismissed_${cycleModal.groupId}_${cycleModal.cycleEnd}`, '1');
    setCycleModal(null);
  }

  function daysRemaining(cycleEnd: string): number {
    return Math.max(0, Math.ceil((new Date(cycleEnd).getTime() - Date.now()) / 86400000));
  }

  // Derived values
  const streak = user?.streak;
  const currentStreak = streak?.currentStreak ?? 0;
  const bestStreak = streak?.bestStreak ?? 0;
  const weeklyCount = streak?.weeklyCount ?? 0;
  const weeklyTarget = streak?.weeklyTarget ?? 5;
  const weeklyProgress = Math.min(100, Math.round((weeklyCount / weeklyTarget) * 100));
  const shields = (streak as { catchUpTokens?: number } | undefined)?.catchUpTokens ?? 0;
  const totalPosts = user?.stats?.submissionCount ?? 0;

  const last30Days = heatmap.slice(-30);
  const consistency = last30Days.length
    ? Math.round((last30Days.filter((d) => d.count > 0).length / last30Days.length) * 100)
    : 0;

  const MILESTONES: Record<number, string> = {
    7: '7 dias consecutivos! Uma semana de constância.',
    14: '14 dias! Duas semanas sem parar — incrível!',
    21: '21 dias! Você criou um hábito de verdade!',
    30: '30 dias! Um mês de consistência. Lendário!',
    60: '60 dias! Você é uma máquina de conteúdo!',
    100: '100 dias!! Você está em órbita, criador(a)!',
  };
  const milestoneMsg = MILESTONES[currentStreak] ?? null;
  const isNewRecord = currentStreak > 1 && currentStreak === bestStreak;
  const last3Empty = heatmap.length >= 3 && heatmap.slice(-3).every((d) => d.count === 0);
  const showComeback = last3Empty && currentStreak === 0 && heatmap.length > 0;

  const firstName = user?.displayName?.split(' ')[0] ?? user?.username ?? '...';
  const dailyMission = getDailyMission(user?.platforms ?? []);

  // Achievement banner priority: milestone > comeback > new record
  const achievement = milestoneMsg
    ? { icon: '🏅', title: 'Você desbloqueou um selo!', desc: milestoneMsg }
    : showComeback
    ? { icon: '👋', title: 'Está sumido!', desc: 'Faz alguns dias sem publicar. Volte à órbita — seu público está esperando!' }
    : isNewRecord
    ? { icon: '⭐', title: 'Novo recorde pessoal!', desc: `${currentStreak} dias consecutivos — você está no seu melhor streak de todos os tempos!` }
    : streak?.atRisk
    ? { icon: '⚠️', title: 'Streak em risco!', desc: 'Publique hoje para não perder seu streak.' }
    : null;

  return (
    <>
      <Header showNotifications hasUnreadNotif={unreadCount > 0} showSettings />

      <div className="page-content">
        <div className={styles.home}>

          {/* Greeting */}
          <div className={styles.greetingRow}>
            <h1 className={styles.greeting}>Olá, {firstName} 👋</h1>
            <Avatar
              alt={user?.displayName ?? ''}
              size="md"
              fallback={(user?.displayName ?? '??').slice(0, 2).toUpperCase()}
              src={user?.avatarUrl}
              status={streak?.atRisk ? 'danger' : currentStreak > 0 ? 'active' : undefined}
            />
          </div>

          {/* Streak card */}
          <div className={styles.streakCard}>
            <div className={styles.streakLeft}>
              <span className={styles.streakNumber}>{currentStreak}</span>
              <span className={styles.streakSubLabel}>
                dias consecutivos 🔥
              </span>
              {shields > 0 && (
                <span className={styles.shieldTag}>
                  <Shield size={11} /> {shields} escudo{shields > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className={styles.streakSep} />
            <div className={styles.streakRight}>
              <span className={styles.recordLabel}>recorde pessoal</span>
              <span className={styles.recordValue}>{bestStreak} dias</span>
              {isNewRecord && (
                <span className={styles.newRecordTag}>⭐ novo!</span>
              )}
            </div>
          </div>

          {/* Stats grid — 2 cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statNumber}>{totalPosts}</span>
              <span className={styles.statCaption}>check-ins totais</span>
            </div>
            <div className={styles.statCard}>
              <span
                className={styles.statNumber}
                style={{ color: consistency >= 70 ? 'var(--accent-lime)' : 'var(--text-primary)' }}
              >
                {consistency}%
              </span>
              <span className={styles.statCaption}>constância (30d)</span>
            </div>
          </div>

          {/* Monthly calendar — sempre visível, dias ativos preenchidos quando heatmap carrega */}
          <MiniCalendar heatmap={heatmap} />

          {/* Achievement / notification banner */}
          {achievement && (
            <div className={styles.achievementBanner}>
              <span className={styles.achievementIcon}>{achievement.icon}</span>
              <div className={styles.achievementText}>
                <span className={styles.achievementTitle}>{achievement.title}</span>
                <span className={styles.achievementDesc}>{achievement.desc}</span>
              </div>
            </div>
          )}

          {/* Meus Grupos */}
          {myGroups.filter((g) => g.isActive !== false).length > 0 && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>MEUS GRUPOS</p>
              <Card>
                {myGroups.filter((g) => g.isActive !== false).map((g, i, arr) => (
                  <button
                    key={g.id}
                    className={`${styles.groupRow} ${i < arr.length - 1 ? styles.groupRowBorder : ''}`}
                    onClick={() => navigate(`/grupos/${g.id}`)}
                  >
                    <span className={styles.groupEmoji}>{g.emoji || '🏆'}</span>
                    <div className={styles.groupInfo}>
                      <span className={styles.groupName}>{g.name}</span>
                      <span className={styles.groupSub}>{daysRemaining(g.currentCycleEnd)} dias restantes</span>
                    </div>
                    <ChevronRight size={16} className={styles.groupChevron} />
                  </button>
                ))}
              </Card>
            </div>
          )}

          {/* Missão do Dia */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Missão do Dia</h3>
              <span className={styles.missionBadge}><Zap size={11} /> Hoje</span>
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

          {/* Meta Semanal (compact) */}
          <Card>
            <div className={styles.weeklyRow}>
              <span className={styles.weeklyLabel}>Meta Semanal</span>
              <span className={styles.weeklyCount}>{weeklyCount}/{weeklyTarget}</span>
            </div>
            <ProgressBar progress={weeklyProgress} color="blue" size="sm" showValue={false} />
            <p className={styles.weeklyHint}>
              {weeklyCount >= weeklyTarget
                ? '🎉 Meta batida! +1 escudo ganho'
                : `Faltam ${weeklyTarget - weeklyCount} posts para fechar a semana`}
            </p>
          </Card>

          {/* Meta pessoal ativa */}
          {activeGoal && (
            <Card onClick={() => navigate('/metas')} style={{ cursor: 'pointer' }}>
              <div className={styles.weeklyRow}>
                <span className={styles.weeklyLabel}>{activeGoal.title}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-purple)' }}>
                  {activeGoal.percentage}%
                </span>
              </div>
              <ProgressBar progress={activeGoal.percentage} color="purple" size="sm" showValue={false} />
            </Card>
          )}

          {/* CTA */}
          <Button variant="primary" fullWidth icon={<Plus size={18} />} onClick={() => navigate('/registrar')}>
            Registrar Publicação
          </Button>

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
                <div
                  key={entry.userId}
                  className={`${styles.cyclePodiumItem} ${entry.rank === 1 ? styles.cyclePodiumFirst : ''}`}
                >
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
