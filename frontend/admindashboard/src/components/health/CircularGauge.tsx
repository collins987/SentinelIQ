import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { useMemo } from 'react';

interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  size?: number;
  thresholds?: { green: number; yellow: number };
  invert?: boolean;
}

const COLOR_MAP = {
  green: { fill: '#22c55e', glow: 'rgba(34,197,94,0.25)', track: 'rgba(34,197,94,0.08)' },
  yellow: { fill: '#eab308', glow: 'rgba(234,179,8,0.25)', track: 'rgba(234,179,8,0.08)' },
  red: { fill: '#ef4444', glow: 'rgba(239,68,68,0.25)', track: 'rgba(239,68,68,0.08)' },
} as const;

export default function CircularGauge({
  value,
  max,
  label,
  unit = '%',
  size = 140,
  thresholds = { green: 60, yellow: 80 },
  invert = false,
}: CircularGaugeProps) {
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const displayValue = unit === '%' ? Math.round(percent) : value;

  const colorKey = useMemo(() => {
    if (invert) {
      return percent >= thresholds.green ? 'green' : percent >= thresholds.yellow ? 'yellow' : 'red';
    }
    return percent <= thresholds.green ? 'green' : percent <= thresholds.yellow ? 'yellow' : 'red';
  }, [percent, thresholds, invert]);

  const palette = COLOR_MAP[colorKey];
  const data = [{ value: percent, fill: palette.fill }];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        style={{
          width: size,
          height: size,
          filter: `drop-shadow(0 0 8px ${palette.glow})`,
        }}
        className="relative transition-[filter] duration-500"
      >
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="72%"
            outerRadius="100%"
            barSize={10}
            data={data}
            startAngle={225}
            endAngle={-45}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: palette.track }}
              dataKey="value"
              cornerRadius={10}
              angleAxisId={0}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-extrabold tabular-nums leading-none" style={{ color: palette.fill }}>
            {displayValue}
          </span>
          {unit && (
            <span className="text-[10px] font-medium mt-0.5 text-gray-500">{unit}</span>
          )}
        </div>
      </div>
      <span className="text-[11px] font-medium text-gray-400 text-center leading-tight">{label}</span>
    </div>
  );
}
