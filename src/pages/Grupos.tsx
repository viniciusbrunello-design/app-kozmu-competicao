import { useEffect, useState } from 'react';
import { Users, Plus, Copy, Share2, LogOut, ChevronRight } from 'lucide-react';
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

export function Grupos() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'create' | 'join' | null>(null);
  const [form, setForm] = useState({ name: '', description: '', inviteCode: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    groupsService.getMyGroups().then(setGroups).catch(console.error).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: { preventDefault(): void }) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const group = await groupsService.createGroup({ name: form.name, description: form.description });
      setGroups((prev) => [group as unknown as Group, ...prev]);
      setModal(null);
      setForm({ name: '', description: '', inviteCode: '' });
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
      setForm({ name: '', description: '', inviteCode: '' });
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
      } catch { /* user cancelled or API unavailable */ }
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
      <Header title="Grupos" showNotifications />
      <div className="page-content">
        <div className={styles.page}>

          <div className={styles.actions}>
            <Button variant="primary" icon={<Plus size={16} />} onClick={() => { setModal('create'); setError(''); }}>
              Criar Grupo
            </Button>
            <Button variant="secondary" icon={<Users size={16} />} onClick={() => { setModal('join'); setError(''); }}>
              Entrar
            </Button>
          </div>

          {loading && <div className={styles.empty}>Carregando grupos...</div>}

          {!loading && groups.length === 0 && (
            <Card variant="glass">
              <div className={styles.empty}>
                <Users size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p>Você não está em nenhum grupo ainda.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Crie ou entre em um grupo para competir!
                </p>
              </div>
            </Card>
          )}

          {groups.map((group) => (
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
                <div className={styles.stat}>
                  <span className={styles.statValue} style={{ color: 'var(--status-warning)' }}>
                    {group.daysUntilReset}d
                  </span>
                  <span className={styles.statLabel}>Reset</span>
                </div>
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
                <button className={styles.codeBtn} onClick={() => handleShareCode(group)}>
                  {copiedCode === group.id
                    ? <Copy size={12} />
                    : navigator.share
                    ? <Share2 size={12} />
                    : <Copy size={12} />}
                  <span>{copiedCode === group.id ? 'Copiado!' : group.inviteCode}</span>
                </button>
                <button className={styles.detailBtn} onClick={() => navigate(`/grupos/${group.id}`)}>
                  <ChevronRight size={16} />
                </button>
                {group.myRole !== 'admin' && (
                  <button className={styles.leaveBtn} onClick={() => handleLeave(group.id)}>
                    <LogOut size={14} />
                  </button>
                )}
              </div>
            </Card>
          ))}
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
