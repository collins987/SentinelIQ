/**
 * Roles Service
 * Manages role and permission operations with mock/real API switching
 */

import { config } from '../lib/config';
import { endpoints } from '../lib/api';
import { simulateApiDelay } from '../hooks/useActions';
import type { Role } from '../types/index';

// Mock roles data
const mockRoles: Role[] = [
  {
    id: 'admin',
    name: 'Administrator',
    description: 'Full system access with all permissions',
    permissions: ['users.create', 'users.read', 'users.update', 'users.delete', 'roles.manage', 'settings.manage', 'audit.view', 'reports.generate'] as any,
    userCount: 2,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'analyst',
    name: 'Risk Analyst',
    description: 'Can analyze and review risks, generate reports',
    permissions: ['users.read', 'events.read', 'events.analyze', 'audit.view', 'reports.generate', 'reports.view'] as any,
    userCount: 15,
    createdAt: '2025-01-05T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'operator',
    name: 'System Operator',
    description: 'Can manage day-to-day operations',
    permissions: ['users.read', 'events.read', 'events.respond', 'jobs.manage', 'audit.view'] as any,
    userCount: 8,
    createdAt: '2025-01-10T00:00:00Z',
    updatedAt: '2025-01-20T00:00:00Z',
  },
  {
    id: 'viewer',
    name: 'Viewer',
    description: 'Read-only access to events and reports',
    permissions: ['events.read', 'reports.view', 'dashboard.view'] as any,
    userCount: 45,
    createdAt: '2025-01-12T00:00:00Z',
    updatedAt: '2025-01-25T00:00:00Z',
  },
];

export const rolesService = {
  /**
   * List all roles
   */
  async list(): Promise<Role[]> {
    if (config.enableMockData) {
      await simulateApiDelay();
      return [...mockRoles];
    }

    try {
      return await endpoints.roles.list() as Role[];
    } catch (error) {
      console.error('[rolesService] Failed to fetch roles:', error);
      throw new Error('Failed to load roles from server');
    }
  },

  /**
   * Get role by ID
   */
  async get(id: string): Promise<Role> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const role = mockRoles.find((r) => r.id === id);
      if (!role) {
        throw new Error('Role not found');
      }
      return { ...role };
    }

    try {
      return await endpoints.roles.get(id) as Role;
    } catch (error) {
      console.error(`[rolesService] Failed to fetch role ${id}:`, error);
      throw new Error('Failed to load role details');
    }
  },

  /**
   * Create new role
   */
  async create(data: Omit<Role, 'id' | 'userCount' | 'createdAt' | 'updatedAt'>): Promise<Role> {
    if (config.enableMockData) {
      await simulateApiDelay();
      
      const newRole: Role = {
        ...data,
        id: crypto.randomUUID(),
        userCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      mockRoles.push(newRole);
      return { ...newRole };
    }

    try {
      return await endpoints.roles.create(data) as Role;
    } catch (error) {
      console.error('[rolesService] Failed to create role:', error);
      throw new Error('Failed to create role');
    }
  },

  /**
   * Update existing role
   */
  async update(id: string, data: Partial<Omit<Role, 'id' | 'userCount' | 'createdAt'>>): Promise<Role> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const index = mockRoles.findIndex((r) => r.id === id);
      if (index === -1) {
        throw new Error('Role not found');
      }

      mockRoles[index] = {
        ...mockRoles[index],
        ...data,
        updatedAt: new Date().toISOString(),
      };
      
      return { ...mockRoles[index] };
    }

    try {
      return await endpoints.roles.update(id, data) as Role;
    } catch (error) {
      console.error(`[rolesService] Failed to update role ${id}:`, error);
      throw new Error('Failed to update role');
    }
  },

  /**
   * Delete role
   */
  async delete(id: string): Promise<void> {
    if (config.enableMockData) {
      await simulateApiDelay();
      const index = mockRoles.findIndex((r) => r.id === id);
      if (index === -1) {
        throw new Error('Role not found');
      }

      // Check if role has users
      if (mockRoles[index].userCount > 0) {
        throw new Error('Cannot delete role with assigned users');
      }

      mockRoles.splice(index, 1);
      return;
    }

    try {
      await endpoints.roles.delete(id);
    } catch (error) {
      console.error(`[rolesService] Failed to delete role ${id}:`, error);
      throw new Error('Failed to delete role');
    }
  },

  /**
   * Get available permissions list
   */
  async getPermissions(): Promise<string[]> {
    if (config.enableMockData) {
      await simulateApiDelay();
      
      // Return all unique permissions from all roles
      const allPermissions = new Set<string>();
      mockRoles.forEach((role: Role) => {
        const perms = role.permissions as unknown as string[];
        perms.forEach((perm: string) => allPermissions.add(perm));
      });
      
      return Array.from(allPermissions).sort();
    }

    try {
      // Assuming backend has a permissions endpoint
      const roles = await endpoints.roles.list() as Role[];
      const allPermissions = new Set<string>();
      roles.forEach((role: Role) => {
        const perms = (role.permissions as unknown as string[]) || [];
        perms.forEach((perm: string) => allPermissions.add(perm));
      });
      
      return Array.from(allPermissions).sort();
    } catch (error) {
      console.error('[rolesService] Failed to fetch permissions:', error);
      throw new Error('Failed to load permissions list');
    }
  },
};
