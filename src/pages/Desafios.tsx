import { useEffect, useState } from 'react';
import { Target, Plus, CheckCircle } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { ProgressBar } from '../components/ui/ProgressBar';
import { getMyChallenges } from '../services/challenges.service';
import type { Challenge } from '../services/challenges.service';
import styles from './Desafios.module.css';

const TYPE_LABELS: Record<string, string> = {
  consistency: 'Constância',
  volume: 'Volume',
  format_specific: 'Formato',
  multichannel: 'Multicanal',
  campaign: 'Campanha',
  duel: 'Duelo',
  squad_battle: 'Squad Battle',
};

const PROGRESS_COLOR: (pct: number) => 'lime' | 'blue' | 'purple' = (pct) => {
  if (pct >= 100) return 'lime';
  if (pct >= 50) return 'blue';
  return 'purple';
};

export function Desafios() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyChallenges().then(setChallenges).catch(console.error).finally(() => setLoading(false));
  }, []);

  const active = challenges.filter((c) => c.isActive && !c.myCompleted);
  const completed = challenges.filter((c) => c.myCompleted);

  return (
    <>
      <Header title="Desafios" showNotifications />
      <div className="page-content">
        <div className={styles.page}>

          {loading && <div className={styles.empty}>Carregando desafios...</div>}

          {!loading && challenges.length === 0 && (
            <Card variant="glass">
              <div className={styles.empty}>
                <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p>Nenhum desafio ativo.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Entre em um grupo — é lá que a competição esquenta! 🏆
                </p>
              </div>
            </Card>
          )}

          {active.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Ativos</h3>
              {active.map((c) => (
                <ChallengeCard key={c.id} challenge={c} />
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Concluídos</h3>
              {completed.map((c) => (
                <ChallengeCard key={c.id} challenge={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ChallengeCard({ challenge: c }: { challenge: Challenge }) {
  const color = PROGRESS_COLOR(c.progressPercent);

  return (
    <Card variant={c.myCompleted ? 'default' : 'glass'} className={styles.challengeCard}>
      <div className={styles.challengeHeader}>
        <div className={styles.challengeInfo}>
          <div className={styles.challengeMeta}>
            <span className={styles.challengeType}>{TYPE_LABELS[c.type] ?? c.type}</span>
            {c.daysLeft > 0 ? (
              <span className={styles.daysLeft}>{c.daysLeft}d restantes</span>
            ) : (
              <span className={styles.expired}>Encerrado</span>
            )}
          </div>
          <h4 className={styles.challengeTitle}>{c.title}</h4>
          <p className={styles.challengeDesc}>{c.description}</p>
        </div>
        {c.myCompleted && (
          <CheckCircle size={24} className={styles.completedIcon} />
        )}
      </div>

      <div className={styles.progressSection}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>Progresso</span>
          <span className={styles.progressValue}>
            {c.myProgress}/{c.targetCount}
            {c.format && ` ${c.format}`}
          </span>
        </div>
        <ProgressBar
          progress={c.progressPercent}
          color={color}
          size="md"
          showValue={false}
        />
      </div>

      <div className={styles.challengeFooter}>
        <span className={styles.participantCount}>
          <Plus size={12} /> {c.participantCount} participantes
        </span>
        {c.myCompleted && (
          <span className={styles.completedLabel}>✅ Concluído</span>
        )}
      </div>
    </Card>
  );
}
