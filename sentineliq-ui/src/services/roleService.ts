/**
 * Role Service - API client for role management
 * 
 * Note: SentinelIQ uses a predefined 6-role RBAC structure.
 * Roles cannot be created/deleted at runtime - they are defined in the backend.
 * This service fetches role definitions and their associated permissions.
 */

import { api } from '../lib/api';
import type { Role, Permission } from '../types';

// Backend role definitions matching app/core/rbac.py
export const PREDEFINED_ROLES = {
  admin: {
    id: 'admin',
    name: 'Admin',
    description: 'Full system access - can manage all users, settings, and configurations',
    permissions: [
      'event:read', 'event:write', 'event:delete',
      'risk:read', 'risk:write', 'risk:review',
      'audit:read', 'audit:export',
      'rule:read', 'rule:write', 'rule:shadow',
      'case:read', 'case:write',
      'incident:read', 'incident:write',
      'link:read', 'link:write',
      'user:read', 'user:write', 'user:delete',
      'integration:read', 'integration:write', 'integration:delete',
      'system:config', 'system:monitoring',
    ],
  },
  risk_analyst: {
    id: 'risk_analyst',
    name: 'Risk Analyst',
    description: 'Fraud investigation and case management - reviews suspicious transactions',
    permissions: [
      'event:read',
      'risk:read', 'risk:write', 'risk:review',
      'case:read', 'case:write',
      'link:read', 'link:write',
      'rule:read',
    ],
  },
  compliance_officer: {
    id: 'compliance_officer',
    name: 'Compliance Officer',
    description: 'Audit and regulatory reporting - ensures compliance with financial regulations',
    permissions: [
      'audit:read', 'audit:export',
      'event:read',
      'risk:read',
      'rule:read',
    ],
  },
  soc_responder: {
    id: 'soc_responder',
    name: 'SOC Responder',
    description: 'Real-time incident response - handles security alerts and incidents',
    permissions: [
      'event:read',
      'risk:read', 'risk:review',
      'incident:read', 'incident:write',
      'link:read',
      'rule:read',
      'system:monitoring',
    ],
  },
  data_scientist: {
    id: 'data_scientist',
    name: 'Data Scientist',
    description: 'ML model development and testing - creates and evaluates fraud detection models',
    permissions: [
      'event:read',
      'risk:read',
      'rule:read', 'rule:shadow',
      'link:read',
    ],
  },
  backend_engineer: {
    id: 'backend_engineer',
    name: 'Backend Engineer',
    description: 'API integration only - manages data ingestion and external system connections',
    permissions: [
      'event:read', 'event:write',
      'risk:read',
    ],
  },
} as const;

// Permission resource groupings for UI display
export const PERMISSION_RESOURCES = {
  events: ['event:read', 'event:write', 'event:delete'],
  risk: ['risk:read', 'risk:write', 'risk:review'],
  audit: ['audit:read', 'audit:export'],
  rules: ['rule:read', 'rule:write', 'rule:shadow'],
  cases: ['case:read', 'case:write'],
  incidents: ['incident:read', 'incident:write'],
  links: ['link:read', 'link:write'],
  users: ['user:read', 'user:write', 'user:delete'],
  integrations: ['integration:read', 'integration:write', 'integration:delete'],
  system: ['system:config', 'system:monitoring'],
} as const;

interface RoleFromAPI {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface RoleUsageStats {
  role: string;
  user_count: number;
}

/**
 * Transform API role response to frontend Role type
 */
function transformRole(apiRole: RoleFromAPI): Role {
  return {
    id: apiRole.id,
    name: apiRole.name,
    description: apiRole.description,
    permissions: apiRole.permissions.map(p => {
      const [resource, action] = p.split(':');
      return {
        id: p,
        resource,
        action,
      };
    }),
    userCount: apiRole.user_count ?? 0,
    createdAt: apiRole.created_at ?? '',
    updatedAt: apiRole.updated_at ?? '',
  };
}

export const roleService = {
  /**
   * Get all predefined roles with their permissions
   * Note: Roles are predefined in the backend, this returns static definitions
   * with dynamic user counts from the API
   */
  async list(): Promise<Role[]> {
    try {
      // Try to get roles from API (may include user counts)
      const response = await api.get<RoleFromAPI[]>('/api/v1/roles');
      return response.map(transformRole);
    } catch {
      // Fallback to predefined roles if API doesn't support it
      console.warn('Roles API not available, using predefined roles');
      return Object.values(PREDEFINED_ROLES).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions.map(p => {
          const [resource, action] = p.split(':');
          return { id: p, resource, action };
        }),
        userCount: 0,
        createdAt: '',
        updatedAt: '',
      }));
    }
  },

  /**
   * Get a single role by ID
   */
  async get(roleId: string): Promise<Role | null> {
    const predefinedRole = PREDEFINED_ROLES[roleId as keyof typeof PREDEFINED_ROLES];
    if (!predefinedRole) return null;

    try {
      const response = await api.get<RoleFromAPI>(`/api/v1/roles/${roleId}`);
      return transformRole(response);
    } catch {
      // Return predefined role without user count
      return {
        id: predefinedRole.id,
        name: predefinedRole.name,
        description: predefinedRole.description,
        permissions: predefinedRole.permissions.map(p => {
          const [resource, action] = p.split(':');
          return { id: p, resource, action };
        }),
        userCount: 0,
        createdAt: '',
        updatedAt: '',
      };
    }
  },

  /**
   * Get user counts for each role
   * This fetches actual usage statistics from the users endpoint
   */
  async getRoleUsageStats(): Promise<RoleUsageStats[]> {
    try {
      const response = await api.get<{ role_stats: RoleUsageStats[] }>('/api/v1/admin/role-stats');
      return response.role_stats;
    } catch {
      // Return empty stats if API doesn't support it
      return Object.keys(PREDEFINED_ROLES).map(role => ({ role, user_count: 0 }));
    }
  },

  /**
   * Get permissions for a specific role
   */
  getPermissionsForRole(roleId: string): string[] {
    const role = PREDEFINED_ROLES[roleId as keyof typeof PREDEFINED_ROLES];
    return role ? [...role.permissions] : [];
  },

  /**
   * Check if a role has a specific permission
   */
  roleHasPermission(roleId: string, permission: string): boolean {
    const role = PREDEFINED_ROLES[roleId as keyof typeof PREDEFINED_ROLES];
    return role ? role.permissions.includes(permission as never) : false;
  },

  /**
   * Get all available permissions grouped by resource
   */
  getPermissionMatrix(): Record<string, string[]> {
    return { ...PERMISSION_RESOURCES };
  },

  /**
   * Get list of all role IDs
   */
  getRoleIds(): string[] {
    return Object.keys(PREDEFINED_ROLES);
  },
};

export default roleService;
