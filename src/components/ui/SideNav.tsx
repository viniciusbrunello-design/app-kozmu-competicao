import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { Home, Compass, Users, User, Plus } from 'lucide-react';
import styles from './SideNav.module.css';

export function SideNav() {
  const navItems = [
    { to: '/',       icon: Home,    label: 'Home',   end: true  },
    { to: '/feed',   icon: Compass, label: 'Feed',   end: false },
    { to: '/grupos', icon: Users,   label: 'Grupos', end: false },
    { to: '/perfil', icon: User,    label: 'Perfil', end: false },
  ];

  return (
    <nav className={styles.sidebar}>
      <div className={styles.logo}>Kozmu</div>
      
      <div className={styles.navItems}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => clsx(styles.item, isActive && styles.active)}
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      <NavLink to="/registrar" className={styles.fab}>
        <Plus size={20} strokeWidth={2.5} />
        Registrar Prova
      </NavLink>
    </nav>
  );
}
