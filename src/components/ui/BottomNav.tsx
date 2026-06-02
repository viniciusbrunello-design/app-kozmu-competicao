import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Home, Compass, Users, User } from 'lucide-react';
import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  { to: '/',       icon: Home,    label: 'Home',   end: true },
  { to: '/feed',   icon: Compass, label: 'Feed',   end: false },
  { to: '/grupos', icon: Users,   label: 'Grupos', end: false },
  { to: '/perfil', icon: User,    label: 'Perfil', end: false },
];

export function BottomNav() {
  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx(styles.item, isActive && styles.active)}
          >
            <div className={styles.iconWrapper}>
              <item.icon size={24} />
            </div>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
