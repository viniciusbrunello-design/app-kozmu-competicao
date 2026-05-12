import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Flame, MessageCircle, Copy, Share2, Plus, X, Wand2, Settings } from 'lucide-react';
import { Avatar } from '../components/ui/Avatar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { getGroupDetails, getGroupRanking, getGroupActivity, updateGroupSettings, updateGroupScoringRules } from '../services/groups.service';
import type { Group, RankingEntry, ActivityEntry } from '../services/groups.service';
import { createSubmission } from '../services/submissions.service';
import { api } from '../services/api';
import styles from './GrupoDetalhe.module.css';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const RANKING_MODE_OPTIONS = [
  { value: 'points',          label: '🏆 Pontos' },
  { value: 'count',           label: '📊 Quantidade' },
  { value: 'format:reel',     label: '🎬 Reels' },
  { value: 'format:carousel', label: '🖼️ Carrosseis' },
  { value: 'format:feed',     label: '📷 Posts' },
  { value: 'format:live',     label: '🔴 Lives' },
  { value: 'format:linkedin', label: '💼 LinkedIn' },
  { value: 'format:story',    label: '⭕ Stories' },
];

const LEAGUE_COLORS: Record<string, string> = {
  bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700',
  platinum: '#b5e0ff', cosmos: '#a78bfa', nova: '#f59e0b', orbit: '#34d399',
};

const FORMAT_EMOJI: Record<string, string> = {
  reel: '🎬', carousel: '🖼️', feed: '📷', live: '🔴', linkedin: '💼', story: '⭕',
};

const FORMAT_LABEL: Record<string, string> = {
  reel: 'Reel', carousel: 'Carrossel', feed: 'Post', live: 'Live', linkedin: 'LinkedIn', story: 'Story',
};

const CHECK_IN_FORMATS = [
  { value: 'reel', emoji: '🎬', label: 'Reel' },
  { value: 'carousel', emoji: '🖼️', label: 'Carrossel' },
  { value: 'feed', emoji: '📷', label: 'Post' },
  { value: 'live', emoji: '🔴', label: 'Live' },
  { value: 'linkedin', emoji: '💼', label: 'LinkedIn' },
  { value: 'story', emoji: '⭕', label: 'Story' },
];

interface DetectResult { platform: string; format: string; label: string }

function detectFromUrl(raw: string): DetectResult | null {
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  const host = url.hostname.replace('www.', '');
  const path = url.pathname;
  if (host === 'instagram.com' || host === 'instagr.am') {
    if (path.includes('/reel/'))    return { platform: 'instagram', format: 'reel',     label: '📸 Reel' };
    if (path.includes('/stories/')) return { platform: 'instagram', format: 'story',    label: '📸 Story' };
    if (path.includes('/p/'))       return { platform: 'instagram', format: 'carousel', label: '📸 Post' };
    return { platform: 'instagram', format: 'feed', label: '📸 Instagram' };
  }
  if (host === 'tiktok.com' || host === 'vm.tiktok.com')
    return { platform: 'tiktok', format: 'reel', label: '🎵 TikTok' };
  if (host === 'youtube.com' || host === 'youtu.be') {
    if (path.includes('/shorts/')) return { platform: 'youtube', format: 'reel',  label: '▶️ Short' };
    if (path.includes('/live/'))   return { platform: 'youtube', format: 'live',  label: '▶️ Live' };
    return { platform: 'youtube', format: 'feed', label: '▶️ YouTube' };
  }
  if (host === 'linkedin.com' || host === 'lnkd.in')
    return { platform: 'linkedin', format: 'linkedin', label: '💼 LinkedIn' };
  if (host === 'twitter.com' || host === 'x.com')
    return { platform: 'twitter', format: 'feed', label: '🐦 X' };
  return null;
}

function formatUrlDisplay(url: string): string {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.replace(/\/$/, '');
    const short = parsed.hostname.replace('www.', '') + path;
    return short.length > 40 ? short.slice(0, 38) + '…' : short;
  } catch {
    return url.slice(0, 40);
  }
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `${d}d`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return 'agora';
}

function isPostEntry(type: string) {
  return type === 'post_validated' || type === 'post_submitted';
}

