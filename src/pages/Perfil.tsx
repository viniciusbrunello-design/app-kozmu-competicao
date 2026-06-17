import { useEffect, useState } from 'react';
import { Flame, Trophy, Target, LogOut, History, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { HeatMap } from '../components/ui/HeatMap';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { ACHIEVEMENTS_META } from '../utils/achievements';
import styles from './Perfil.module.css';

const LEAGUE_CONFIG: Record<string, { label: string; color: string }> = {
  bronze:   { label: '🥉 Bronze',   color: '#cd7f32' },
  silver:   { label: '🥈 Prata',    color: '#c0c0c0' },
  gold:     { label: '🥇 Ouro',     color: '#ffd700' },
  platinum: { label: '💎 Platina',  color: '#b5e0ff' },
  cosmos:   { label: '🌌 Cosmos',   color: '#a78bfa' },
  nova:     { label: '⭐ Nova',     color: '#f59e0b' },
  orbit:    { label: '🚀 Orbit',    color: '#34d399' },
};

const LEAGUE_ORDER = ['bronze', 'silver', 'gold', 'platinum', 'cosmos', 'nova', 'orbit'];
const LEAGUE_THRESHOLDS = [0, 75, 200, 500, 1000, 2000, 5000];

export function Perfil() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [heatmap, setHeatmap] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    refreshUser();
    api.get<{ date: string; count: number }[]>('/users/me/heatmap')
      .then(setHeatmap)
      .catch(() => {});
  }, [refreshUser]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
    navigate('/login');
  }

  if (!user) return null;

  const streak = user.streak;
  const league = user.league ?? 'bronze';
  const leagueInfo = LEAGUE_CONFIG[league] ?? LEAGUE_CONFIG.bronze;
  const leagueIndex = LEAGUE_ORDER.indexOf(league);
  const nextLeague = LEAGUE_ORDER[leagueIndex + 1];
  const nextLeagueThreshold = LEAGUE_THRESHOLDS[leagueIndex + 1];
  const currentThreshold = LEAGUE_THRESHOLDS[leagueIndex];
  const leagueProgress = nextLeagueThreshold
    ? Math.min(100, Math.round(((user.totalPoints - currentThreshold) / (nextLeagueThreshold - currentThreshold)) * 100))
    : 100;

  const profileTypeLabels: Record<string, string> = {
    creator: 'Creator',
    social_media: 'Social Media',
    agency: 'Agência',
    specialist: 'Especialista',
  };

  const platformIcons: Record<string, string> = {
    instagram: '📸', tiktok: '🎵', youtube: '▶️',
    linkedin: '💼', twitter: '🐦',
  };

  return (
    <>
      <Header title="Perfil" showSettings showNotifications />
      <div className="page-content">
        <div className={styles.page}>

          {/* Profile header */}
          <Card variant="glass" className={styles.profileCard}>
            <div className={styles.profileTop}>
              <Avatar
                alt={user.displayName}
                size="xl"
                fallback={user.displayName.slice(0, 2).toUpperCase()}
                src={user.avatarUrl}
                status={streak?.currentStreak ? 'active' : undefined}
              />
              <div className={styles.profileInfo}>
                <h2 className={styles.displayName}>{user.displayName}</h2>
                <span className={styles.username}>@{user.username}</span>
                <span className={styles.profileType}>
                  {profileTypeLabels[user.profileType] ?? user.profileType}
                </span>
              </div>
            </div>

            {user.bio && <p className={styles.bio}>{user.bio}</p>}

            {user.platforms && user.platforms.length > 0 && (
              <div className={styles.platforms}>
                {user.platforms.map((p: string) => (
                  <span key={p} className={styles.platform}>
                    <span>{platformIcons[p] ?? '🌐'}</span>
                    <span>{p}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Stats */}
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <Flame size={20} className={styles.statIcon} style={{ color: 'var(--status-warning)' }} />
              <span className={styles.statValue}>{streak?.currentStreak ?? 0}</span>
              <span className={styles.statLabel}>Streak</span>
            </div>
            <div className={styles.statBox}>
              <Trophy size={20} className={styles.statIcon} style={{ color: '#ffd700' }} />
              <span className={styles.statValue}>{user.winCount}</span>
              <span className={styles.statLabel}>Vitórias</span>
            </div>
            <div className={styles.statBox}>
              <Target size={20} className={styles.statIcon} style={{ color: 'var(--accent-purple)' }} />
              <span className={styles.statValue}>{user.stats?.submissionCount ?? 0}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValueLarge}>{user.totalPoints}</span>
              <span className={styles.statLabel}>Pontos</span>
            </div>
          </div>

          {/* League */}
          <Card variant="glass" className={styles.leagueCard}>
            <div className={styles.leagueHeader}>
              <span className={styles.leagueLabel}>Liga Atual</span>
              <span className={styles.leagueName} style={{ color: leagueInfo.color }}>
                {leagueInfo.label}
              </span>
            </div>

            {nextLeague && (
              <>
                <div className={styles.leagueProgress}>
                  <span className={styles.leagueProgressText}>
                    {user.totalPoints} / {nextLeagueThreshold} pts para {LEAGUE_CONFIG[nextLeague]?.label}
                  </span>
                </div>
                <ProgressBar progress={leagueProgress} color="purple" size="sm" showValue={false} />
              </>
            )}

            {!nextLeague && (
              <p className={styles.leagueMax}>Você está na liga máxima! 🚀</p>
            )}
          </Card>

          {/* Streak details */}
          {streak && (
            <Card className={styles.streakCard}>
              <h3 className={styles.sectionTitle}>Streak</h3>
              <div className={styles.streakRow}>
                <div className={styles.streakItem}>
                  <span className={styles.streakValue}>{streak.currentStreak}</span>
                  <span className={styles.streakLabel}>Atual</span>
                </div>
                <div className={styles.streakDivider} />
                <div className={styles.streakItem}>
                  <span className={styles.streakValue}>{streak.bestStreak}</span>
                  <span className={styles.streakLabel}>Recorde</span>
                </div>
                <div className={styles.streakDivider} />
                <div className={styles.streakItem}>
                  <span className={styles.streakValue}>{streak.weeklyCount}/{streak.weeklyTarget}</span>
                  <span className={styles.streakLabel}>Esta semana</span>
                </div>
              </div>
            </Card>
          )}

          {/* Activity heatmap */}
          {heatmap.length > 0 && (
            <Card className={styles.heatmapCard}>
              <HeatMap data={heatmap} />
            </Card>
          )}

          {/* Achievements */}
          {user.achievements && (
            <Card className={styles.achievementsCard}>
              <h3 className={styles.sectionTitle}>Conquistas</h3>
              <div className={styles.achievementsGrid}>
                {ACHIEVEMENTS_META.map((meta) => {
                  const status = user.achievements!.find((a) => a.id === meta.id);
                  const unlocked = status?.unlocked ?? false;
                  return (
                    <div
                      key={meta.id}
                      className={`${styles.badge} ${unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                      title={meta.desc}
                    >
                      <span className={styles.badgeEmoji}>{meta.emoji}</span>
                      <span className={styles.badgeTitle}>{meta.title}</span>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Quick links */}
          <div className={styles.quickLinks}>
            <button className={styles.quickLink} onClick={() => navigate('/metas')}>
              <Target size={18} className={styles.quickLinkIcon} />
              <span>Minhas metas</span>
              <ChevronRight size={16} className={styles.quickLinkChevron} />
            </button>
            <button className={styles.quickLink} onClick={() => navigate('/historico')}>
              <History size={18} className={styles.quickLinkIcon} />
              <span>Histórico de publicações</span>
              <ChevronRight size={16} className={styles.quickLinkChevron} />
            </button>
          </div>

          {/* Actions */}
          <div className={styles.actions}>
            <Button
              variant="ghost"
              icon={<LogOut size={16} />}
              fullWidth
              onClick={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? 'Saindo...' : 'Sair da conta'}
            </Button>
          </div>

        </div>
      </div>
    </>
  );
}
