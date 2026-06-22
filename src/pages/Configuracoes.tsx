import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { api } from '../services/api';
import styles from './Configuracoes.module.css';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X (Twitter)' },
];

const PROFILE_TYPES = [
  { value: 'creator', label: 'Creator' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'specialist', label: 'Especialista' },
  { value: 'agency', label: 'Agência' },
];

export function Configuracoes() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [profileType, setProfileType] = useState('creator');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [weeklyTargetInput, setWeeklyTargetInput] = useState('5');
  const [targetSaving, setTargetSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName ?? '');
      setUsername(user.username ?? '');
      setBio(user.bio ?? '');
      setProfileType(user.profileType ?? 'creator');
      setPlatforms(Array.isArray(user.platforms) ? user.platforms : []);
      const wt = user.streak?.weeklyTarget ?? 5;
      setWeeklyTarget(wt);
      setWeeklyTargetInput(String(wt));
    }
  }, [user]);

  function togglePlatform(id: string) {
    setPlatforms((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]);
  }

  async function handleSelectTarget(target: number) {
    setWeeklyTarget(target);
    setTargetSaving(true);
    try {
      await api.put('/users/me/weekly-target', { weeklyTarget: target });
      await refreshUser();
    } catch { /* silently ignore — UI already reflects selection */ } finally {
      setTargetSaving(false);
    }
  }

  async function handleSave() {
    setError('');
    setLoading(true);
    try {
      await api.put('/users/me', { displayName, username, bio, profileType, platforms });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Configurações</h1>
      </header>

      <div className={styles.content}>
        {error && <div className={styles.error}>{error}</div>}
        {saved && (
          <div className={styles.success}>
            <Check size={16} /> Salvo com sucesso!
          </div>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Informações pessoais</h2>

          <div className={styles.field}>
            <label className={styles.label}>Nome de exibição</label>
            <input
              className={styles.input}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputPrefix}>
              <span className={styles.prefix}>@</span>
              <input
                className={styles.inputWithPrefix}
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="seuusername"
                maxLength={30}
              />
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Fale um pouco sobre você..."
              rows={3}
              maxLength={200}
            />
            <span className={styles.charCount}>{bio.length}/200</span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Tipo de perfil</h2>
          <div className={styles.typeGrid}>
            {PROFILE_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                className={`${styles.typeChip} ${profileType === pt.value ? styles.typeActive : ''}`}
                onClick={() => setProfileType(pt.value)}
              >
                {pt.label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Meta Semanal</h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
            Quantas publicações você quer fazer por semana?
          </p>
          <div className={styles.weeklyTargetRow}>
            <input
              type="number"
              min={1}
              max={31}
              value={weeklyTargetInput}
              onChange={(e) => setWeeklyTargetInput(e.target.value)}
              onBlur={() => {
                const v = parseInt(weeklyTargetInput, 10);
                if (!isNaN(v) && v >= 1) {
                  handleSelectTarget(v);
                } else {
                  setWeeklyTargetInput(String(weeklyTarget));
                }
              }}
              className={styles.weeklyTargetInput}
              disabled={targetSaving}
            />
            <span className={styles.weeklyTargetLabel}>
              {targetSaving ? 'salvando...' : 'posts por semana'}
            </span>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Plataformas</h2>
          <div className={styles.platformGrid}>
            {PLATFORMS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`${styles.chip} ${platforms.includes(p.id) ? styles.chipActive : ''}`}
                onClick={() => togglePlatform(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <Button variant="primary" fullWidth onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </div>
  );
}
