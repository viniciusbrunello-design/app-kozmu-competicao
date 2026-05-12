import clsx from 'clsx';
import styles from './Avatar.module.css';

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'none' | 'active' | 'danger';
  fallback?: string;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}

export function Avatar({
  src,
  alt = 'Avatar',
  size = 'md',
  status = 'none',
  fallback,
  className,
  onClick,
  style,
}: AvatarProps) {
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const statusClass = 
    status === 'active' ? styles.ringActive : 
    status === 'danger' ? styles.ringDanger : 
    styles.ring;

  return (
    <div className={clsx(styles.avatarContainer, styles[size], className)} onClick={onClick} style={style}>
      <div className={status !== 'none' ? statusClass : ''}>
        {src ? (
          <img src={src} alt={alt} className={styles.avatar} />
        ) : (
          <div className={styles.initials}>
            {fallback ? getInitials(fallback) : getInitials(alt)}
          </div>
        )}
      </div>
    </div>
  );
}
