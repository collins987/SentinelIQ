import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@/components/error-boundary';
import { ApiStatusGuard } from '@/components/api-status';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import AppRoutes from '@/routes';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="system" storageKey="sentineliq-theme">
        <BrowserRouter>
          <ApiStatusGuard>
            <AppRoutes />
            <Toaster />
          </ApiStatusGuard>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
