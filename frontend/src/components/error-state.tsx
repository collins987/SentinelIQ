import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  error: ApiError | Error | string;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

export function ErrorState({ 
  error, 
  onRetry, 
  className,
  title = 'Error'
}: ErrorStateProps) {
  const isNetworkError = error instanceof ApiError && error.status === 0;
  const message = typeof error === 'string' 
    ? error 
    : error.message || 'An unexpected error occurred';

  return (
    <div className={cn('py-8', className)}>
      <Alert variant="destructive" className="max-w-lg mx-auto">
        {isNetworkError ? (
          <WifiOff className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <AlertTitle>{isNetworkError ? 'Connection Error' : title}</AlertTitle>
        <AlertDescription className="mt-2">
          <p>{message}</p>
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              size="sm" 
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Page-level error state
export function PageErrorState({ 
  error, 
  onRetry,
  pageName = 'page' 
}: { 
  error: ApiError | Error | string;
  onRetry?: () => void;
  pageName?: string;
}) {
  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <ErrorState 
        error={error} 
        onRetry={onRetry}
        title={`Failed to load ${pageName}`}
      />
    </div>
  );
}
