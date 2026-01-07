/**
 * Job Service - API client for background job management
 * 
 * Handles listing, monitoring, retrying, and cancelling background jobs
 * like fraud detection runs, report generation, data exports, etc.
 */

import { api } from '../lib/api';
import type { BackgroundJob, JobStatus } from '../types';

interface JobFromAPI {
  id: string;
  name: string;
  status: string;
  queue: string;
  progress?: number;
  error?: string;
  result?: unknown;
  metadata?: Record<string, unknown>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  attempts?: number;
  max_attempts?: number;
}

interface JobListResponse {
  jobs: JobFromAPI[];
  total: number;
  page: number;
  per_page: number;
}

interface JobQueueStats {
  name: string;
  pending: number;
  running: number;
  completed: number;
  failed: number;
}

interface JobQueuesResponse {
  queues: JobQueueStats[];
}

interface JobLogsResponse {
  logs: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

/**
 * Transform API job response to frontend BackgroundJob type
 */
function transformJob(apiJob: JobFromAPI): BackgroundJob {
  return {
    id: apiJob.id,
    name: apiJob.name,
    status: apiJob.status as JobStatus,
    queue: apiJob.queue,
    progress: apiJob.progress ?? 0,
    error: apiJob.error,
    result: apiJob.result,
    metadata: apiJob.metadata,
    createdAt: apiJob.created_at,
    startedAt: apiJob.started_at,
    completedAt: apiJob.completed_at,
    attempts: apiJob.attempts ?? 0,
    maxAttempts: apiJob.max_attempts ?? 3,
  };
}

export interface JobListParams {
  page?: number;
  per_page?: number;
  status?: JobStatus;
  queue?: string;
  search?: string;
}

export const jobService = {
  /**
   * List all jobs with optional filtering
   */
  async list(params?: JobListParams): Promise<{ jobs: BackgroundJob[]; total: number }> {
    const response = await api.get<JobListResponse>('/api/v1/jobs', { params });
    return {
      jobs: response.jobs.map(transformJob),
      total: response.total,
    };
  },

  /**
   * Get a single job by ID
   */
  async get(jobId: string): Promise<BackgroundJob> {
    const response = await api.get<JobFromAPI>(`/api/v1/jobs/${jobId}`);
    return transformJob(response);
  },

  /**
   * Retry a failed job
   */
  async retry(jobId: string): Promise<BackgroundJob> {
    const response = await api.post<JobFromAPI>(`/api/v1/jobs/${jobId}/retry`);
    return transformJob(response);
  },

  /**
   * Cancel a running or pending job
   */
  async cancel(jobId: string): Promise<BackgroundJob> {
    const response = await api.post<JobFromAPI>(`/api/v1/jobs/${jobId}/cancel`);
    return transformJob(response);
  },

  /**
   * Get job logs
   */
  async getLogs(jobId: string): Promise<string[]> {
    try {
      const response = await api.get<JobLogsResponse>(`/api/v1/jobs/${jobId}/logs`);
      return response.logs.map(log => `[${log.timestamp}] ${log.level}: ${log.message}`);
    } catch {
      // Return empty logs if endpoint doesn't exist
      return [];
    }
  },

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<JobQueueStats[]> {
    try {
      const response = await api.get<JobQueuesResponse>('/api/v1/jobs/queues');
      return response.queues;
    } catch {
      // Return empty stats if endpoint doesn't exist
      return [];
    }
  },

  /**
   * Get job statistics summary
   */
  async getStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    total: number;
  }> {
    try {
      const response = await api.get<{
        pending: number;
        running: number;
        completed: number;
        failed: number;
        total: number;
      }>('/api/v1/jobs/stats');
      return response;
    } catch {
      // Fallback: calculate from job list
      const { jobs } = await this.list({ per_page: 1000 });
      return {
        pending: jobs.filter(j => j.status === 'pending').length,
        running: jobs.filter(j => j.status === 'running').length,
        completed: jobs.filter(j => j.status === 'completed').length,
        failed: jobs.filter(j => j.status === 'failed').length,
        total: jobs.length,
      };
    }
  },
};

export default jobService;
