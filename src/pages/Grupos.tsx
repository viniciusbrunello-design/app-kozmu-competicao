import { useEffect, useState } from 'react';
import { Users, Plus, Copy, Share2, LogOut, ChevronRight, Globe, Lock, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import * as groupsService from '../services/groups.service';
import type { Group } from '../services/groups.service';
import styles from './Grupos.module.css';

const LEAGUE_LABELS: Record<string, string> = {
  bronze: '🥉 Bronze', silver: '🥈 Prata', gold: '🥇 Ouro',
  platinum: '💎 Platina', cosmos: '🌌 Cosmos', nova: '⭐ Nova', orbit: '🚀 Orbit',
};

const CYCLE_OPTIONS = [
  { label: '7 dias',       value: 'weekly'   },
  { label: '14 dias',      value: 'biweekly' },
  { label: '30 dias',      value: 'monthly'  },
  { label: 'Personalizado', value: 'custom'  },
  { label: 'Sem limite',   value: 'none'     },
];

const FORMAT_CONFIG = [
  { format: 'reel',     label: 'Reel',      emoji: '🎬', defaultPts: 5 },
  { format: 'carousel', label: 'Carrossel', emoji: '🖼️', defaultPts: 4 },
  { format: 'feed',     label: 'Feed',      emoji: '📷', defaultPts: 3 },
  { format: 'story',    label: 'Story',     emoji: '⭕', defaultPts: 1 },
  { format: 'live',     label: 'Live',      emoji: '🔴', defaultPts: 8 },
  { format: 'linkedin', label: 'LinkedIn',  emoji: '💼', defaultPts: 4 },
];


export function Grupos() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [modal, setModal] = useState<'create' | 'join' | null>(null);
  const [form, setForm] = useState({
    name: '', description: '', inviteCode: '',
    type: 'private', cycleDuration: 'weekly',
    customCycleDays: 14,
    scoringRules: FORMAT_CONFIG.map((f) => ({ format: f.format, points: f.defaultPts })),
  });
  const [showScoringRules, setShowScoringRules] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showEnded, setShowEnded] = useState(false);

  function fetchGroups() {
    setLoading(true);
    setFetchError(false);
    groupsService.getMyGroups()
      .then(setGroups)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchGroups(); }, []);

  async function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const group = await groupsService.createGroup({
        name: form.name,
        description: form.description,
        type: form.type,
        cycleDuration: form.cycleDuration,
        ...(form.cycleDuration === 'custom' && { customCycleDays: form.customCycleDays }),
        scoringRules: form.scoringRules,
      });
      setGroups((prev) => [group as unknown as Group, ...prev]);
      setModal(null);
      setForm({
        name: '', description: '', inviteCode: '', type: 'private', cycleDuration: 'weekly',
        customCycleDays: 14,
        scoringRules: FORMAT_CONFIG.map((f) => ({ format: f.format, points: f.defaultPts })),
      });
      setShowScoringRules(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar grupo');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin(e: { preventDefault(): void }) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const group = await groupsService.joinGroup(form.inviteCode.trim());
      setGroups((prev) => [group, ...prev]);
      setModal(null);
      setForm({
        name: '', description: '', inviteCode: '', type: 'private', cycleDuration: 'weekly',
        customCycleDays: 14,
        scoringRules: FORMAT_CONFIG.map((f) => ({ format: f.format, points: f.defaultPts })),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShareCode(group: Group) {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Entrar no grupo "${group.name}" no Kozmu`,
          text: `Use o código ${group.inviteCode} para entrar no grupo "${group.name}" no Kozmu e competir!`,
        });
        return;
      } catch { /* cancelled */ }
    }
    await navigator.clipboard.writeText(group.inviteCode).catch(() => {});
    setCopiedCode(group.id);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleLeave(groupId: string) {
    if (!confirm('Tem certeza que deseja sair do grupo?')) return;
    await groupsService.leaveGroup(groupId).catch(console.error);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  }

  return (
    <>
      <Header title="Grupos" showNotifications showSettings />
      <div className="page-content">
        <div className={styles.page}>

          <>
              <div className={styles.actions}>
                <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setModal('create'); setError(''); }}>
                  Criar Grupo
                </Button>
                <Button variant="secondary" icon={<Users size={16} />} onClick={() => { setModal('join'); setError(''); }}>
                  Entrar
                </Button>
              </div>

              {loading && <div className={styles.empty}>Carregando grupos...</div>}

              {!loading && fetchError && (
                <Card variant="glass">
                  <div className={styles.empty}>
                    <p>Não foi possível carregar os grupos.</p>
                    <button className={styles.retryBtn} onClick={fetchGroups}>Tentar novamente</button>
                  </div>
                </Card>
              )}

              {!loading && !fetchError && groups.length === 0 && (
                <Card variant="glass">
                  <div className={styles.empty}>
                    <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                    <p>Você não está em nenhum grupo ainda.</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      Crie um grupo ou explore comunidades na aba Feed.
                    </p>
                  </div>
                </Card>
              )}

              {(() => {
                const activeGroups = groups.filter((g) => g.isActive !== false);
                const endedGroups  = groups.filter((g) => g.isActive === false);

                function GroupCard({ group }: { group: Group }) {
                  return (
                    <Card
                      key={group.id}
                      variant="glass"
                      className={styles.groupCard}
                      onClick={() => navigate(`/grupos/${group.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className={styles.groupHeader}>
                        <div className={styles.groupInfo}>
                          <h3 className={styles.groupName}>{group.name}</h3>
                          {group.description && (
                            <p className={styles.groupDesc}>{group.description}</p>
                          )}
                        </div>
                        {group.myRole === 'admin' && (
                          <span className={styles.adminBadge}>Admin</span>
                        )}
                      </div>

                      <div className={styles.groupStats}>
                        <div className={styles.stat}>
                          <span className={styles.statValue}>{group.memberCount}</span>
                          <span className={styles.statLabel}>Membros</span>
                        </div>
                        <div className={styles.stat}>
                          <span className={styles.statValue} style={{ color: 'var(--accent-lime)' }}>
                            {group.myPoints}
                          </span>
                          <span className={styles.statLabel}>Meus pts</span>
                        </div>
                        {group.isActive !== false ? (
                          <div className={styles.stat}>
                            <span className={styles.statValue} style={{ color: 'var(--status-warning)' }}>
                              {group.daysUntilReset}d
                            </span>
                            <span className={styles.statLabel}>Reset</span>
                          </div>
                        ) : (
                          <div className={styles.stat}>
                            <span className={styles.statValue} style={{ color: 'var(--text-muted)' }}>—</span>
                            <span className={styles.statLabel}>Encerrado</span>
                          </div>
                        )}
                      </div>

                      {group.members && group.members.length > 0 && (
                        <div className={styles.memberRanking}>
                          {group.members.slice(0, 3).map((m, i) => (
                            <div key={m.id} className={styles.memberRow}>
                              <span className={styles.memberRank}>#{i + 1}</span>
                              <Avatar
                                alt={m.user.displayName}
                                size="sm"
                                fallback={m.user.displayName.slice(0, 2).toUpperCase()}
                                src={m.user.avatarUrl}
                              />
                              <div className={styles.memberInfo}>
                                <span className={styles.memberName}>{m.user.displayName}</span>
                                {m.user.league && (
                                  <span className={styles.memberLeague}>{LEAGUE_LABELS[m.user.league] ?? m.user.league}</span>
                                )}
                              </div>
                              <span className={styles.memberPoints}>{m.cyclePoints} pts</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={styles.groupFooter} onClick={(e) => e.stopPropagation()}>
                        {group.isActive !== false && (
                          <button className={styles.codeBtn} onClick={() => handleShareCode(group)}>
                            {copiedCode === group.id
                              ? <Copy size={12} />
                              : 'share' in navigator
                              ? <Share2 size={12} />
                              : <Copy size={12} />}
                            <span>{copiedCode === group.id ? 'Copiado!' : group.inviteCode}</span>
                          </button>
                        )}
                        <button className={styles.detailBtn} onClick={() => navigate(`/grupos/${group.id}`)}>
                          <ChevronRight size={16} />
                        </button>
                        {group.myRole !== 'admin' && group.isActive !== false && (
                          <button className={styles.leaveBtn} onClick={() => handleLeave(group.id)}>
                            <LogOut size={14} />
                          </button>
                        )}
                      </div>
                    </Card>
                  );
                }

                return (
                  <>
                    {activeGroups.map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}

                    {endedGroups.length > 0 && (
                      <>
                        <button
                          className={styles.endedToggle}
                          onClick={() => setShowEnded((v) => !v)}
                        >
                          <span>Grupos concluídos ({endedGroups.length})</span>
                          <ChevronDown
                            size={16}
                            style={{ transform: showEnded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                          />
                        </button>

                        {showEnded && (
                          <div className={styles.endedList}>
                            {endedGroups.map((group) => (
                              <div key={group.id} className={styles.endedCard}>
                                <GroupCard group={group} />
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </>
                );
              })()}
            </>

        </div>
      </div>

      {modal && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>
              {modal === 'create' ? 'Criar Grupo' : 'Entrar em Grupo'}
            </h2>

            {error && <div className={styles.modalError}>{error}</div>}

            {modal === 'create' ? (
              <form onSubmit={handleCreate} className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Nome do grupo</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Criadores Elite"
                    required
                    minLength={3}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Descrição (opcional)</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Sobre o grupo..."
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Visibilidade</label>
                  <div className={styles.typeGrid}>
                    <button
                      type="button"
                      className={`${styles.typeChip} ${form.type === 'private' ? styles.typeActive : ''}`}
                      onClick={() => setForm((f) => ({ ...f, type: 'private' }))}
                    >
                      <Lock size={12} /> Privado
                    </button>
                    <button
                      type="button"
                      className={`${styles.typeChip} ${form.type === 'public' ? styles.typeActive : ''}`}
                      onClick={() => setForm((f) => ({ ...f, type: 'public' }))}
                    >
                      <Globe size={12} /> Público
                    </button>
                  </div>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Duração do ciclo</label>
                  <div className={styles.typeGrid}>
                    {CYCLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`${styles.typeChip} ${form.cycleDuration === opt.value ? styles.typeActive : ''}`}
                        onClick={() => setForm((f) => ({ ...f, cycleDuration: opt.value }))}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.cycleDuration === 'custom' && (
                    <div className={styles.customDaysRow}>
                      <input
                        className={styles.customDaysInput}
                        type="number"
                        min={1}
                        max={365}
                        value={form.customCycleDays}
                        onChange={(e) => setForm((f) => ({ ...f, customCycleDays: Math.max(1, Math.min(365, Number(e.target.value))) }))}
                      />
                      <span className={styles.customDaysLabel}>dias</span>
                    </div>
                  )}
                </div>

                <div className={styles.field}>
                  <button
                    type="button"
                    className={styles.scoringToggle}
                    onClick={() => setShowScoringRules((v) => !v)}
                  >
                    <span>Regras de pontuação</span>
                    <ChevronDown
                      size={14}
                      style={{ transform: showScoringRules ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                    />
                  </button>
                  {showScoringRules && (
                    <div className={styles.scoringGrid}>
                      {FORMAT_CONFIG.map((f) => {
                        const rule = form.scoringRules.find((r) => r.format === f.format);
                        return (
                          <div key={f.format} className={styles.scoringRow}>
                            <span className={styles.scoringLabel}>{f.emoji} {f.label}</span>
                            <div className={styles.scoringInputWrap}>
                              <input
                                className={styles.scoringInput}
                                type="number"
                                min={1}
                                max={99}
                                value={rule?.points ?? f.defaultPts}
                                onChange={(e) => {
                                  const pts = Math.max(1, Math.min(99, Number(e.target.value)));
                                  setForm((prev) => ({
                                    ...prev,
                                    scoringRules: prev.scoringRules.map((r) =>
                                      r.format === f.format ? { ...r, points: pts } : r
                                    ),
                                  }));
                                }}
                              />
                              <span className={styles.scoringPtsSuffix}>pts</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                  {submitting ? 'Criando...' : 'Criar Grupo'}
                </Button>
                <Button type="button" variant="ghost" fullWidth onClick={() => setModal(null)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <form onSubmit={handleJoin} className={styles.modalForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Código de convite</label>
                  <input
                    className={styles.input}
                    type="text"
                    value={form.inviteCode}
                    onChange={(e) => setForm((f) => ({ ...f, inviteCode: e.target.value.toUpperCase() }))}
                    placeholder="Ex: ABC12345"
                    required
                    style={{ letterSpacing: '0.1em' }}
                  />
                </div>
                <Button type="submit" variant="primary" fullWidth disabled={submitting}>
                  {submitting ? 'Entrando...' : 'Entrar no Grupo'}
                </Button>
                <Button type="button" variant="ghost" fullWidth onClick={() => setModal(null)}>
                  Cancelar
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
