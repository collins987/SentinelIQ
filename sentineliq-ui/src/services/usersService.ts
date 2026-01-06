/**
 * Users Service
 * Abstracts user data operations with automatic mock/real API switching
 */

import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';
import type { User, Role } from '../types/index';

// Mock data (only used when config.enableMockData is true)
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@sentineliq.io',
    name: 'Admin User',
    roles: [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: [],
        userCount: 1,
        createdAt: '2025-12-01T00:00:00Z',
        updatedAt: '2025-12-01T00:00:00Z',
      },
    ],
    lastLogin: new Date(Date.now() - 3600000).toISOString(),
    status: 'active' as const,
    createdAt: '2025-12-01T00:00:00Z',
  },
  {
    id: '2',
    email: 'analyst@sentineliq.io',
    name: 'Risk Analyst',
    roles: [
      {
        id: 'analyst',
        name: 'Risk Analyst',
        description: 'Can analyze and review risks',
        permissions: [],
        userCount: 3,
        createdAt: '2025-12-05T00:00:00Z',
        updatedAt: '2025-12-05T00:00:00Z',
      },
    ],
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
    status: 'active' as const,
    createdAt: '2025-12-05T00:00:00Z',
  },
  {
    id: '3',
    email: 'viewer@sentineliq.io',
    name: 'Read Only User',
    roles: [
      {
        id: 'viewer',
        name: 'Viewer',
        description: 'Read-only access',
        permissions: [],
        userCount: 10,
        createdAt: '2025-12-10T00:00:00Z',
        updatedAt: '2025-12-10T00:00:00Z',
      },
    ],
    lastLogin: new Date(Date.now() - 172800000).toISOString(),
    status: 'active' as const,
    createdAt: '2025-12-10T00:00:00Z',
  },
];

export const usersService = {
  /**
   * List all users
   */
  async list(): Promise<User[]> {
    if (config.enableMockData) {
      await simulateApiDelay();
      return [...mockUsers]; // Return copy to prevent mutations
    }

    try {
      return await endpoints.users.list() as User[];
    } catch (error) {
      console.error('[usersService] Failed to fetch users:', error);
      throw new Error('Failed to load users from server');
    }
  },

  /**
   * Get user by ID
   */
  async get(id: string): Promise<User> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const user = mockUsers.find((u) => u.id === id);
      if (!user) {
        throw new Error('User not found');
      }
      return { ...user };
    }

    try {
      return await endpoints.users.get(id) as User;
    } catch (error) {
      console.error(`[usersService] Failed to fetch user ${id}:`, error);
      throw new Error('Failed to load user details');
    }
  },

  /**
   * Create new user
   */
  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const newUser: User = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };
      mockUsers.push(newUser);
      return { ...newUser };
    }

    try {
      return await endpoints.users.create(data) as User;
    } catch (error) {
      console.error('[usersService] Failed to create user:', error);
      throw new Error('Failed to create user');
    }
  },

  /**
   * Update existing user
   */
  async update(id: string, data: Partial<User>): Promise<User> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const index = mockUsers.findIndex((u) => u.id === id);
      if (index === -1) {
        throw new Error('User not found');
      }

      mockUsers[index] = { ...mockUsers[index], ...data };
      return { ...mockUsers[index] };
    }

    try {
      return await endpoints.users.update(id, data) as User;
    } catch (error) {
      console.error(`[usersService] Failed to update user ${id}:`, error);
      throw new Error('Failed to update user');
    }
  },

  /**
   * Delete user
   */
  async delete(id: string): Promise<void> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const index = mockUsers.findIndex((u) => u.id === id);
      if (index === -1) {
        throw new Error('User not found');
      }
      mockUsers.splice(index, 1);
      return;
    }

    try {
      await endpoints.users.delete(id);
    } catch (error) {
      console.error(`[usersService] Failed to delete user ${id}:`, error);
      throw new Error('Failed to delete user');
    }
  },
};
