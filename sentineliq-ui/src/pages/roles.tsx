import { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { roleService, PERMISSION_RESOURCES } from '../services/roleService';
import type { Role } from '../types';
import {
  Shield,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Users,
  Lock,
  Check,
  X,
} from 'lucide-react';

/**
 * Roles & Permissions Page
 * 
 * NOTE: SentinelIQ uses a predefined 6-role RBAC structure defined in the backend.
 * Roles cannot be created, edited, or deleted at runtime.
 * This page displays the role definitions and their associated permissions as read-only.
 */
export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedResources, setExpandedResources] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load roles from API/predefined definitions
  const loadRoles = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedRoles = await roleService.list();
      setRoles(loadedRoles);
      // Auto-select first role if none selected
      if (!selectedRole && loadedRoles.length > 0) {
        setSelectedRole(loadedRoles[0]);
      }
    } catch (err) {
      setError('Failed to load roles. Please try again.');
      console.error('Error loading roles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRoles();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleResource = (resource: string) => {
    setExpandedResources((prev) =>
      prev.includes(resource) ? prev.filter((r) => r !== resource) : [...prev, resource]
    );
  };

  // Check if a role has a specific permission
  const hasPermission = (role: Role, resource: string, action: string): boolean => {
    const permissionStr = `${resource}:${action}`;
    return role.permissions.some(
      (p) => p.id === permissionStr || 
             (p.resource === '*' && p.action === '*') ||
             (p.resource === resource && p.action === action)
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
        <button
          onClick={loadRoles}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View predefined RBAC roles and their permissions
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Lock className="h-4 w-4" />
          <span>Roles are predefined by the system</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">System Roles</h3>
              <p className="text-xs text-gray-500 mt-1">{roles.length} predefined roles</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role)}
                  className={cn(
                    'flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                    selectedRole?.id === role.id && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-lg p-2', selectedRole?.id === role.id ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800')}>
                      <Shield className={cn('h-4 w-4', selectedRole?.id === role.id ? 'text-blue-600' : 'text-gray-500')} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{role.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Users className="h-3 w-3" />
                        <span>{role.userCount} users</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{selectedRole.name}</h3>
                  <p className="text-sm text-gray-500">{selectedRole.description}</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
                  <Lock className="h-3 w-3" />
                  Read-only
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Permissions ({selectedRole.permissions.length})
                  </h4>
                </div>
                <div className="space-y-2">
                  {Object.entries(PERMISSION_RESOURCES).map(([resource, actions]) => {
                    const grantedCount = actions.filter(action => 
                      hasPermission(selectedRole, resource, action.split(':')[1] || action)
                    ).length;
                    
                    return (
                      <div key={resource} className="rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => toggleResource(resource)}
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize text-gray-900 dark:text-white">{resource}</span>
                            <span className="text-xs text-gray-500">
                              ({grantedCount}/{actions.length})
                            </span>
                          </div>
                          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', expandedResources.includes(resource) && 'rotate-180')} />
                        </button>
                        {expandedResources.includes(resource) && (
                          <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                              {actions.map((permStr) => {
                                const action = permStr.split(':')[1] || permStr;
                                const granted = hasPermission(selectedRole, resource, action);
                                return (
                                  <div 
                                    key={permStr} 
                                    className={cn(
                                      'flex items-center gap-2 rounded-lg border px-3 py-2',
                                      granted 
                                        ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' 
                                        : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
                                    )}
                                  >
                                    {granted ? (
                                      <Check className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <X className="h-4 w-4 text-gray-400" />
                                    )}
                                    <span className={cn(
                                      'text-sm capitalize',
                                      granted ? 'text-green-700 dark:text-green-400' : 'text-gray-500'
                                    )}>
                                      {action}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="text-center">
                <Shield className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Select a role to view permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
