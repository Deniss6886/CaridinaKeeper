import { useId } from 'react';

export interface TrendPoint {
  label: string;
  value: number;
}

interface TrendChartProps {
  points: TrendPoint[];
  label: string;
  unit: string;
  emptyText: string;
}

export function TrendChart({ points, label, unit, emptyText }: TrendChartProps) {
  const titleId = useId();
  if (points.length < 2) return <div className="chart-empty">{emptyText}</div>;

  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const width = 640;
  const height = 220;
  const padX = 32;
  const padY = 24;
  const coordinates = points.map((point, index) => ({
    ...point,
    x: padX + (index / (points.length - 1)) * (width - padX * 2),
    y: height - padY - ((point.value - min) / span) * (height - padY * 2)
  }));
  const line = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${padX},${height - padY} ${line} ${width - padX},${height - padY}`;

  return (
    <div className="trend-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={titleId}>
        <title id={titleId}>{`${label}: ${min}–${max} ${unit}`}</title>
        <defs>
          <linearGradient id={`${titleId}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--chart)" stopOpacity="0.3" />
            <stop offset="1" stopColor="var(--chart)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((row) => {
          const y = padY + (row / 3) * (height - padY * 2);
          return (
            <line key={row} x1={padX} x2={width - padX} y1={y} y2={y} className="chart-grid" />
          );
        })}
        <polygon points={area} fill={`url(#${titleId}-fill)`} />
        <polyline points={line} fill="none" className="chart-line" />
        {coordinates.map((point) => (
          <circle key={`${point.label}-${point.x}`} cx={point.x} cy={point.y} r="5">
            <title>{`${point.label}: ${point.value} ${unit}`}</title>
          </circle>
        ))}
      </svg>
      <div className="trend-chart__labels" aria-hidden="true">
        <span>{points[0]?.label}</span>
        <span>{points.at(-1)?.label}</span>
      </div>
    </div>
  );
}
