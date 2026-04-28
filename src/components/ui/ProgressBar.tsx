import clsx from 'clsx';
import styles from './ProgressBar.module.css';

export interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: 'lime' | 'purple' | 'blue';
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  showValue?: boolean;
  className?: string;
}

export function ProgressBar({
  progress,
  color = 'lime',
  size = 'md',
  label,
  showValue = true,
  className
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={clsx(styles.container, styles[size], className)}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label && <span className={styles.label}>{label}</span>}
          {showValue && <span className={styles.value}>{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div className={styles.track}>
        <div 
          className={clsx(styles.fill, styles[color])} 
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}
