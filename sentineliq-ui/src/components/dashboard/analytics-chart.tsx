import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';

interface ChartDataPoint {
  name: string;
  value: number;
  secondary?: number;
}

interface AnalyticsChartProps {
  title: string;
  data: ChartDataPoint[];
  type?: 'area' | 'bar';
  color?: string;
  secondaryColor?: string;
  loading?: boolean;
  className?: string;
  height?: number;
}

const timeRanges = ['24h', '7d', '30d', '90d'] as const;
type TimeRange = (typeof timeRanges)[number];

export function AnalyticsChart({
  title,
  data,
  type = 'area',
  color = '#3b82f6',
  secondaryColor = '#10b981',
  loading = false,
  className,
  height = 300,
}: AnalyticsChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');

  const chartData = useMemo(() => {
    // In a real app, filter based on timeRange
    return data;
  }, [data, timeRange]);

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                timeRange === range
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4" style={{ height }}>
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                  {secondaryColor && (
                    <linearGradient id="colorSecondary" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={secondaryColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={secondaryColor} stopOpacity={0} />
                    </linearGradient>
                  )}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: '#9ca3af' }} />
                <YAxis className="text-xs" tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ color: '#fff', marginBottom: '4px' }}
                  itemStyle={{ color: '#9ca3af' }}
                />
                <Area type="monotone" dataKey="value" stroke={color} fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                {chartData[0]?.secondary !== undefined && (
                  <Area type="monotone" dataKey="secondary" stroke={secondaryColor} fillOpacity={1} fill="url(#colorSecondary)" strokeWidth={2} />
                )}
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis dataKey="name" className="text-xs" tick={{ fill: '#9ca3af' }} />
                <YAxis className="text-xs" tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
                {chartData[0]?.secondary !== undefined && (
                  <Bar dataKey="secondary" fill={secondaryColor} radius={[4, 4, 0, 0]} />
                )}
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
