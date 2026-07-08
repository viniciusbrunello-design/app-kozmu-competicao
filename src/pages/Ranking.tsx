import { useEffect, useState } from 'react';
import { Trophy, Flame } from 'lucide-react';
import { SkeletonRankRow } from '../components/ui/Skeleton';
import { Header } from '../components/ui/Header';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getWeeklyRanking, getMonthlyRanking, getStreakRanking } from '../services/ranking.service';
import type { RankingEntry } from '../services/groups.service';
import styles from './Ranking.module.css';

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#b5e0ff', cosmos: '#a78bfa', nova: '#f59e0b', orbit: '#34d399',
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

type Mode = 'points' | 'count' | 'streak';

const MODE_LABELS: { value: Mode; label: string }[] = [
  { value: 'points', label: 'Pontos' },
  { value: 'count', label: 'Postagens' },
  { value: 'streak', label: 'Streak' },
];

interface DisplayEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  league: string;
  mainValue: string;
  mainColor: string;
  subValue?: string;
  currentStreak: number;
}

export function Ranking() {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>('points');
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load(): Promise<DisplayEntry[]> {
      if (mode === 'streak') {
        const data = await getStreakRanking();
        return data.map((e) => ({
          rank: e.rank,
          userId: e.userId,
          displayName: e.displayName,
          username: e.username,
          avatarUrl: e.avatarUrl,
          league: e.league,
          mainValue: `${e.currentStreak} dias`,
          mainColor: 'var(--status-warning)',
          subValue: `recorde: ${e.bestStreak}`,
          currentStreak: e.currentStreak,
        }));
      }
      const fn = period === 'weekly' ? getWeeklyRanking : getMonthlyRanking;
      const data: RankingEntry[] = await fn(undefined, mode === 'count' ? 'count' : 'points');
      return data.map((e) => ({
        rank: e.rank,
        userId: e.userId,
        displayName: e.displayName,
        username: e.username,
        avatarUrl: e.avatarUrl,
        league: e.league,
        mainValue: mode === 'count' ? `${e.submissionCount} posts` : `${e.points} pts`,
        mainColor: mode === 'count' ? 'var(--accent-blue, #3b82f6)' : 'var(--accent-lime)',
        subValue: mode === 'count' ? `${e.points} pts` : `${e.submissionCount} posts`,
        currentStreak: e.currentStreak,
      }));
    }

    load()
      .then((result) => { if (!cancelled) setEntries(result); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [mode, period]);

  const myEntry = entries.find((r) => r.userId === user?.id);

  return (
    <>
      <Header title="Ranking" showNotifications showSettings />
      <div className="page-content">
        <div className={styles.page}>

          <div className={styles.tabs}>
            {MODE_LABELS.map((m) => (
              <button
                key={m.value}
                className={`${styles.tab} ${mode === m.value ? styles.tabActive : ''}`}
                onClick={() => setMode(m.value)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode !== 'streak' && (
            <div className={styles.periodTabs}>
              <button
                className={`${styles.periodTab} ${period === 'weekly' ? styles.periodTabActive : ''}`}
                onClick={() => setPeriod('weekly')}
              >
                Semanal
              </button>
              <button
                className={`${styles.periodTab} ${period === 'monthly' ? styles.periodTabActive : ''}`}
                onClick={() => setPeriod('monthly')}
              >
                Mensal
              </button>
            </div>
          )}

          {myEntry && (
            <Card variant="glass" glow="purple" className={styles.myRankCard}>
              <div className={styles.myRankLabel}>Sua posição</div>
              <div className={styles.myRankContent}>
                <span className={styles.myRankNumber}>#{myEntry.rank}</span>
                <div className={styles.myRankStats}>
                  <span className={styles.myRankPoints} style={{ color: myEntry.mainColor }}>
                    {myEntry.mainValue}
                  </span>
                  {mode !== 'streak' && myEntry.currentStreak > 0 && (
                    <span className={styles.myRankStreak}>
                      <Flame size={13} /> {myEntry.currentStreak} dias
                    </span>
                  )}
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <Card>
              {[0, 1, 2, 3, 4].map((i) => <SkeletonRankRow key={i} />)}
            </Card>
          ) : entries.length === 0 ? (
            <Card>
              <div className={styles.empty}>
                <Trophy size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p>O ranking está vazio.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {mode === 'streak'
                    ? 'Publique hoje e comece sua sequência! 🔥'
                    : 'Registre sua primeira publicação e ocupe o topo! 🥇'}
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div className={styles.podium}>
                {entries.slice(0, 3).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`${styles.podiumItem} ${entry.rank === 1 ? styles.podiumFirst : ''}`}
                  >
                    <div className={styles.podiumMedal}>{RANK_MEDAL[entry.rank]}</div>
                    <Avatar
                      alt={entry.displayName}
                      size={entry.rank === 1 ? 'lg' : 'md'}
                      fallback={entry.displayName.slice(0, 2).toUpperCase()}
                      src={entry.avatarUrl ?? undefined}
                      status={entry.currentStreak > 0 ? 'active' : undefined}
                    />
                    <div className={styles.podiumName}>{entry.displayName.split(' ')[0]}</div>
                    <div
                      className={styles.podiumPoints}
                      style={{ color: LEAGUE_COLORS[entry.league] ?? 'var(--accent-lime)' }}
                    >
                      {entry.mainValue}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.list}>
                {entries.slice(3).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`${styles.listItem} ${entry.userId === user?.id ? styles.listItemMe : ''}`}
                  >
                    <span className={styles.listRank}>#{entry.rank}</span>
                    <Avatar
                      alt={entry.displayName}
                      size="sm"
                      fallback={entry.displayName.slice(0, 2).toUpperCase()}
                      src={entry.avatarUrl ?? undefined}
                    />
                    <div className={styles.listInfo}>
                      <span className={styles.listName}>{entry.displayName}</span>
                      <span className={styles.listMeta}>
                        @{entry.username}{entry.subValue ? ` · ${entry.subValue}` : ''}
                      </span>
                    </div>
                    <div className={styles.listRight}>
                      <span className={styles.listPoints} style={{ color: entry.mainColor }}>
                        {entry.mainValue}
                      </span>
                      {mode !== 'streak' && entry.currentStreak > 0 && (
                        <span className={styles.listStreak}>
                          <Flame size={11} /> {entry.currentStreak}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
