import { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { DataTable } from '../components/ui/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { Modal, ConfirmModal } from '../components/ui/modal';
import { Button } from '../components/ui/button';
import { toast } from '../components/ui/toast';
import { useAsyncAction } from '../hooks/useActions';
import { userService } from '../services/userService';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '../types';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Filter,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const statusVariants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  active: 'success',
  inactive: 'default',
  suspended: 'error',
};

function StatCard({ label, value, icon: Icon, color = 'text-gray-600' }: { label: string; value: number; icon: React.ElementType; color?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
      <div className={cn('rounded-lg bg-gray-100 p-2 dark:bg-gray-800', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Fetch users from API
  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userService.list();
      setUsers(response.users);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load users';
      setError(errorMsg);
      toast('error', 'Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAddUser = useCallback(async (userData: { email: string; firstName: string; lastName: string; password: string; role?: string }) => {
    try {
      const newUser = await userService.create({
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password: userData.password,
        role: userData.role,
      });
      setUsers(prev => [newUser, ...prev]);
      toast('success', 'User created', 'New user account has been created');
      setShowAddModal(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create user';
      toast('error', 'Error', errorMsg);
      throw err;
    }
  }, []);

  const handleUpdateUser = useCallback(async (userId: string, updates: { firstName?: string; lastName?: string; role?: string; isActive?: boolean }) => {
    try {
      const updatedUser = await userService.update(userId, {
        first_name: updates.firstName,
        last_name: updates.lastName,
        role: updates.role,
        is_active: updates.isActive,
      });
      setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
      toast('success', 'User updated', 'User details have been updated');
      setEditingUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update user';
      toast('error', 'Error', errorMsg);
      throw err;
    }
  }, []);

  const handleDeleteUser = useCallback(async (userId: string) => {
    try {
      await userService.delete(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      toast('success', 'User deleted', 'User has been removed');
      setDeletingUser(null);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
      toast('error', 'Error', errorMsg);
    }
  }, []);

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'all') return users;
    return users.filter((user) => user.status === statusFilter);
  }, [users, statusFilter]);

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    suspended: users.filter((u) => u.status === 'suspended').length,
  }), [users]);

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-sm font-medium text-white">
            {row.original.name.charAt(0)}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{row.original.name}</p>
            <p className="text-sm text-gray-500">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.status ?? 'active';
        return <StatusBadge variant={statusVariants[status]}>{status}</StatusBadge>;
      },
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => {
        const roles = row.original.roles ?? [];
        return (
          <div className="flex flex-wrap gap-1">
            {roles.length === 0 ? (
              <span className="text-gray-400">No roles</span>
            ) : (
              roles.map((role) => (
                <span key={role.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  {role.name}
                </span>
              ))
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-gray-500">
          {row.original.lastLogin ? formatDistanceToNow(new Date(row.original.lastLogin), { addSuffix: true }) : 'Never'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); setEditingUser(row.original); }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="Edit user"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setDeletingUser(row.original); }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800"
            title="Delete user"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage user accounts and access</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={loadUsers} 
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300"
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <UserPlus className="h-4 w-4" />
            Add User
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{error}</p>
          </div>
          <button onClick={loadUsers} className="text-sm font-medium hover:underline">
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Users" value={stats.total} icon={Users} />
        <StatCard label="Active" value={stats.active} icon={Users} color="text-emerald-600" />
        <StatCard label="Inactive" value={stats.inactive} icon={Users} color="text-gray-600" />
        <StatCard label="Suspended" value={stats.suspended} icon={Users} color="text-red-600" />
      </div>

      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        {['all', 'active', 'inactive', 'suspended'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors',
              statusFilter === status
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {isLoading && users.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-gray-400" />
            <p className="mt-2 text-sm text-gray-500">Loading users...</p>
          </div>
        </div>
      ) : (
        <DataTable columns={columns} data={filteredUsers} searchKey="name" searchPlaceholder="Search users..." />
      )}

      {showAddModal && (
        <AddUserModal 
          onClose={() => setShowAddModal(false)} 
          onSubmit={handleAddUser}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(updates) => {
            handleUpdateUser(editingUser.id, updates);
            setEditingUser(null);
          }}
        />
      )}

      {deletingUser && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingUser(null)}
          onConfirm={() => {
            handleDeleteUser(deletingUser.id);
          }}
          title="Delete User"
          message={`Are you sure you want to delete ${deletingUser.name}? This action cannot be undone.`}
          confirmText="Delete"
          variant="danger"
        />
      )}
    </div>
  );
}

interface AddUserModalProps {
  onClose: () => void;
  onSubmit: (user: { email: string; firstName: string; lastName: string; password: string; role?: string }) => Promise<void>;
}

function AddUserModal({ onClose, onSubmit }: AddUserModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('viewer');
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      toast('error', 'Validation error', 'Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      toast('error', 'Validation error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      toast('error', 'Validation error', 'Password must be at least 8 characters');
      return;
    }

    await execute(
      async () => {
        await onSubmit({
          email: email.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          password: password,
          role: role,
        });
      },
      { successMessage: 'User created successfully' }
    );
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New User" description="Create a new user account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
              placeholder="First name" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
              placeholder="Last name" 
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
            placeholder="Enter email" 
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
            placeholder="Enter password (min. 8 characters)" 
            required
            minLength={8}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} loadingText="Creating..." className="flex-1">
            Create User
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface EditUserModalProps {
  user: User;
  onClose: () => void;
  onSubmit: (userId: string, updates: { firstName?: string; lastName?: string; role?: string; isActive?: boolean }) => Promise<void>;
}

function EditUserModal({ user, onClose, onSubmit }: EditUserModalProps) {
  // Split name into first/last (best effort)
  const nameParts = user.name.split(' ');
  const [firstName, setFirstName] = useState(nameParts[0] || '');
  const [lastName, setLastName] = useState(nameParts.slice(1).join(' ') || '');
  const [status, setStatus] = useState(user.status || 'active');
  const [role, setRole] = useState(user.roles?.[0]?.name || 'viewer');
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName.trim() || !lastName.trim()) {
      toast('error', 'Validation error', 'Please fill in all required fields');
      return;
    }

    await execute(
      async () => {
        await onSubmit(user.id, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: role,
          isActive: status === 'active',
        });
      },
      { successMessage: 'User updated successfully' }
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit User" description={`Editing ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
            <input 
              type="text" 
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
            <input 
              type="text" 
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input 
            type="email" 
            value={user.email}
            disabled
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-800" 
          />
          <p className="mt-1 text-xs text-gray-400">Email cannot be changed</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="viewer">Viewer</option>
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select 
            value={status}
            onChange={(e) => setStatus(e.target.value as 'active' | 'inactive' | 'suspended')}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
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
