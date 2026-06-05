import { NavLink, useNavigate } from 'react-router-dom';
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

export function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>

        <div className={styles.side}>
          {LEFT_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx(styles.item, isActive && styles.active)}
            >
              <div className={styles.iconWrapper}>
                <item.icon size={22} />
              </div>
              <span>{item.label}</span>
            </NavLink>
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
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => clsx(styles.item, isActive && styles.active)}
            >
              <div className={styles.iconWrapper}>
                <item.icon size={22} />
              </div>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

      </div>
    </nav>
  );
}
