"use client";

export interface ChartPoint {
  label: string;
  value: number | null;
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD = 32;

export function SimpleLineChart({ points, color = "#0f172a", valueSuffix = "" }: { points: ChartPoint[]; color?: string; valueSuffix?: string }) {
  const valid = points.filter((p): p is { label: string; value: number } => p.value !== null);
  if (valid.length === 0) {
    return <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">No data available</div>;
  }
  const values = valid.map((p) => p.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = (WIDTH - PAD * 2) / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = p.value === null ? null : HEIGHT - PAD - ((p.value - min) / range) * (HEIGHT - PAD * 2);
    return { x, y, point: p };
  });

  const linePath = coords
    .filter((c) => c.y !== null)
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const areaPath = coords.filter((c) => c.y !== null).length > 0
    ? `${linePath} L ${coords[coords.length - 1].x} ${HEIGHT - PAD} L ${coords[0].x} ${HEIGHT - PAD} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" preserveAspectRatio="none">
      <line x1={PAD} y1={HEIGHT - PAD} x2={WIDTH - PAD} y2={HEIGHT - PAD} stroke="#e2e8f0" strokeWidth={1} />
      {areaPath && <path d={areaPath} fill={color} opacity={0.08} />}
      {linePath && <path d={linePath} fill="none" stroke={color} strokeWidth={2} />}
      {coords.map((c, i) =>
        c.y !== null ? (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={3} fill={color} />
            <title>{`${c.point.label}: ${c.point.value}${valueSuffix}`}</title>
          </g>
        ) : null
      )}
      {points.map((p, i) => {
        if (points.length > 8 && i % Math.ceil(points.length / 8) !== 0) return null;
        const x = PAD + i * stepX;
        return (
          <text key={i} x={x} y={HEIGHT - 10} fontSize={10} textAnchor="middle" fill="#94a3b8">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}
