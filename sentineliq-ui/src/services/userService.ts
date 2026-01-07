// ============================================================================
// User Service - Production-ready API service for user management
// ============================================================================

import { api } from '../lib/api';
import type { User } from '../types';

export interface UserFromAPI {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: UserFromAPI[];
  total: number;
  page: number;
  page_size: number;
}

export interface UserCreateRequest {
  email: string;
  first_name: string;
  last_name: string;
  password: string;
  role?: string;
}

export interface UserUpdateRequest {
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
}

/**
 * Transform API user to frontend format
 */
function transformUser(apiUser: UserFromAPI): User {
  return {
    id: apiUser.id,
    email: apiUser.email,
    name: `${apiUser.first_name} ${apiUser.last_name}`.trim(),
    username: apiUser.email.split('@')[0],
    status: apiUser.is_active ? 'active' : 'inactive',
    lastLogin: apiUser.last_login,
    createdAt: apiUser.created_at,
    roles: apiUser.role ? [{
      id: apiUser.role,
      name: apiUser.role,
      description: '',
      permissions: [],
      userCount: 0,
      createdAt: '',
      updatedAt: '',
    }] : [],
  };
}

/**
 * User Service - handles all user-related API calls
 */
export const userService = {
  /**
   * Fetch all users with pagination
   */
  async list(params?: { 
    limit?: number; 
    offset?: number; 
    status?: string;
    search?: string;
  }): Promise<{
    users: User[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const response = await api.get<UserListResponse>('/users', { params });
    return {
      users: response.users.map(transformUser),
      total: response.total,
      page: response.page,
      pageSize: response.page_size,
    };
  },

  /**
   * Get a single user by ID
   */
  async get(id: string): Promise<User> {
    const response = await api.get<UserFromAPI>(`/users/${id}`);
    return transformUser(response);
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    const response = await api.get<UserFromAPI>('/users/me');
    return transformUser(response);
  },

  /**
   * Create a new user
   */
  async create(data: UserCreateRequest): Promise<User> {
    const response = await api.post<UserFromAPI>('/users', data);
    return transformUser(response);
  },

  /**
   * Update a user
   */
  async update(id: string, data: UserUpdateRequest): Promise<User> {
    const response = await api.patch<UserFromAPI>(`/users/${id}`, data);
    return transformUser(response);
  },

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  /**
   * Disable a user (admin only)
   */
  async disable(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/disable`);
  },

  /**
   * Enable a user (admin only)
   */
  async enable(id: string): Promise<void> {
    await api.post(`/admin/users/${id}/enable`);
  },

  /**
   * Change user role (admin only)
   */
  async changeRole(id: string, newRole: string): Promise<void> {
    await api.post(`/admin/users/${id}/change-role`, null, {
      params: { new_role: newRole },
    });
  },
};

export default userService;
