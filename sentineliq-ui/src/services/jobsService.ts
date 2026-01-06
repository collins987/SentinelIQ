/**
 * Jobs Service
 * Manages background job operations with mock/real API switching
 */

import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';
import type { BackgroundJob } from '../types/index';

// Mock jobs data
const mockJobs: BackgroundJob[] = [
  {
    id: 'job-1',
    name: 'Generate Monthly Report',
    type: 'report',
    status: 'running',
    progress: 67,
    createdAt: new Date(Date.now() - 300000).toISOString(),
    startedAt: new Date(Date.now() - 240000).toISOString(),
    retryCount: 0,
    maxRetries: 3,
    metadata: { reportType: 'monthly', month: 'December' },
    queue: 'default',
  },
  {
    id: 'job-2',
    name: 'Send Email Notifications',
    type: 'notification',
    status: 'pending',
    progress: 0,
    createdAt: new Date(Date.now() - 120000).toISOString(),
    retryCount: 0,
    maxRetries: 3,
    metadata: { recipients: 150 },
    queue: 'email',
  },
  {
    id: 'job-3',
    name: 'Data Sync - External API',
    type: 'sync',
    status: 'completed',
    progress: 100,
    createdAt: new Date(Date.now() - 600000).toISOString(),
    startedAt: new Date(Date.now() - 550000).toISOString(),
    completedAt: new Date(Date.now() - 300000).toISOString(),
    retryCount: 0,
    maxRetries: 3,
    metadata: { recordsSynced: 1250 },
    queue: 'sync',
  },
  {
    id: 'job-4',
    name: 'Cleanup Old Sessions',
    type: 'maintenance',
    status: 'failed',
    progress: 45,
    createdAt: new Date(Date.now() - 900000).toISOString(),
    startedAt: new Date(Date.now() - 850000).toISOString(),
    retryCount: 2,
    maxRetries: 3,
    error: 'Connection timeout to database',
    metadata: {},
    queue: 'maintenance',
  },
];

export const jobsService = {
  /**
   * List all jobs with optional filters
   */
  async list(params?: { status?: string; queue?: string }): Promise<BackgroundJob[]> {
    if (config.enableMockData) {
      await simulateApiDelay();
      
      let filtered = [...mockJobs];
      if (params?.status) {
        filtered = filtered.filter((j) => j.status === params.status);
      }
      if (params?.queue) {
        filtered = filtered.filter((j) => j.queue === params.queue);
      }
      
      return filtered;
    }

    try {
      return await endpoints.jobs.list(params) as BackgroundJob[];
    } catch (error) {
      console.error('[jobsService] Failed to fetch jobs:', error);
      throw new Error('Failed to load jobs from server');
    }
  },

  /**
   * Get job by ID
   */
  async get(id: string): Promise<BackgroundJob> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const job = mockJobs.find((j) => j.id === id);
      if (!job) {
        throw new Error('Job not found');
      }
      return { ...job };
    }

    try {
      return await endpoints.jobs.get(id);
    } catch (error) {
      console.error(`[jobsService] Failed to fetch job ${id}:`, error);
      throw new Error('Failed to load job details');
    }
  },

  /**
   * Cancel a running or pending job
   */
  async cancel(id: string): Promise<void> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const job = mockJobs.find((j) => j.id === id);
      if (!job) {
        throw new Error('Job not found');
      }
      if (job.status !== 'running' && job.status !== 'pending') {
        throw new Error('Only running or pending jobs can be cancelled');
      }
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      return;
    }

    try {
      await endpoints.jobs.cancel(id);
    } catch (error) {
      console.error(`[jobsService] Failed to cancel job ${id}:`, error);
      throw new Error('Failed to cancel job');
    }
  },

  /**
   * Retry a failed job
   */
  async retry(id: string): Promise<void> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const job = mockJobs.find((j) => j.id === id);
      if (!job) {
        throw new Error('Job not found');
      }
      if (job.status !== 'failed') {
        throw new Error('Only failed jobs can be retried');
      }
      job.status = 'pending';
      job.progress = 0;
      job.retryCount += 1;
      job.error = undefined;
      job.completedAt = undefined;
      return;
    }

    try {
      await endpoints.jobs.retry(id);
    } catch (error) {
      console.error(`[jobsService] Failed to retry job ${id}:`, error);
      throw new Error('Failed to retry job');
    }
  },

  /**
   * Get queue statistics
   */
  async getQueues(): Promise<{ name: string; pending: number; active: number; completed: number; failed: number }[]> {
    if (config.enableMockData) {
      await simulateApiDelay();
      
      const queues = ['default', 'email', 'sync', 'maintenance'];
      return queues.map((name) => {
        const queueJobs = mockJobs.filter((j) => j.queue === name);
        return {
          name,
          pending: queueJobs.filter((j) => j.status === 'pending').length,
          active: queueJobs.filter((j) => j.status === 'running').length,
          completed: queueJobs.filter((j) => j.status === 'completed').length,
          failed: queueJobs.filter((j) => j.status === 'failed').length,
          delayed: 0,
        };
      });
    }

    try {
      return await endpoints.jobs.queues() as { name: string; pending: number; active: number; completed: number; failed: number; delayed: number }[];
    } catch (error) {
      console.error('[jobsService] Failed to fetch queue stats:', error);
      throw new Error('Failed to load queue statistics');
    }
  },
};
