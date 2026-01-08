import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { checkApiHealth } from '@/lib/api-client';

interface ApiStatusProps {
  children: React.ReactNode;
}

export function ApiStatusGuard({ children }: ApiStatusProps) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  const checkConnection = async () => {
    setStatus('checking');
    const isHealthy = await checkApiHealth();
    setStatus(isHealthy ? 'connected' : 'disconnected');
  };

  useEffect(() => {
    checkConnection();
  }, [retryCount]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Alert variant="destructive" className="max-w-lg">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to Connect</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p>
              Cannot connect to the SentinelIQ backend server. This could be because:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>The server is not running</li>
              <li>Network connectivity issues</li>
              <li>Firewall blocking the connection</li>
            </ul>
            <Button 
              onClick={() => setRetryCount(c => c + 1)} 
              variant="outline" 
              className="mt-4"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

// Inline status indicator for headers/footers
export function ApiStatusIndicator() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const interval = setInterval(async () => {
      const healthy = await checkApiHealth();
      setIsConnected(healthy);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (isConnected) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600">
        <CheckCircle className="h-3 w-3" />
        <span>Connected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" />
      <span>Disconnected</span>
    </div>
  );
}
