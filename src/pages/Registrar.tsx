import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Wand2 } from 'lucide-react';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { createSubmission } from '../services/submissions.service';
import styles from './Registrar.module.css';

const FORMATS = [
  { value: 'reel',      label: 'Reel / TikTok / Shorts', points: 5, emoji: '🎬' },
  { value: 'carousel',  label: 'Carrossel',               points: 4, emoji: '🖼️' },
  { value: 'feed',      label: 'Post de Feed',            points: 3, emoji: '📷' },
  { value: 'live',      label: 'Live',                    points: 8, emoji: '🔴' },
  { value: 'linkedin',  label: 'LinkedIn',                points: 4, emoji: '💼' },
  { value: 'story',     label: 'Story',                   points: 1, emoji: '⭕' },
];

const PLATFORM_LABELS: Record<string, string> = {
  instagram: '📸 Instagram',
  tiktok: '🎵 TikTok',
  youtube: '▶️ YouTube',
  linkedin: '💼 LinkedIn',
  twitter: '🐦 Twitter/X',
};

interface DetectResult {
  platform: string;
  format: string;
  label: string;
}

function detectFromUrl(raw: string): DetectResult | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.replace('www.', '');
  const path = url.pathname;

  if (host === 'instagram.com' || host === 'instagr.am') {
    if (path.includes('/reel/'))    return { platform: 'instagram', format: 'reel',     label: '📸 Instagram Reel' };
    if (path.includes('/stories/')) return { platform: 'instagram', format: 'story',    label: '📸 Instagram Story' };
    if (path.includes('/p/'))       return { platform: 'instagram', format: 'carousel', label: '📸 Instagram Post' };
    if (path.includes('/tv/'))      return { platform: 'instagram', format: 'live',     label: '📸 Instagram Live' };
    return { platform: 'instagram', format: 'feed', label: '📸 Instagram' };
  }

  if (host === 'tiktok.com' || host === 'vm.tiktok.com') {
    return { platform: 'tiktok', format: 'reel', label: '🎵 TikTok' };
  }

  if (host === 'youtube.com' || host === 'youtu.be') {
    if (path.includes('/shorts/')) return { platform: 'youtube', format: 'reel',  label: '▶️ YouTube Short' };
    if (path.includes('/live/'))   return { platform: 'youtube', format: 'live',  label: '▶️ YouTube Live' };
    return { platform: 'youtube', format: 'feed', label: '▶️ YouTube' };
  }

  if (host === 'linkedin.com' || host === 'lnkd.in') {
    return { platform: 'linkedin', format: 'linkedin', label: '💼 LinkedIn' };
  }

  if (host === 'twitter.com' || host === 'x.com') {
    return { platform: 'twitter', format: 'feed', label: '🐦 Twitter/X' };
  }

  return null;
}

export function Registrar() {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [format, setFormat] = useState('reel');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [detected, setDetected] = useState<DetectResult | null>(null);

  const selectedFormat = FORMATS.find((f) => f.value === format) ?? FORMATS[0];

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value);
    const result = detectFromUrl(value.trim());
    if (result) {
      setDetected(result);
      setFormat(result.format);
    } else {
      setDetected(null);
    }
  }, []);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createSubmission({ url, format, platform: detected?.platform });
      setSuccess(true);
      setTimeout(() => navigate('/'), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar publicação');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className={styles.successScreen}>
        <CheckCircle size={64} className={styles.successIcon} />
        <h2 className={styles.successTitle}>Prova registrada!</h2>
        <p className={styles.successSub}>
          +{selectedFormat.points} pontos adicionados. Continue assim! 🔥
        </p>
      </div>
    );
  }

  return (
    <>
      <Header title="Registrar Prova" />
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <Card glow="purple">
          <h3 className={styles.cardTitle}>O que você publicou?</h3>
          <p className={styles.cardDesc}>
            Cole o link da publicação para registrar e somar pontos.
          </p>

          {error && <div className={styles.error}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Link da Publicação</label>
              <input
                type="url"
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onPaste={(e) => {
                  const pasted = e.clipboardData.getData('text');
                  handleUrlChange(pasted);
                }}
                placeholder="https://instagram.com/reel/..."
                required
                className={styles.input}
              />
              {detected && (
                <div className={styles.detectedBadge}>
                  <Wand2 size={12} />
                  <span>Detectado: <strong>{detected.label}</strong></span>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Formato</label>
              <div className={styles.formatGrid}>
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`${styles.formatCard} ${format === f.value ? styles.formatActive : ''}`}
                    onClick={() => { setFormat(f.value); setDetected(null); }}
                  >
                    <span className={styles.formatEmoji}>{f.emoji}</span>
                    <span className={styles.formatLabel}>{f.label}</span>
                    <span className={styles.formatPoints}>+{f.points} pts</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.pointsPreview}>
              <span className={styles.pointsLabel}>Pontos que você vai ganhar</span>
              <span className={styles.pointsValue}>+{selectedFormat.points}</span>
            </div>

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar Prova'}
            </Button>
            <Button type="button" variant="ghost" fullWidth onClick={() => navigate(-1)}>
              Cancelar
            </Button>
          </form>
        </Card>

      </div>
    </>
  );
}
