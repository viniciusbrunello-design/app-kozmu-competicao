import { useEffect, useState } from 'react';
import { Trophy, Flame, TrendingUp } from 'lucide-react';
import { SkeletonRankRow } from '../components/ui/Skeleton';
import { Header } from '../components/ui/Header';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { getWeeklyRanking, getMonthlyRanking } from '../services/ranking.service';
import type { RankingEntry } from '../services/groups.service';
import styles from './Ranking.module.css';

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#b5e0ff', cosmos: '#a78bfa', nova: '#f59e0b', orbit: '#34d399',
};

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

export function Ranking() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fn = period === 'weekly' ? getWeeklyRanking : getMonthlyRanking;
    fn().then(setRanking).catch(console.error).finally(() => setLoading(false));
  }, [period]);

  const myEntry = ranking.find((r) => r.userId === user?.id);

  return (
    <>
      <Header title="Ranking" showNotifications />
      <div className="page-content">
        <div className={styles.page}>

          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${period === 'weekly' ? styles.tabActive : ''}`}
              onClick={() => setPeriod('weekly')}
            >
              Semanal
            </button>
            <button
              className={`${styles.tab} ${period === 'monthly' ? styles.tabActive : ''}`}
              onClick={() => setPeriod('monthly')}
            >
              Mensal
            </button>
          </div>

          {myEntry && (
            <Card variant="glass" glow="purple" className={styles.myRankCard}>
              <div className={styles.myRankLabel}>Sua posição</div>
              <div className={styles.myRankContent}>
                <span className={styles.myRankNumber}>#{myEntry.rank}</span>
                <div className={styles.myRankStats}>
                  <span className={styles.myRankPoints}>{myEntry.points} pts</span>
                  <span className={styles.myRankStreak}>
                    <Flame size={13} /> {myEntry.currentStreak} dias
                  </span>
                </div>
              </div>
            </Card>
          )}

          {loading ? (
            <Card>
              {[0, 1, 2, 3, 4].map((i) => <SkeletonRankRow key={i} />)}
            </Card>
          ) : ranking.length === 0 ? (
            <Card>
              <div className={styles.empty}>
                <Trophy size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                <p>O ranking está vazio.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Registre sua primeira prova e ocupe o topo! 🥇
                </p>
              </div>
            </Card>
          ) : (
            <>
              {ranking.slice(0, 3).length > 0 && (
                <div className={styles.podium}>
                  {ranking.slice(0, 3).map((entry) => (
                    <div
                      key={entry.userId}
                      className={`${styles.podiumItem} ${entry.rank === 1 ? styles.podiumFirst : ''}`}
                    >
                      <div className={styles.podiumMedal}>{RANK_MEDAL[entry.rank]}</div>
                      <Avatar
                        alt={entry.displayName}
                        size={entry.rank === 1 ? 'lg' : 'md'}
                        fallback={entry.displayName.slice(0, 2).toUpperCase()}
                        src={entry.avatarUrl}
                        status={entry.currentStreak > 0 ? 'active' : undefined}
                      />
                      <div className={styles.podiumName}>{entry.displayName.split(' ')[0]}</div>
                      <div
                        className={styles.podiumPoints}
                        style={{ color: LEAGUE_COLORS[entry.league] ?? 'var(--accent-lime)' }}
                      >
                        {entry.points} pts
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.list}>
                {ranking.slice(3).map((entry) => (
                  <div
                    key={entry.userId}
                    className={`${styles.listItem} ${entry.userId === user?.id ? styles.listItemMe : ''}`}
                  >
                    <span className={styles.listRank}>#{entry.rank}</span>
                    <Avatar
                      alt={entry.displayName}
                      size="sm"
                      fallback={entry.displayName.slice(0, 2).toUpperCase()}
                      src={entry.avatarUrl}
                    />
                    <div className={styles.listInfo}>
                      <span className={styles.listName}>{entry.displayName}</span>
                      <span className={styles.listMeta}>
                        @{entry.username} · {entry.submissionCount} posts
                      </span>
                    </div>
                    <div className={styles.listRight}>
                      <span className={styles.listPoints}>{entry.points} pts</span>
                      {entry.currentStreak > 0 && (
                        <span className={styles.listStreak}>
                          <Flame size={11} /> {entry.currentStreak}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {ranking.length === 0 && (
                <div className={styles.empty}>
                  <TrendingUp size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                  <p>Sem dados para este período.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
