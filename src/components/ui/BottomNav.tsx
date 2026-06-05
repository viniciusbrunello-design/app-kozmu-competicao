import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { Home, Compass, Users, User, Plus } from 'lucide-react';
import styles from './BottomNav.module.css';

const LEFT_ITEMS = [
  { to: '/',     icon: Home,    label: 'Home', end: true  },
  { to: '/feed', icon: Compass, label: 'Feed', end: false },
];

const RIGHT_ITEMS = [
  { to: '/grupos', icon: Users, label: 'Grupos', end: false },
  { to: '/perfil', icon: User,  label: 'Perfil', end: false },
];

function isPathActive(pathname: string, to: string, end: boolean): boolean {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(to + '/');
}

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  function NavItem({ to, icon: Icon, label, end }: { to: string; icon: React.ElementType; label: string; end: boolean }) {
    const active = isPathActive(pathname, to, end);
    return (
      <button
        className={clsx(styles.item, active && styles.active)}
        onClick={() => navigate(to)}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
      >
        <div className={styles.iconWrapper}>
          <Icon size={22} />
        </div>
        <span>{label}</span>
      </button>
    );
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        <div className={styles.side}>
          {LEFT_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

        <button
          className={styles.fab}
          onClick={() => navigate('/registrar')}
          aria-label="Registrar publicação"
        >
          <Plus size={26} />
        </button>

        <div className={styles.side}>
          {RIGHT_ITEMS.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </div>

      </div>
    </nav>
  );
}
