export function BarChart({
  points,
  labels,
  color,
  formatValue,
}: {
  points: number[];
  labels: string[];
  color: string;
  formatValue?: (n: number) => string;
}) {
  const width = 600;
  const height = 180;
  const padding = 24;
  const max = Math.max(1, ...points);
  const barWidth = (width - padding * 2) / points.length;

  if (points.every((p) => p === 0)) {
    return <p className="flex h-[180px] items-center justify-center text-sm text-zinc-400">No data for this period yet.</p>;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      {points.map((value, i) => {
        const barHeight = (value / max) * (height - padding * 2);
        const x = padding + i * barWidth + barWidth * 0.15;
        const y = height - padding - barHeight;
        const w = barWidth * 0.7;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={Math.max(barHeight, value > 0 ? 2 : 0)} rx={3} fill={color} opacity={0.85}>
              <title>
                {labels[i]}: {formatValue ? formatValue(value) : value}
              </title>
            </rect>
            {points.length <= 14 && (
              <text x={x + w / 2} y={height - 6} textAnchor="middle" fontSize="9" fill="#a1a1aa">
                {labels[i].split(" ")[0]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
