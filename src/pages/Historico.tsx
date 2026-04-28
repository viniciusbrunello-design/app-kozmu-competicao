import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import styles from './Historico.module.css';

interface Submission {
  id: string;
  url: string;
  format: string;
  platform: string | null;
  points: number;
  status: 'pending' | 'validated' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
}

const FORMAT_EMOJI: Record<string, string> = {
  reel: '🎬', carousel: '🖼️', feed: '📷', live: '🔴', linkedin: '💼', story: '⭕',
};

const STATUS_CONFIG = {
  validated: { label: 'Validado',  color: 'var(--accent-lime)',                  bg: 'rgba(163,230,53,0.12)' },
  pending:   { label: 'Pendente',  color: 'var(--status-warning, #f59e0b)',       bg: 'rgba(245,158,11,0.12)' },
  rejected:  { label: 'Rejeitado', color: 'var(--accent-red, #ef4444)',           bg: 'rgba(239,68,68,0.12)'  },
};

function urlPreview(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '').split('/').slice(-2).join('/');
    return `${u.hostname}/${path}`;
  } catch {
    return url.slice(0, 40);
  }
}

function timeStr(date: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(date));
}

export function Historico() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Submission[]>('/submissions')
      .then(setSubmissions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const validated = submissions.filter((s) => s.status === 'validated').length;
  const totalPoints = submissions
    .filter((s) => s.status === 'validated')
    .reduce((sum, s) => sum + s.points, 0);

  return (
    <div className="mobile-container">
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <h1 className={styles.title}>Histórico</h1>
        {!loading && submissions.length > 0 && (
          <span className={styles.count}>{submissions.length}</span>
        )}
      </header>

      <div className="page-content">
        {loading ? (
          <div className={styles.empty}>Carregando...</div>
        ) : submissions.length === 0 ? (
          <div className={styles.empty}>
            <p>Nenhum post registrado ainda.</p>
            <span>Publique algo e registre sua primeira prova aqui!</span>
          </div>
        ) : (
          <>
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{validated}</span>
                <span className={styles.summaryLabel}>Validadas</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue} style={{ color: 'var(--accent-lime)' }}>
                  {totalPoints}
                </span>
                <span className={styles.summaryLabel}>Pontos ganhos</span>
              </div>
              <div className={styles.summaryDivider} />
              <div className={styles.summaryItem}>
                <span className={styles.summaryValue}>{submissions.length}</span>
                <span className={styles.summaryLabel}>Total</span>
              </div>
            </div>

            <ul className={styles.list}>
              {submissions.map((s) => {
                const status = STATUS_CONFIG[s.status];
                return (
                  <li key={s.id} className={styles.item}>
                    <span className={styles.formatEmoji}>
                      {FORMAT_EMOJI[s.format] ?? '📄'}
                    </span>
                    <div className={styles.info}>
                      <div className={styles.row}>
                        <span className={styles.format}>{s.format}</span>
                        <span
                          className={styles.statusBadge}
                          style={{ color: status.color, background: status.bg }}
                        >
                          {status.label}
                        </span>
                      </div>
                      <div className={styles.row}>
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.url}
                        >
                          {urlPreview(s.url)}
                          <ExternalLink size={10} />
                        </a>
                      </div>
                      {s.status === 'rejected' && s.rejectionReason && (
                        <span className={styles.rejection}>{s.rejectionReason}</span>
                      )}
                    </div>
                    <div className={styles.right}>
                      {s.status === 'validated' && (
                        <span className={styles.points}>+{s.points}pts</span>
                      )}
                      <span className={styles.date}>{timeStr(s.createdAt)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
