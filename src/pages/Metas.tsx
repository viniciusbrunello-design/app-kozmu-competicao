import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { getMyGoals, createGoal, deleteGoal } from '../services/goals.service';
import type { UserGoal } from '../services/goals.service';
import styles from './Metas.module.css';

const FORMAT_EMOJI: Record<string, string> = {
  reel: '🎬', carousel: '🖼️', feed: '📷', live: '🔴', linkedin: '💼',
  story: '⭕', podcast: '🎙️', other: '📌',
};

const PRESETS = [
  {
    label: '30 posts em 30 dias',
    data: () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 30);
      return { title: '30 posts em 30 dias', targetCount: 30, startDate: start.toISOString(), endDate: end.toISOString() };
    },
  },
  {
    label: '4 Reels por semana (8 semanas)',
    data: () => {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + 56);
      return { title: '4 Reels por semana por 2 meses', targetCount: 32, format: 'reel', startDate: start.toISOString(), endDate: end.toISOString() };
    },
  },
  {
    label: '20 posts este mês',
    data: () => {
      const start = new Date();
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      return { title: '20 posts este mês', targetCount: 20, startDate: start.toISOString(), endDate: end.toISOString() };
    },
  },
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function Metas() {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [customTitle, setCustomTitle] = useState('');
  const [customCount, setCustomCount] = useState('');
  const [customDays, setCustomDays] = useState('30');
  const [customFormat, setCustomFormat] = useState('');

  useEffect(() => {
    getMyGoals().then(setGoals).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handlePreset(preset: typeof PRESETS[number]) {
    setSaving(true);
    setError('');
    try {
      const goal = await createGoal(preset.data());
      setGoals((prev) => [...prev, { ...goal, progress: 0, percentage: 0, isActive: true }]);
      setModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar meta');
    } finally {
      setSaving(false);
    }
  }

  async function handleCustomCreate() {
    if (!customTitle || !customCount) return;
    setSaving(true);
    setError('');
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + Number(customDays));
      const goal = await createGoal({
        title: customTitle,
        targetCount: Number(customCount),
        format: customFormat || undefined,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setGoals((prev) => [...prev, { ...goal, progress: 0, percentage: 0, isActive: true }]);
      setModal(false);
      setCustomTitle(''); setCustomCount(''); setCustomDays('30'); setCustomFormat('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar meta');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta meta?')) return;
    await deleteGoal(id).catch(() => {});
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  const active = goals.filter((g) => g.isActive && !g.completed);
  const done = goals.filter((g) => !g.isActive || g.completed);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Minhas Metas</h1>
        <button className={styles.addBtn} onClick={() => { setModal(true); setError(''); }}>
          <Plus size={20} />
        </button>
      </header>

      <div className={styles.content}>
        {loading && <p className={styles.empty}>Carregando metas...</p>}

        {!loading && goals.length === 0 && (
          <Card variant="glass">
            <div className={styles.emptyState}>
              <Target size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <p>Nenhuma meta criada ainda.</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Crie sua primeira meta e acompanhe seu progresso!
              </p>
              <Button variant="primary" onClick={() => setModal(true)} style={{ marginTop: 12 }}>
                Criar meta
              </Button>
            </div>
          </Card>
        )}

        {active.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>Em andamento</h2>
            {active.map((goal) => (
              <Card key={goal.id} variant="glass" className={styles.goalCard}>
                <div className={styles.goalHeader}>
                  <div>
                    <p className={styles.goalTitle}>{goal.title}</p>
                    {goal.format && (
                      <span className={styles.goalFormat}>
                        {FORMAT_EMOJI[goal.format] ?? '📝'} {goal.format}
                      </span>
                    )}
                  </div>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(goal.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className={styles.goalDates}>
                  {formatDate(goal.startDate)} → {formatDate(goal.endDate)}
                </div>
                <div className={styles.goalProgress}>
                  <span>{goal.progress}/{goal.targetCount} posts</span>
                  <span className={styles.pct}>{goal.percentage}%</span>
                </div>
                <ProgressBar progress={goal.percentage} color="purple" size="sm" showValue={false} />
              </Card>
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            <h2 className={styles.sectionTitle}>Concluídas / Encerradas</h2>
            {done.map((goal) => (
              <Card key={goal.id} className={styles.goalCard} style={{ opacity: 0.65 }}>
                <div className={styles.goalHeader}>
                  <p className={styles.goalTitle}>
                    {goal.completed ? '✅ ' : ''}{goal.title}
                  </p>
                  <button className={styles.deleteBtn} onClick={() => handleDelete(goal.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className={styles.goalProgress}>
                  <span>{goal.progress}/{goal.targetCount} posts</span>
                  <span className={styles.pct}>{goal.percentage}%</span>
                </div>
                <ProgressBar progress={goal.percentage} color="purple" size="sm" showValue={false} />
              </Card>
            ))}
          </>
        )}
      </div>

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Nova Meta</h2>

            {error && <div className={styles.modalError}>{error}</div>}

            <p className={styles.modalSubtitle}>Escolha uma meta pronta:</p>
            {PRESETS.map((p) => (
              <button key={p.label} className={styles.presetBtn} onClick={() => handlePreset(p)} disabled={saving}>
                {p.label}
              </button>
            ))}

            <div className={styles.divider}><span>ou crie sua própria</span></div>

            <div className={styles.field}>
              <label className={styles.label}>Título</label>
              <input className={styles.input} type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Ex: 10 Lives este mês" />
            </div>
            <div className={styles.row}>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Qtd. de posts</label>
                <input className={styles.input} type="number" min={1} value={customCount} onChange={(e) => setCustomCount(e.target.value)} placeholder="30" />
              </div>
              <div className={styles.field} style={{ flex: 1 }}>
                <label className={styles.label}>Dias</label>
                <input className={styles.input} type="number" min={1} value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Formato (opcional)</label>
              <select className={styles.input} value={customFormat} onChange={(e) => setCustomFormat(e.target.value)}>
                <option value="">Qualquer formato</option>
                <option value="reel">🎬 Reel</option>
                <option value="carousel">🖼️ Carrossel</option>
                <option value="feed">📷 Post de Feed</option>
                <option value="live">🔴 Live</option>
                <option value="linkedin">💼 LinkedIn</option>
                <option value="story">⭕ Story</option>
                <option value="podcast">🎙️ Podcast</option>
              </select>
            </div>

            <Button variant="primary" fullWidth onClick={handleCustomCreate} disabled={saving || !customTitle || !customCount}>
              {saving ? 'Criando...' : 'Criar meta'}
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setModal(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
