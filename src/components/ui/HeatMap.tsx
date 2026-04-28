import styles from './HeatMap.module.css';

interface HeatMapDay {
  date: string;
  count: number;
}

interface HeatMapProps {
  data: HeatMapDay[];
}

function cellColor(count: number): string {
  if (count === 0) return 'var(--bg-surface)';
  if (count === 1) return 'rgba(163, 230, 53, 0.30)';
  if (count === 2) return 'rgba(163, 230, 53, 0.55)';
  if (count === 3) return 'rgba(163, 230, 53, 0.75)';
  return 'var(--accent-lime)';
}

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export function HeatMap({ data }: HeatMapProps) {
  // Pad start so col 0 = Sunday of the first week
  const firstDate = data[0] ? new Date(data[0].date + 'T12:00:00') : new Date();
  const startDow = firstDate.getDay(); // 0=Sun

  const cells: (HeatMapDay | null)[] = [
    ...Array(startDow).fill(null),
    ...data,
  ];

  // Total points
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const activeDays = data.filter((d) => d.count > 0).length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <span className={styles.label}>Atividade (12 semanas)</span>
        <span className={styles.stats}>{total} posts · {activeDays} dias ativos</span>
      </div>

      <div className={styles.grid}>
        <div className={styles.dayLabels}>
          {DAY_LABELS.map((l, i) => (
            <span key={i} className={styles.dayLabel}>{l}</span>
          ))}
        </div>
        <div className={styles.weeks}>
          {Array.from({ length: Math.ceil(cells.length / 7) }, (_, wi) => (
            <div key={wi} className={styles.week}>
              {Array.from({ length: 7 }, (_, di) => {
                const cell = cells[wi * 7 + di];
                return (
                  <div
                    key={di}
                    className={styles.cell}
                    style={{ background: cell ? cellColor(cell.count) : 'transparent' }}
                    title={cell ? `${cell.date}: ${cell.count} post${cell.count !== 1 ? 's' : ''}` : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Menos</span>
        {[0, 1, 2, 3, 4].map((v) => (
          <div key={v} className={styles.cell} style={{ background: cellColor(v) }} />
        ))}
        <span className={styles.legendLabel}>Mais</span>
      </div>
    </div>
  );
}
