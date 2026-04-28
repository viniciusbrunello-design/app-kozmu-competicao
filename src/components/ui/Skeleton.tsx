import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
}

export function Skeleton({ width, height = 16, radius = 6, className }: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: radius,
      }}
    />
  );
}

export function SkeletonAvatar({ size = 36 }: { size?: number }) {
  return <Skeleton width={size} height={size} radius="50%" />;
}

export function SkeletonActivityItem() {
  return (
    <div className={styles.activityItem}>
      <SkeletonAvatar size={32} />
      <div className={styles.activityContent}>
        <Skeleton width="55%" height={13} />
        <Skeleton width="75%" height={11} />
      </div>
      <Skeleton width={28} height={11} />
    </div>
  );
}

export function SkeletonRankRow() {
  return (
    <div className={styles.rankRow}>
      <Skeleton width={24} height={20} radius={4} />
      <SkeletonAvatar size={32} />
      <div className={styles.rankContent}>
        <Skeleton width="50%" height={13} />
        <Skeleton width="35%" height={11} />
      </div>
      <Skeleton width={44} height={16} radius={6} />
    </div>
  );
}
