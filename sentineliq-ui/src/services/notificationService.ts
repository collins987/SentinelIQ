// ============================================================================
// Notification Service - Production-ready API service for notifications
// ============================================================================

import { api } from '../lib/api';
import type { Notification, NotificationType } from '../types';

export interface NotificationFromAPI {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action_url?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationListResponse {
  notifications: NotificationFromAPI[];
  total: number;
  unread_count: number;
}

export interface NotificationCreateRequest {
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  entity_type?: string;
  entity_id?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transform API notification to frontend format
 */
function transformNotification(apiNotification: NotificationFromAPI): Notification {
  return {
    id: apiNotification.id,
    type: apiNotification.type,
    title: apiNotification.title,
    message: apiNotification.message,
    timestamp: apiNotification.timestamp,
    read: apiNotification.read,
    actionUrl: apiNotification.action_url,
    metadata: {
      ...apiNotification.metadata,
      entityType: apiNotification.entity_type,
      entityId: apiNotification.entity_id,
    },
  };
}

/**
 * Notification Service - handles all notification-related API calls
 */
export const notificationService = {
  /**
   * Fetch all notifications for the current user
   */
  async list(params?: { limit?: number; offset?: number; unread_only?: boolean }): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    const response = await api.get<NotificationListResponse>('/api/v1/notifications', { params });
    return {
      notifications: response.notifications.map(transformNotification),
      total: response.total,
      unreadCount: response.unread_count,
    };
  },

  /**
   * Get a single notification by ID
   */
  async get(id: string): Promise<Notification> {
    const response = await api.get<NotificationFromAPI>(`/api/v1/notifications/${id}`);
    return transformNotification(response);
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    await api.patch(`/api/v1/notifications/${id}/read`);
  },

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    await api.post('/api/v1/notifications/mark-all-read');
  },

  /**
   * Delete a notification
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/api/v1/notifications/${id}`);
  },

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    await api.delete('/api/v1/notifications/clear');
  },

  /**
   * Get unread count
   */
  async getUnreadCount(): Promise<number> {
    const response = await api.get<{ count: number }>('/api/v1/notifications/unread-count');
    return response.count;
  },
};

export default notificationService;
