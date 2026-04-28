import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Home, Users, Trophy, User, Plus } from 'lucide-react';
import styles from './BottomNav.module.css';

export function BottomNav() {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/grupos', icon: Users, label: 'Grupos' },
    { to: '/registrar', icon: Plus, label: 'Postar', isFab: true },
    { to: '/desafios', icon: Trophy, label: 'Desafios' },
    { to: '/perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <NavLink 
                key={item.to} 
                to={item.to} 
                className={styles.fabItem}
                aria-label={item.label}
              >
                <div className={styles.fab}>
                  <item.icon size={28} strokeWidth={2.5} />
                </div>
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(styles.item, isActive && styles.active)}
            >
              <div className={styles.iconWrapper}>
                <item.icon size={24} />
              </div>
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
