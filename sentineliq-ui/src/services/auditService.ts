// ============================================================================
// Audit Service - Production-ready API service for audit logs
// ============================================================================

import { api } from '../lib/api';
import type { AuditEntry, AuditChange } from '../types';

export interface AuditLogFromAPI {
  id: string;
  actor_id: string;
  action: string;
  target: string;
  timestamp: string;
  event_metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

export interface AuditListResponse {
  count: number;
  logs: AuditLogFromAPI[];
}

/**
 * Transform API audit log to frontend format
 */
function transformAuditEntry(apiLog: AuditLogFromAPI): AuditEntry {
  // Parse changes from metadata if available
  const changes: AuditChange[] = [];
  if (apiLog.event_metadata) {
    Object.entries(apiLog.event_metadata).forEach(([field, value]) => {
      if (typeof value === 'object' && value !== null && 'from' in value && 'to' in value) {
        changes.push({
          field,
          oldValue: (value as { from: unknown; to: unknown }).from,
          newValue: (value as { from: unknown; to: unknown }).to,
        });
      }
    });
  }

  // Extract entity type from action (e.g., 'user_created' -> 'user')
  const actionParts = apiLog.action.split('_');
  const entityType = actionParts[0] || 'unknown';
  const actionType = actionParts.slice(1).join('_') || apiLog.action;

  return {
    id: apiLog.id,
    action: actionType,
    entityType: entityType,
    entityId: apiLog.target,
    userId: apiLog.actor_id,
    userName: apiLog.event_metadata?.actor_name as string || apiLog.actor_id,
    timestamp: apiLog.timestamp,
    changes: changes,
    ipAddress: apiLog.ip_address || 'N/A',
    userAgent: apiLog.user_agent || 'N/A',
  };
}

/**
 * Audit Service - handles all audit log related API calls
 */
export const auditService = {
  /**
   * Fetch audit logs with pagination
   */
  async list(params?: { 
    limit?: number; 
    offset?: number;
    action?: string;
    entity_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    entries: AuditEntry[];
    count: number;
  }> {
    const response = await api.get<AuditListResponse>('/admin/audit-logs', { params });
    return {
      entries: response.logs.map(transformAuditEntry),
      count: response.count,
    };
  },

  /**
   * Get a single audit entry by ID
   */
  async get(id: string): Promise<AuditEntry> {
    const response = await api.get<AuditLogFromAPI>(`/admin/audit-logs/${id}`);
    return transformAuditEntry(response);
  },

  /**
   * Export audit logs to CSV
   */
  async export(params?: {
    start_date?: string;
    end_date?: string;
    format?: 'csv' | 'json';
  }): Promise<Blob> {
    const response = await api.get<Blob>('/admin/audit-logs/export', {
      params,
      responseType: 'blob',
    } as any);
    return response;
  },
};

export default auditService;
