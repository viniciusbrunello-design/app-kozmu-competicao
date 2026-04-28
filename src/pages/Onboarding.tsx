import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import * as groupsService from '../services/groups.service';
import { api } from '../services/api';
import styles from './Onboarding.module.css';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'twitter', label: 'X (Twitter)' },
];

const MISSIONS = [
  '🔥 Constância diária',
  '📈 Volume de posts',
  '🎯 Disciplina de rotina',
  '🏆 Marca pessoal',
];

export function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [mission, setMission] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePlatform(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleFinish() {
    setLoading(true);
    setError('');
    try {
      // Save selected platforms to user profile
      if (selected.length > 0) {
        await api.put('/users/me', { platforms: selected });
      }
      if (inviteCode.trim()) {
        await groupsService.joinGroup(inviteCode.trim());
      }
      await refreshUser();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar onboarding');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.progress}>
          {[1, 2, 3].map((s) => (
            <div key={s} className={`${styles.dot} ${step >= s ? styles.active : ''}`} />
          ))}
        </div>

        {step === 1 && (
          <div className={styles.section}>
            <div className={styles.emoji}>🚀</div>
            <h1 className={styles.title}>Olá, {user?.displayName?.split(' ')[0]}!</h1>
            <p className={styles.subtitle}>
              Bem-vindo à Kozmu. Onde você publica seu conteúdo?
            </p>
            <div className={styles.platformGrid}>
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.chip} ${selected.includes(p.id) ? styles.chipActive : ''}`}
                  onClick={() => togglePlatform(p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <Button
              variant="primary"
              fullWidth
              onClick={() => setStep(2)}
              disabled={selected.length === 0}
            >
              Continuar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className={styles.section}>
            <div className={styles.emoji}>🎯</div>
            <h1 className={styles.title}>Qual é sua missão?</h1>
            <p className={styles.subtitle}>Escolha o que mais te motiva a publicar.</p>
            <div className={styles.missionList}>
              {MISSIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.missionCard} ${mission === m ? styles.missionActive : ''}`}
                  onClick={() => setMission(m)}
                >
                  {m}
                </button>
              ))}
            </div>
            <Button variant="primary" fullWidth onClick={() => setStep(3)} disabled={!mission}>
              Continuar
            </Button>
            <Button variant="ghost" fullWidth onClick={() => setStep(1)}>
              Voltar
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className={styles.section}>
            <div className={styles.emoji}>👥</div>
            <h1 className={styles.title}>Entre em um grupo</h1>
            <p className={styles.subtitle}>
              Competição coletiva cria consistência. Cole o código do seu grupo.
            </p>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.field}>
              <label className={styles.label}>Código de convite (opcional)</label>
              <input
                className={styles.input}
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC12345"
              />
            </div>

            <div className={styles.infoBox}>
              <span className={styles.infoIcon}>💡</span>
              <p className={styles.infoText}>
                Você também pode criar ou entrar em grupos depois pela aba <strong>Grupos</strong>.
              </p>
            </div>

            <Button variant="primary" fullWidth onClick={handleFinish} disabled={loading}>
              {loading ? 'Entrando...' : 'Começar a competir!'}
            </Button>

            <Button variant="ghost" fullWidth onClick={handleFinish} disabled={loading}>
              Pular por agora
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
