import React from 'react';
import clsx from 'clsx';
import styles from './Card.module.css';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated';
  glow?: 'none' | 'lime' | 'purple';
  title?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
}

export function Card({
  children,
  className,
  variant = 'default',
  glow = 'none',
  title,
  onClick,
  style,
}: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={clsx(
        styles.card,
        variant !== 'default' && styles[variant],
        glow === 'lime' && styles.glowLime,
        glow === 'purple' && styles.glowPurple,
        className
      )}
    >
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.content}>{children}</div>
    </div>
  );
}
