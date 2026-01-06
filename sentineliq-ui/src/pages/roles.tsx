import { useState, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Modal, ConfirmModal } from '../components/ui/modal';
import { Button } from '../components/ui/button';
import { toast } from '../components/ui/toast';
import { useAsyncAction } from '../hooks/useActions';
import type { Role, Permission } from '../types';
import { rolesService } from '../services/rolesService';
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
  Save,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const permissionMatrix = {
  users: ['create', 'read', 'update', 'delete'],
  roles: ['create', 'read', 'update', 'delete'],
  jobs: ['create', 'read', 'update', 'delete', 'execute'],
  audit: ['read', 'export'],
  settings: ['read', 'update'],
  analytics: ['read', 'export'],
};

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [expandedResources, setExpandedResources] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, Permission[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: isSaving, execute: savePermissions } = useAsyncAction();
  const { isLoading: actionLoading, execute: executeAction } = useAsyncAction();

  const loadRoles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await rolesService.list();
      setRoles(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load roles';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const toggleResource = (resource: string) => {
    setExpandedResources((prev) =>
      prev.includes(resource) ? prev.filter((r) => r !== resource) : [...prev, resource]
    );
  };

  const handleCreateRole = useCallback(async (name: string, description: string) => {
    await executeAction(
      async () => {
        const newRole = await rolesService.create({ name, description, permissions: [] });
        setRoles((prev) => [...prev, newRole]);
        setSelectedRole(newRole);
      },
      { successMessage: `${name} role has been created` }
    );
  }, [executeAction]);

  const handleUpdateRole = useCallback(async (roleId: string, updates: Partial<Role>) => {
    await executeAction(
      async () => {
        const updatedRole = await rolesService.update(roleId, updates);
        setRoles((prev) => prev.map((r) => (r.id === roleId ? updatedRole : r)));
        if (selectedRole?.id === roleId) {
          setSelectedRole(updatedRole);
        }
      },
      { successMessage: 'Role updated successfully' }
    );
  }, [executeAction, selectedRole]);

  const handleDeleteRole = useCallback(async (roleId: string) => {
    await executeAction(
      async () => {
        await rolesService.delete(roleId);
        setRoles((prev) => prev.filter((r) => r.id !== roleId));
        if (selectedRole?.id === roleId) {
          setSelectedRole(null);
        }
      },
      { successMessage: 'Role deleted successfully' }
    );
  }, [executeAction, selectedRole]);

  const togglePermission = useCallback((resource: string, action: string) => {
    if (!selectedRole) return;
    
    const currentPermissions = selectedRole.permissions;
    const hasPermission = currentPermissions.some(
      (p) => (p.resource === '*' || p.resource === resource) && (p.action === '*' || p.action === action)
    );

    let newPermissions: Permission[];
    if (hasPermission) {
      // Remove the permission
      newPermissions = currentPermissions.filter(
        p => !(p.resource === resource && p.action === action)
      );
    } else {
      // Add the permission
      newPermissions = [...currentPermissions, { id: crypto.randomUUID(), resource, action }];
    }

    handleUpdateRole(selectedRole.id, { permissions: newPermissions });
  }, [selectedRole, handleUpdateRole]);

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    await savePermissions(
      async () => {
        await simulateApiDelay();
      },
      { successMessage: 'Permissions saved successfully' }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage access control and permissions</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} leftIcon={<Plus className="h-4 w-4" />}>
          Create Role
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">Roles</h3>
            </div>
            {isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="text-center">
                  <RefreshCw className="mx-auto h-6 w-6 animate-spin text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Loading roles...</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
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
            )}
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
                  <button 
                    onClick={() => setEditingRole(selectedRole)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                    title="Edit role"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setDeletingRole(selectedRole)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
                    title="Delete role"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Permissions</h4>
                  <Button 
                    size="sm" 
                    onClick={handleSavePermissions}
                    isLoading={isSaving}
                    loadingText="Saving..."
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save Changes
                  </Button>
                </div>
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
                                <label 
                                  key={action} 
                                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                                >
                                  <input 
                                    type="checkbox" 
                                    checked={hasPermission} 
                                    onChange={() => togglePermission(resource, action)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                                  />
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

      {/* Create Role Modal */}
      {showCreateModal && (
        <CreateRoleModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateRole}
        />
      )}

      {/* Edit Role Modal */}
      {editingRole && (
        <EditRoleModal
          role={editingRole}
          onClose={() => setEditingRole(null)}
          onSave={(updates) => {
            handleUpdateRole(editingRole.id, updates);
            setEditingRole(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deletingRole && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingRole(null)}
          onConfirm={() => {
            handleDeleteRole(deletingRole.id);
            setDeletingRole(null);
          }}
          title="Delete Role"
          message={`Are you sure you want to delete the "${deletingRole.name}" role? This will affect ${deletingRole.userCount} users.`}
          confirmText="Delete Role"
          variant="danger"
        />
      )}
    </div>
  );
}

function CreateRoleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('error', 'Validation error', 'Please enter a role name');
      return;
    }
    await execute(
      async () => {
        await simulateApiDelay();
        onCreate(name.trim(), description.trim());
      },
      {}
    );
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Create New Role" description="Define a new role with custom permissions">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Moderator"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the role's purpose..."
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} loadingText="Creating..." className="flex-1">
            Create Role
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditRoleModal({ role, onClose, onSave }: { role: Role; onClose: () => void; onSave: (updates: Partial<Role>) => void }) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('error', 'Validation error', 'Please enter a role name');
      return;
    }
    await execute(
      async () => {
        await simulateApiDelay();
        onSave({ name: name.trim(), description: description.trim() });
      },
      { successMessage: 'Role updated successfully' }
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit Role" description={`Editing ${role.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} loadingText="Saving..." className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
