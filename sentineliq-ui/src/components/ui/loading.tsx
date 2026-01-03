import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-blue-500 border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  );
}

export function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900', className)}>
      <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-4 h-8 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
      <div className="mt-4 h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 rounded bg-gray-100 dark:bg-gray-800" />
      ))}
    </div>
  );
}