export function GrupoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [group, setGroup] = useState<Group | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'ranking' | 'atividade'>('ranking');

  // Check-in modal
  const [checkIn, setCheckIn] = useState(false);
  const [ciUrl, setCiUrl] = useState('');
  const [ciFormat, setCiFormat] = useState('reel');
  const [ciDetected, setCiDetected] = useState<DetectResult | null>(null);
  const [ciLoading, setCiLoading] = useState(false);
  const [ciError, setCiError] = useState('');
  const [ciSuccess, setCiSuccess] = useState(false);

  // Settings modal (admin only)
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rankingModeEdit, setRankingModeEdit] = useState('points');
  const [scoringRulesEdit, setScoringRulesEdit] = useState<Record<string, number>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(false);
    Promise.all([
      getGroupDetails(id).then(setGroup),
      getGroupRanking(id, 'weekly').then(setRanking),
      getGroupActivity(id).then(setActivity),
    ])
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!group) return;
    setRankingModeEdit(group.rankingMode ?? 'points');
    const rules: Record<string, number> = {};
    for (const r of group.scoringRules ?? []) rules[r.format] = r.points;
    setScoringRulesEdit(rules);
  }, [group]);

  const handleNudge = useCallback(async (targetUserId: string) => {
    if (!id) return;
    setNudgedIds((prev) => new Set(prev).add(targetUserId));
    api.post(`/groups/${id}/nudge/${targetUserId}`).catch(() => {});
  }, [id]);

  async function handleShare() {
    if (!group) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entrar no grupo "${group.name}" no Kozmu`,
          text: `Use o código ${group.inviteCode} para entrar no grupo "${group.name}" no Kozmu!`,
        });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(group.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCiUrlChange(val: string) {
    setCiUrl(val);
    const detected = detectFromUrl(val.trim());
    if (detected) {
      setCiDetected(detected);
      setCiFormat(detected.format);
    } else {
      setCiDetected(null);
    }
  }

  async function handleSaveSettings() {
    if (!id || !group) return;
    setSettingsSaving(true);
    setSettingsError('');
    try {
      await updateGroupSettings(id, { rankingMode: rankingModeEdit });
      const rules = Object.entries(scoringRulesEdit).map(([format, points]) => ({ format, points }));
      await updateGroupScoringRules(id, rules);
      const updated = await getGroupDetails(id);
      setGroup(updated);
      setSettingsOpen(false);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSettingsSaving(false);
    }
  }

  async function handleCheckIn(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!id) return;
    setCiLoading(true);
    setCiError('');
    try {
      await createSubmission({ url: ciUrl, format: ciFormat, groupId: id, platform: ciDetected?.platform });
      setCiSuccess(true);
      setTimeout(() => {
        setCheckIn(false);
        setCiSuccess(false);
        setCiUrl('');
        setCiFormat('reel');
        setCiDetected(null);
        // Reload activity
        getGroupActivity(id).then(setActivity).catch(() => {});
        getGroupRanking(id, 'weekly').then(setRanking).catch(() => {});
      }, 1200);
    } catch (err) {
      setCiError(err instanceof Error ? err.message : 'Erro ao registrar');
    } finally {
      setCiLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mobile-container">
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <div className={styles.headerInfo}>
            <div className={styles.skeletonTitle} />
          </div>
        </header>
        <div className="page-content">
          <div className={styles.skeletonBlock} />
          <div className={styles.skeletonBlock} style={{ height: 120 }} />
        </div>
      </div>
    );
  }

  if (loadError || (!loading && !group)) {
    return (
      <div className="mobile-container">
        <header className={styles.header}>
          <button className={styles.back} onClick={() => navigate(-1)}><ArrowLeft size={20} /></button>
          <span className={styles.headerTitle}>Erro ao carregar</span>
        </header>
        <div className="page-content" style={{ textAlign: 'center', paddingTop: 40 }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
            Não foi possível carregar o grupo.
          </p>
          <button
            onClick={load}
            style={{
              background: 'none', border: '1px solid var(--accent-purple)',
              color: 'var(--accent-purple)', borderRadius: 10, padding: '8px 20px',
              fontFamily: 'inherit', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const myRankEntry = ranking.find((r) => r.userId === user?.id);
  const daysLeft = Math.max(0, Math.ceil(
    (new Date(group!.currentCycleEnd).getTime() - Date.now()) / 86400000,
  ));

  // Filter: don't show post_submitted (post_validated fires right after)
  const filteredActivity = activity.filter((a) => a.type !== 'post_submitted');

  return (
    <div className="mobile-container">
      <header className={styles.header}>
        <button className={styles.back} onClick={() => navigate(-1)} aria-label="Voltar">
          <ArrowLeft size={20} />
        </button>
        <div className={styles.headerInfo}>
          <h1 className={styles.headerTitle}>{group!.name}</h1>
          <span className={styles.headerSub}>{group!.memberCount} membros · {daysLeft}d para reset</span>
        </div>
        {group?.myRole === 'admin' && (
          <button
            className={styles.shareBtn}
            onClick={() => { setSettingsError(''); setSettingsOpen(true); }}
            aria-label="Configurações do grupo"
          >
            <Settings size={18} />
          </button>
        )}
        <button className={styles.shareBtn} onClick={handleShare} aria-label="Compartilhar convite">
          {copied ? <Copy size={18} /> : 'share' in navigator ? <Share2 size={18} /> : <Copy size={18} />}
        </button>
      </header>

      {copied && <div className={styles.copiedToast}>Código copiado!</div>}

      <div className="page-content">

        {myRankEntry && (
          <Card variant="glass" glow="purple" className={styles.myCard}>
            <div className={styles.myCardLabel}>Sua posição neste ciclo</div>
            <div className={styles.myCardContent}>
              <span className={styles.myRank}>#{myRankEntry.rank}</span>
              <div className={styles.myStats}>
                <span className={styles.myPoints}>{myRankEntry.points} pts</span>
                {myRankEntry.currentStreak > 0 && (
                  <span className={styles.myStreak}>
                    <Flame size={13} /> {myRankEntry.currentStreak} dias
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Check-in CTA */}
        <button
          className={styles.checkInCta}
          onClick={() => { setCheckIn(true); setCiError(''); setCiSuccess(false); }}
        >
          <Plus size={16} />
          Registrar publicação no grupo
        </button>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'ranking' ? styles.tabActive : ''}`}
            onClick={() => setTab('ranking')}
          >
            Ranking
          </button>
          <button
            className={`${styles.tab} ${tab === 'atividade' ? styles.tabActive : ''}`}
            onClick={() => setTab('atividade')}
          >
            Atividade
          </button>
        </div>

        {tab === 'ranking' && (
          <Card>
            {ranking.length === 0 ? (
              <div className={styles.empty}>Nenhuma publicação registrada ainda.</div>
            ) : (
              ranking.map((entry) => {
                const isMe = entry.userId === user?.id;
                const nudged = nudgedIds.has(entry.userId);
                return (
                  <div
                    key={entry.userId}
                    className={`${styles.rankRow} ${isMe ? styles.rankRowMe : ''}`}
                  >
                    <span className={styles.rankPos}>
                      {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
                    </span>
                    <Avatar
                      alt={entry.displayName}
                      size="sm"
                      fallback={entry.displayName.slice(0, 2).toUpperCase()}
                      src={entry.avatarUrl}
                      onClick={() => navigate(`/perfil/${entry.username}`)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className={styles.rankInfo}>
                      <button
                        className={styles.rankName}
                        onClick={() => navigate(`/perfil/${entry.username}`)}
                        style={{ background: 'none', border: 'none', font: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      >
                        {entry.displayName}
                        {isMe && <span className={styles.youBadge}>você</span>}
                      </button>
                      <span
                        className={styles.rankLeague}
                        style={{ color: LEAGUE_COLORS[entry.league] ?? 'var(--text-muted)' }}
                      >
                        {entry.submissionCount} posts
                        {entry.currentStreak > 0 && ` · 🔥${entry.currentStreak}`}
                      </span>
                    </div>
                    <div className={styles.rankRight}>
                      <span className={styles.rankPoints}>{entry.points} pts</span>
                      {!isMe && (
                        <button
                          className={`${styles.nudgeBtn} ${nudged ? styles.nudgeDone : ''}`}
                          onClick={() => handleNudge(entry.userId)}
                          disabled={nudged}
                          title={nudged ? 'Cobrado!' : 'Cobrar'}
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        )}

        {tab === 'atividade' && (
          <div className={styles.activityFeed}>
            {filteredActivity.length === 0 ? (
              <Card>
                <div className={styles.empty}>Nenhuma atividade ainda.</div>
              </Card>
            ) : (
              filteredActivity.slice(0, 20).map((item) => (
                isPostEntry(item.type) ? (
                  <div key={item.id} className={styles.postCard}>
                    <div className={styles.postCardTop}>
                      <Avatar
                        alt={item.user.displayName}
                        size="sm"
                        fallback={item.user.displayName.slice(0, 2).toUpperCase()}
                        src={item.user.avatarUrl}
                        onClick={() => navigate(`/perfil/${item.user.username}`)}
                        style={{ cursor: 'pointer' }}
                      />
                      <div className={styles.postCardMeta}>
                        <button
                          className={styles.postCardName}
                          onClick={() => navigate(`/perfil/${item.user.username}`)}
                          style={{ background: 'none', border: 'none', font: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                        >
                          {item.user.displayName}
                        </button>
                        <span className={styles.postCardTime}>{timeAgo(item.createdAt)}</span>
                      </div>
                    </div>
                    <div className={styles.postCardBody}>
                      <span className={styles.postFormatBadge}>
                        {FORMAT_EMOJI[String(item.data.format)] ?? '📝'}{' '}
                        {FORMAT_LABEL[String(item.data.format)] ?? String(item.data.format)}
                      </span>
                      <span className={styles.postPoints}>+{String(item.data.points)} pts</span>
                    </div>
                    {item.data.url && (
                      <a
                        href={String(item.data.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.postLink}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {formatUrlDisplay(String(item.data.url))}
                      </a>
                    )}
                  </div>
                ) : (
                  <div key={item.id} className={styles.activityRow}>
                    <Avatar
                      alt={item.user.displayName}
                      size="sm"
                      fallback={item.user.displayName.slice(0, 2).toUpperCase()}
                      src={item.user.avatarUrl}
                      onClick={() => navigate(`/perfil/${item.user.username}`)}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className={styles.activityInfo}>
                      <button
                        className={styles.activityName}
                        onClick={() => navigate(`/perfil/${item.user.username}`)}
                        style={{ background: 'none', border: 'none', font: 'inherit', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                      >
                        {item.user.displayName}
                      </button>
                      <span className={styles.activityAction}>{getActivityText(item.type, item.data)}</span>
                    </div>
                    <span className={styles.activityTime}>{timeAgo(item.createdAt)}</span>
                  </div>
                )
              ))
            )}
          </div>
        )}

      </div>

      {/* Settings modal (admin only) */}
      {settingsOpen && (
        <div className={styles.overlay} onClick={() => setSettingsOpen(false)}>
          <div className={styles.ciModal} onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <div className={styles.ciModalHeader}>
              <h2 className={styles.ciModalTitle}>Configurações do Grupo</h2>
              <button className={styles.ciCloseBtn} onClick={() => setSettingsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {settingsError && <div className={styles.ciError}>{settingsError}</div>}

            <div className={styles.ciField}>
              <label className={styles.ciLabel}>Modo de Ranking</label>
              <div className={styles.ciFormatGrid}>
                {RANKING_MODE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.ciFormatBtn} ${rankingModeEdit === opt.value ? styles.ciFormatActive : ''}`}
                    onClick={() => setRankingModeEdit(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.ciField}>
              <label className={styles.ciLabel}>Pontos por formato</label>
              {CHECK_IN_FORMATS.map((f) => (
                <div key={f.value} className={styles.settingsRuleRow}>
                  <span>{f.emoji} {f.label}</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className={styles.settingsRuleInput}
                    value={scoringRulesEdit[f.value] ?? 0}
                    onChange={(e) => setScoringRulesEdit((prev) => ({ ...prev, [f.value]: Number(e.target.value) }))}
                  />
                  <span className={styles.settingsRulePts}>pts</span>
                </div>
              ))}
            </div>

            <Button variant="primary" fullWidth onClick={handleSaveSettings} disabled={settingsSaving}>
              {settingsSaving ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </div>
        </div>
      )}

      {/* Check-in modal */}
      {checkIn && (
        <div className={styles.overlay} onClick={() => setCheckIn(false)}>
          <div className={styles.ciModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.ciModalHeader}>
              <h2 className={styles.ciModalTitle}>Registrar publicação</h2>
              <button className={styles.ciCloseBtn} onClick={() => setCheckIn(false)}>
                <X size={20} />
              </button>
            </div>

            {ciSuccess ? (
              <div className={styles.ciSuccess}>✅ Registrado com sucesso!</div>
            ) : (
              <form onSubmit={handleCheckIn} className={styles.ciForm}>
                {ciError && <div className={styles.ciError}>{ciError}</div>}

                <div className={styles.ciField}>
                  <label className={styles.ciLabel}>Link da publicação</label>
                  <input
                    type="url"
                    className={styles.ciInput}
                    value={ciUrl}
                    onChange={(e) => handleCiUrlChange(e.target.value)}
                    placeholder="https://instagram.com/reel/..."
                    required
                  />
                  {ciDetected && (
                    <div className={styles.ciDetected}>
                      <Wand2 size={12} />
                      <span>Detectado: <strong>{ciDetected.label}</strong></span>
                    </div>
                  )}
                </div>

                <div className={styles.ciField}>
                  <label className={styles.ciLabel}>Formato</label>
                  <div className={styles.ciFormatGrid}>
                    {CHECK_IN_FORMATS.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        className={`${styles.ciFormatBtn} ${ciFormat === f.value ? styles.ciFormatActive : ''}`}
                        onClick={() => { setCiFormat(f.value); setCiDetected(null); }}
                      >
                        <span>{f.emoji}</span>
                        <span>{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="primary" fullWidth disabled={ciLoading}>
                  {ciLoading ? 'Enviando...' : 'Registrar'}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function getActivityText(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'streak_extended':
    case 'streak_milestone':
      return `🔥 ${data.currentStreak} dias de streak`;
    case 'challenge_completed':
      return `Completou o desafio "${data.challengeTitle ?? ''}"! 🎯`;
    case 'group_joined':
      return 'Entrou no grupo';
    default:
      return type;
  }
}
