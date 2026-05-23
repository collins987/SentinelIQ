import { useEffect, useMemo, useState } from 'react';
import ReactECharts from 'echarts-for-react';

interface Point {
  time: string;
  value: number;
}

interface RealtimeLineChartProps {
  title: string;
  subtitle?: string;
}

export default function RealtimeLineChart({ title, subtitle }: RealtimeLineChartProps) {
  const [points, setPoints] = useState<Point[]>(() => {
    const now = Date.now();
    return Array.from({ length: 12 }).map((_, i) => ({
      time: new Date(now - (11 - i) * 5000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      value: Math.round(40 + Math.random() * 60),
    }));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setPoints((prev) => {
        const next = prev.slice(1);
        next.push({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          value: Math.round(40 + Math.random() * 60),
        });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const option = useMemo(() => ({
    grid: { left: 24, right: 18, top: 30, bottom: 24 },
    xAxis: {
      type: 'category',
      data: points.map((p) => p.time),
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#334155' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'line',
        data: points.map((p) => p.value),
        smooth: true,
        lineStyle: { color: '#38bdf8', width: 2 },
        areaStyle: { color: 'rgba(56, 189, 248, 0.18)' },
        showSymbol: false,
      },
    ],
  }), [points]);

  return (
    <div className="card h-full">
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="mt-1 text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 240 }} notMerge={true} lazyUpdate={true} />
    </div>
  );
}
