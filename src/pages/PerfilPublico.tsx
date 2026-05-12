import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { ACHIEVEMENTS_META } from '../utils/achievements';
import styles from './PerfilPublico.module.css';

const LEAGUE_CONFIG: Record<string, { label: string; color: string }> = {
  bronze:   { label: '🥉 Bronze',  color: '#cd7f32' },
  silver:   { label: '🥈 Prata',   color: '#c0c0c0' },
  gold:     { label: '🥇 Ouro',    color: '#ffd700' },
  platinum: { label: '💎 Platina', color: '#b5e0ff' },
  cosmos:   { label: '🌌 Cosmos',  color: '#a78bfa' },
  nova:     { label: '⭐ Nova',    color: '#f59e0b' },
  orbit:    { label: '🚀 Orbit',   color: '#34d399' },
};

const PROFILE_TYPE_LABELS: Record<string, string> = {
  creator: 'Creator',
  social_media: 'Social Media',
  agency: 'Agência',
  specialist: 'Especialista',
};

interface PublicProfile {
  id: string;
  username: string;
  displayName: string;
  bio?: string;
  profileType: string;
  avatarUrl?: string;
  totalPoints: number;
  league: string;
  winCount: number;
  createdAt: string;
  streak: {
    currentStreak: number;
    bestStreak: number;
    weeklyCount: number;
    weeklyTarget: number;
    catchUpTokens: number;
    atRisk: boolean;
  };
  submissionCount: number;
  activeDays: number;
  achievements: { id: string; unlocked: boolean }[];
}

export function PerfilPublico() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!username) return;
    api.get<PublicProfile>(`/users/${username}`)
      .then(setProfile)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) {
    return (
      <div className="mobile-container">
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <div className={styles.skeletonTitle} />
        </header>
        <div className="page-content">
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mobile-container">
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <span className={styles.headerTitle}>Perfil</span>
        </header>
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ color: 'var(--text-secondary)' }}>Usuário não encontrado.</p>
        </div>
      </div>
    );
  }

  const league = profile.league ?? 'bronze';
  const leagueInfo = LEAGUE_CONFIG[league] ?? LEAGUE_CONFIG.bronze;

  return (
    <div className="mobile-container">
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <span className={styles.headerTitle}>@{profile.username}</span>
      </header>

      <div className="page-content">
        <div className={styles.page}>

          <Card variant="glass" className={styles.profileCard}>
            <div className={styles.profileTop}>
              <Avatar
                alt={profile.displayName}
                size="xl"
                fallback={profile.displayName.slice(0, 2).toUpperCase()}
                src={profile.avatarUrl}
                status={profile.streak.currentStreak > 0 ? 'active' : undefined}
              />
              <div className={styles.profileInfo}>
                <h2 className={styles.displayName}>{profile.displayName}</h2>
                <span className={styles.username}>@{profile.username}</span>
                <span className={styles.profileType}>
                  {PROFILE_TYPE_LABELS[profile.profileType] ?? profile.profileType}
                </span>
              </div>
            </div>
            {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
            <span className={styles.leagueBadge} style={{ color: leagueInfo.color }}>
              {leagueInfo.label}
            </span>
          </Card>

          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <Flame size={18} style={{ color: 'var(--status-warning)' }} />
              <span className={styles.statValue}>{profile.streak.currentStreak}</span>
              <span className={styles.statLabel}>Streak</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{profile.streak.bestStreak}</span>
              <span className={styles.statLabel}>Recorde</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{profile.submissionCount}</span>
              <span className={styles.statLabel}>Posts</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statValue}>{profile.activeDays}</span>
              <span className={styles.statLabel}>Dias ativos</span>
            </div>
          </div>

          <Card className={styles.achievementsCard}>
            <h3 className={styles.sectionTitle}>Conquistas</h3>
            <div className={styles.achievementsGrid}>
              {ACHIEVEMENTS_META.map((meta) => {
                const status = profile.achievements.find((a) => a.id === meta.id);
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

        </div>
      </div>
    </div>
  );
}
