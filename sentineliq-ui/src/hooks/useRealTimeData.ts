import { useEffect, useCallback, useRef } from 'react';
import { useJobsStore, useEventsStore, useSystemHealthStore, useNotificationsStore } from '@/stores';

interface UseRealTimeDataOptions {
  enablePolling?: boolean;
  pollingInterval?: number;
  enableMockData?: boolean;
}

export function useRealTimeData(options: UseRealTimeDataOptions = {}) {
  const { enablePolling = true, pollingInterval = 5000, enableMockData = true } = options;
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const addEvent = useEventsStore((s) => s.addEvent);
  const addJob = useJobsStore((s) => s.addJob);
  const updateJob = useJobsStore((s) => s.updateJob);
  const jobs = useJobsStore((s) => s.jobs);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const setServices = useSystemHealthStore((s) => s.setServices);

  const generateMockEvent = useCallback(() => {
    const types = ['user.login', 'user.logout', 'api.request', 'job.started', 'job.completed', 'system.alert'];
    const severities = ['info', 'warning', 'error'] as const;
    const sources = ['auth', 'api', 'job', 'system'];
    const messages = [
      'User logged in successfully',
      'API rate limit warning',
      'Background job completed',
      'New user registration',
      'Password reset requested',
      'File upload completed',
      'Database backup finished',
    ];

    return {
      id: crypto.randomUUID(),
      type: types[Math.floor(Math.random() * types.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      timestamp: new Date().toISOString(),
    };
  }, []);

  const updateRunningJobs = useCallback(() => {
    jobs
      .filter((j) => j.status === 'running')
      .forEach((job) => {
        const newProgress = Math.min(job.progress + Math.floor(Math.random() * 15) + 5, 100);
        if (newProgress >= 100) {
          updateJob(job.id, { progress: 100, status: 'completed', completedAt: new Date().toISOString() });
        } else {
          updateJob(job.id, { progress: newProgress });
        }
      });
  }, [jobs, updateJob]);

  const simulateRealTimeUpdates = useCallback(() => {
    // Randomly add events
    if (Math.random() > 0.7) {
      addEvent(generateMockEvent());
    }

    // Update running jobs
    updateRunningJobs();

    // Occasionally add notifications
    if (Math.random() > 0.95) {
      const types = ['success', 'warning', 'error', 'info'] as const;
      addNotification({
        id: crypto.randomUUID(),
        type: types[Math.floor(Math.random() * types.length)],
        title: 'System Update',
        message: 'A new system update is available',
        timestamp: new Date().toISOString(),
        read: false,
      });
    }

    // Update service health occasionally
    if (Math.random() > 0.9) {
      setServices([
        { name: 'API', status: 'healthy', latency: 30 + Math.floor(Math.random() * 40), uptime: 99.9 + Math.random() * 0.1, lastCheck: new Date().toISOString() },
        { name: 'Database', status: 'healthy', latency: 5 + Math.floor(Math.random() * 15), uptime: 99.95 + Math.random() * 0.05, lastCheck: new Date().toISOString() },
        { name: 'Redis', status: 'healthy', latency: 1 + Math.floor(Math.random() * 5), uptime: 100, lastCheck: new Date().toISOString() },
        { name: 'Storage', status: Math.random() > 0.9 ? 'degraded' : 'healthy', latency: 100 + Math.floor(Math.random() * 200), uptime: 98 + Math.random() * 2, lastCheck: new Date().toISOString() },
      ]);
    }
  }, [addEvent, generateMockEvent, updateRunningJobs, addNotification, setServices]);

  useEffect(() => {
    if (enablePolling && enableMockData) {
      intervalRef.current = setInterval(simulateRealTimeUpdates, pollingInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enablePolling, enableMockData, pollingInterval, simulateRealTimeUpdates]);

  return {
    generateMockEvent,
    simulateRealTimeUpdates,
  };
}
