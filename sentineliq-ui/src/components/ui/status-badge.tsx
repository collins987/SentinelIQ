import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
        success: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
        warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        processing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      },
      size: {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
      pulse: {
        true: '',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      pulse: false,
    },
  }
);

const dotVariants = cva('h-1.5 w-1.5 rounded-full', {
  variants: {
    variant: {
      default: 'bg-gray-500',
      success: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      processing: 'bg-purple-500',
    },
    pulse: {
      true: 'animate-pulse',
      false: '',
    },
  },
  defaultVariants: {
    variant: 'default',
    pulse: false,
  },
});

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  showDot?: boolean;
}

export function StatusBadge({
  className,
  variant,
  size,
  pulse,
  showDot = true,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size, pulse }), className)}
      {...props}
    >
      {showDot && (
        <span className={cn(dotVariants({ variant, pulse }))} />
      )}
      {children}
    </span>
  );
}

// Preset status badges for common states
export function HealthyBadge({ children = 'Healthy', ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="success" {...props}>{children}</StatusBadge>;
}

export function WarningBadge({ children = 'Warning', ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="warning" {...props}>{children}</StatusBadge>;
}

export function ErrorBadge({ children = 'Error', ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="error" {...props}>{children}</StatusBadge>;
}

export function ProcessingBadge({ children = 'Processing', ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="processing" pulse {...props}>{children}</StatusBadge>;
}

export function PendingBadge({ children = 'Pending', ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="default" {...props}>{children}</StatusBadge>;
}
