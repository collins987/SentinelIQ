// ============================================
// Core System Types
// ============================================

export type SystemStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying' | 'cancelled';
export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';
export type NotificationType = 'success' | 'warning' | 'error' | 'info';

// ============================================
// Backend Job & Task Types
// ============================================

export interface BackgroundJob {
  id: string;
  name: string;
  type: string;
  status: JobStatus;
  progress: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  retryCount: number;
  maxRetries: number;
  error?: string;
  metadata?: Record<string, unknown>;
  queue: string;
}

export interface JobQueue {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

// ============================================
// Event & Activity Types
// ============================================

export interface SystemEvent {
  id: string;
  type: string;
  severity: EventSeverity;
  message: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  resourceId?: string;
  resourceType?: string;
}

export interface ActivityLogEntry {
  id: string;
  action: string;
  actor: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  target?: {
    type: string;
    id: string;
    name: string;
  };
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}

// ============================================
// API & Service Health Types
// ============================================

export interface ServiceHealth {
  name: string;
  status: SystemStatus;
  latency: number;
  uptime: number;
  lastCheck: string;
  details?: Record<string, unknown>;
}

export interface APIEndpointStatus {
  path: string;
  method: string;
  avgLatency: number;
  requestCount: number;
  errorRate: number;
  lastCalled: string;
}

// ============================================
// Workflow Types
// ============================================

export interface WorkflowState {
  id: string;
  name: string;
  currentStep: string;
  steps: WorkflowStep[];
  status: 'active' | 'paused' | 'completed' | 'failed';
  startedAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
  order: number;
  duration?: number;
  error?: string;
}

// ============================================
// Permission & Role Types
// ============================================

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Permission {
  id: string;
  resource: string;
  action: string;
  scope?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  roles: Role[];
  lastLogin?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
}

// ============================================
// Analytics & Metrics Types
// ============================================

export interface MetricDataPoint {
  timestamp: string;
  value: number;
}

export interface DashboardMetrics {
  totalUsers: number;
  activeJobs: number;
  systemHealth: SystemStatus;
  alertCount: number;
  apiRequests24h: number;
  errorRate: number;
  avgResponseTime: number;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// Audit Trail Types
// ============================================

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName: string;
  timestamp: string;
  changes: AuditChange[];
  ipAddress: string;
  userAgent: string;
}

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}
