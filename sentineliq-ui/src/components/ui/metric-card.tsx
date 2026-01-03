import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  className?: string;
  valueClassName?: string;
  loading?: boolean;
  onClick?: () => void;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className,
  valueClassName,
  loading = false,
  onClick,
}: MetricCardProps) {
  const TrendIcon = trend?.direction === 'up' 
    ? TrendingUp 
    : trend?.direction === 'down' 
    ? TrendingDown 
    : Minus;

  const trendColor = trend?.direction === 'up'
    ? 'text-emerald-500'
    : trend?.direction === 'down'
    ? 'text-red-500'
    : 'text-gray-500';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all dark:border-gray-800 dark:bg-gray-900',
        onClick && 'cursor-pointer hover:border-gray-300 hover:shadow-md dark:hover:border-gray-700',
        className
      )}
      onClick={onClick}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-gray-100 to-transparent opacity-50 dark:from-gray-800" />
      
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {title}
            </p>
            {loading ? (
              <div className="h-8 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            ) : (
              <p className={cn(
                'text-2xl font-bold tracking-tight text-gray-900 dark:text-white',
                valueClassName
              )}>
                {value}
              </p>
            )}
          </div>
          {Icon && (
            <div className="rounded-lg bg-gray-100 p-2 dark:bg-gray-800">
              <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          )}
        </div>

        {(trend || subtitle) && (
          <div className="mt-3 flex items-center gap-2">
            {trend && (
              <span className={cn('flex items-center gap-1 text-sm font-medium', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {trend?.label || subtitle}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Compact version for dense layouts
export function MetricCardCompact({
  title,
  value,
  icon: Icon,
  trend,
  className,
}: Omit<MetricCardProps, 'subtitle'>) {
  const trendColor = trend?.direction === 'up'
    ? 'text-emerald-500'
    : trend?.direction === 'down'
    ? 'text-red-500'
    : 'text-gray-500';

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900',
        className
      )}
    >
      {Icon && (
        <div className="rounded-md bg-gray-100 p-1.5 dark:bg-gray-800">
          <Icon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
      {trend && (
        <span className={cn('text-sm font-medium', trendColor)}>
          {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
          {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  );
}
