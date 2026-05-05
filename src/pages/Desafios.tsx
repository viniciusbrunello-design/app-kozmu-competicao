import { useEffect, useState } from 'react';
import { Target, Plus, CheckCircle, X } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { getMyChallenges, createChallenge } from '../services/challenges.service';
import type { Challenge } from '../services/challenges.service';
import styles from './Desafios.module.css';

const TYPE_LABELS: Record<string, string> = {
  consistency: '🔁 Constância',
  volume: '📈 Volume',
  format_specific: '🎯 Formato',
  multichannel: '🌐 Multicanal',
  campaign: '🚀 Campanha',
  duel: '⚔️ Duelo',
  squad_battle: '🏆 Squad Battle',
};

const DURATION_OPTIONS = [
  { label: '7 dias', days: 7 },
  { label: '14 dias', days: 14 },
  { label: '30 dias', days: 30 },
];

const PROGRESS_COLOR: (pct: number) => 'lime' | 'blue' | 'purple' = (pct) => {
  if (pct >= 100) return 'lime';
  if (pct >= 50) return 'blue';
  return 'purple';
};

export function Desafios() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'consistency',
    targetCount: 10,
    duration: 14,
  });

  useEffect(() => {
    getMyChallenges().then(setChallenges).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const now = new Date();
      const end = new Date(now.getTime() + form.duration * 24 * 60 * 60 * 1000);
      const challenge = await createChallenge({
        title: form.title,
        description: form.description,
        type: form.type,
        targetCount: form.targetCount,
        startDate: now.toISOString(),
        endDate: end.toISOString(),
      });
      setChallenges((prev) => [challenge, ...prev]);
      setModal(false);
      setForm({ title: '', description: '', type: 'consistency', targetCount: 10, duration: 14 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar desafio');
    } finally {
      setSubmitting(false);
    }
  }

  const active = challenges.filter((c) => c.isActive && !c.myCompleted);
  const completed = challenges.filter((c) => c.myCompleted);

  return (
    <>
      <Header title="Desafios" showNotifications />
      <div className="page-content">
        <div className={styles.page}>

          <div className={styles.topRow}>
            <p className={styles.subtitle}>
              Metas pessoais de publicação com prazo e acompanhamento de progresso.
            </p>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setModal(true); setError(''); }}>
              Criar
            </Button>
          </div>

          {loading && <div className={styles.empty}>Carregando desafios...</div>}

          {!loading && challenges.length === 0 && (
            <Card variant="glass">
              <div className={styles.empty}>
                <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p>Nenhum desafio ativo ainda.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                  Crie um desafio pessoal — defina uma meta de publicações e acompanhe seu progresso.
                </p>
              </div>
            </Card>
          )}

          {active.length > 0 && (
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Em andamento</h3>
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

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Novo Desafio</h2>
              <button className={styles.closeBtn} onClick={() => setModal(false)}>
                <X size={20} />
              </button>
            </div>

            {error && <div className={styles.modalError}>{error}</div>}

            <form onSubmit={handleCreate} className={styles.modalForm}>
              <div className={styles.field}>
                <label className={styles.label}>Título</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: 30 posts em 30 dias"
                  required
                  minLength={3}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Descrição</label>
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="O que você quer alcançar com esse desafio?"
                  required
                  minLength={10}
                  rows={2}
                />
              </div>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Meta (posts)</label>
                  <input
                    className={styles.input}
                    type="number"
                    min={1}
                    max={365}
                    value={form.targetCount}
                    onChange={(e) => setForm((f) => ({ ...f, targetCount: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Duração</label>
                  <select
                    className={styles.input}
                    value={form.duration}
                    onChange={(e) => setForm((f) => ({ ...f, duration: Number(e.target.value) }))}
                  >
                    {DURATION_OPTIONS.map((d) => (
                      <option key={d.days} value={d.days}>{d.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Tipo</label>
                <div className={styles.typeGrid}>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`${styles.typeChip} ${form.type === value ? styles.typeActive : ''}`}
                      onClick={() => setForm((f) => ({ ...f, type: value }))}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                {submitting ? 'Criando...' : 'Criar Desafio'}
              </Button>
              <Button type="button" variant="ghost" fullWidth onClick={() => setModal(false)}>
                Cancelar
              </Button>
            </form>
          </div>
        </div>
      )}
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
            {c.myProgress}/{c.targetCount} posts
          </span>
        </div>
        <ProgressBar progress={c.progressPercent} color={color} size="md" showValue={false} />
      </div>

      {c.myCompleted && (
        <div className={styles.challengeFooter}>
          <span className={styles.completedLabel}>✅ Concluído</span>
        </div>
      )}
    </Card>
  );
}
