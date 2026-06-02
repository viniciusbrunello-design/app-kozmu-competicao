import { useEffect, useState } from 'react';
import { Globe, Users, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/ui/Header';
import { Card } from '../components/ui/Card';
import * as groupsService from '../services/groups.service';
import type { PublicGroup } from '../services/groups.service';
import styles from './Feed.module.css';

const CYCLE_LABELS: Record<string, string> = {
  weekly: '7 dias', biweekly: '14 dias', monthly: '30 dias',
};

export function Feed() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PublicGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    groupsService.getPublicGroups()
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleJoin(groupId: string) {
    setJoiningId(groupId);
    try {
      await groupsService.joinPublicGroup(groupId);
      setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, isMember: true } : g));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao entrar no grupo');
    } finally {
      setJoiningId(null);
    }
  }

  const filtered = search.trim()
    ? groups.filter((g) =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.description ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : groups;

  return (
    <>
      <Header title="Descobrir" showNotifications />
      <div className="page-content">
        <div className={styles.page}>

          <div className={styles.searchWrap}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Buscar comunidades..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading && (
            <div className={styles.empty}>Buscando comunidades...</div>
          )}

          {!loading && filtered.length === 0 && (
            <Card variant="glass">
              <div className={styles.empty}>
                <Globe size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                <p>{search ? 'Nenhuma comunidade encontrada.' : 'Nenhum grupo público disponível.'}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {!search && 'Crie um grupo público para que outros possam entrar.'}
                </p>
              </div>
            </Card>
          )}

          {filtered.map((group) => (
            <Card key={group.id} variant="glass" className={styles.card}>
              <div className={styles.cardRow}>
                <div className={styles.cardInfo}>
                  <h3 className={styles.groupName}>{group.name}</h3>
                  {group.description && (
                    <p className={styles.groupDesc}>{group.description}</p>
                  )}
                  <div className={styles.meta}>
                    <span className={styles.metaItem}>
                      <Users size={11} />
                      {group.memberCount} membros
                    </span>
                    <span className={styles.metaItem}>
                      {CYCLE_LABELS[group.cycleDuration] ?? group.cycleDuration}
                    </span>
                  </div>
                </div>
                {group.isMember ? (
                  <button
                    className={styles.joinedBtn}
                    onClick={() => navigate(`/grupos/${group.id}`)}
                  >
                    Ver
                  </button>
                ) : (
                  <button
                    className={styles.joinBtn}
                    onClick={() => handleJoin(group.id)}
                    disabled={joiningId === group.id}
                  >
                    {joiningId === group.id ? '...' : 'Entrar'}
                  </button>
                )}
              </div>
            </Card>
          ))}

        </div>
      </div>
    </>
  );
}
