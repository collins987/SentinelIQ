import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Role, Permission } from '@/types';
import {
  Shield,
  Plus,
  Edit,
  Trash2,
  Users,
  Check,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

const mockRoles: Role[] = [
  { id: 'r1', name: 'Admin', description: 'Full system access', permissions: [{ id: 'p1', resource: '*', action: '*' }], userCount: 3, createdAt: '', updatedAt: '' },
  { id: 'r2', name: 'Editor', description: 'Can edit content and manage users', permissions: [{ id: 'p2', resource: 'users', action: 'read' }, { id: 'p3', resource: 'users', action: 'update' }], userCount: 8, createdAt: '', updatedAt: '' },
  { id: 'r3', name: 'Viewer', description: 'Read-only access', permissions: [{ id: 'p4', resource: '*', action: 'read' }], userCount: 25, createdAt: '', updatedAt: '' },
];

const permissionMatrix = {
  users: ['create', 'read', 'update', 'delete'],
  roles: ['create', 'read', 'update', 'delete'],
  jobs: ['create', 'read', 'update', 'delete', 'execute'],
  audit: ['read', 'export'],
  settings: ['read', 'update'],
  analytics: ['read', 'export'],
};

export function RolesPage() {
  const [roles] = useState<Role[]>(mockRoles);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedResources, setExpandedResources] = useState<string[]>([]);

  const toggleResource = (resource: string) => {
    setExpandedResources((prev) =>
      prev.includes(resource) ? prev.filter((r) => r !== resource) : [...prev, resource]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage access control and permissions</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Create Role
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">Roles</h3>
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
                      <p className="text-xs text-gray-500">{role.userCount} users</p>
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
                <div className="flex items-center gap-2">
                  <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h4 className="mb-4 text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</h4>
                <div className="space-y-2">
                  {Object.entries(permissionMatrix).map(([resource, actions]) => (
                    <div key={resource} className="rounded-lg border border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => toggleResource(resource)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="font-medium capitalize text-gray-900 dark:text-white">{resource}</span>
                        <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', expandedResources.includes(resource) && 'rotate-180')} />
                      </button>
                      {expandedResources.includes(resource) && (
                        <div className="border-t border-gray-200 px-4 py-3 dark:border-gray-700">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                            {actions.map((action) => {
                              const hasPermission = selectedRole.permissions.some(
                                (p) => (p.resource === '*' || p.resource === resource) && (p.action === '*' || p.action === action)
                              );
                              return (
                                <label key={action} className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
                                  <input type="checkbox" checked={hasPermission} readOnly className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                                  <span className="text-sm capitalize text-gray-700 dark:text-gray-300">{action}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
