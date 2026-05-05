import React from 'react';
import { Bell, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.css';

export interface HeaderProps {
  title: string | React.ReactNode;
  showNotifications?: boolean;
  showSettings?: boolean;
  hasUnreadNotif?: boolean;
}

export function Header({
  title,
  showNotifications = false,
  showSettings = false,
  hasUnreadNotif = false,
}: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>

      <div className={styles.right}>
        {showNotifications && (
          <button
            className={`${styles.actionBtn} ${hasUnreadNotif ? styles.hasNotif : ''}`}
            onClick={() => navigate('/notificacoes')}
            aria-label="Ver notificações"
          >
            <Bell size={20} />
          </button>
        )}
        {showSettings && (
          <button className={styles.actionBtn} aria-label="Configurações" onClick={() => navigate('/configuracoes')}>
            <Settings size={20} />
          </button>
        )}
      </div>
    </header>
  );
}
