import { useState, useMemo, useCallback } from 'react';
import { cn } from '../lib/utils';
import { DataTable } from '../components/ui/data-table';
import { StatusBadge } from '../components/ui/status-badge';
import { Modal, ConfirmModal } from '../components/ui/modal';
import { Button } from '../components/ui/button';
import { toast } from '../components/ui/toast';
import { useAsyncAction, simulateApiDelay } from '../hooks/useActions';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '../types';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Filter,
} from 'lucide-react';

const mockUsers: User[] = [
  { id: '1', email: 'admin@sentineliq.io', name: 'Admin User', status: 'active', roles: [{ id: 'r1', name: 'Admin', description: '', permissions: [], userCount: 1, createdAt: '', updatedAt: '' }], lastLogin: new Date().toISOString(), createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '2', email: 'john@example.com', name: 'John Doe', status: 'active', roles: [{ id: 'r2', name: 'User', description: '', permissions: [], userCount: 5, createdAt: '', updatedAt: '' }], lastLogin: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000 * 15).toISOString() },
  { id: '3', email: 'jane@example.com', name: 'Jane Smith', status: 'inactive', roles: [{ id: 'r2', name: 'User', description: '', permissions: [], userCount: 5, createdAt: '', updatedAt: '' }], createdAt: new Date(Date.now() - 86400000 * 7).toISOString() },
  { id: '4', email: 'bob@example.com', name: 'Bob Wilson', status: 'suspended', roles: [], createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

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
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const handleAddUser = useCallback((user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [newUser, ...prev]);
  }, []);

  const handleUpdateUser = useCallback((userId: string, updates: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
  }, []);

  const handleDeleteUser = useCallback((userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
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
      cell: ({ row }) => (
        <StatusBadge variant={statusVariants[row.original.status]}>{row.original.status}</StatusBadge>
      ),
    },
    {
      accessorKey: 'roles',
      header: 'Roles',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.length === 0 ? (
            <span className="text-gray-400">No roles</span>
          ) : (
            row.original.roles.map((role) => (
              <span key={role.id} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {role.name}
              </span>
            ))
          )}
        </div>
      ),
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
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <UserPlus className="h-4 w-4" />
          Add User
        </button>
      </div>

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

      <DataTable columns={columns} data={filteredUsers} searchKey="name" searchPlaceholder="Search users..." />

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
            toast('success', 'User deleted', `${deletingUser.name} has been removed`);
            setDeletingUser(null);
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

function AddUserModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (user: Omit<User, 'id' | 'createdAt'>) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('User');
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast('error', 'Validation error', 'Please fill in all required fields');
      return;
    }

    if (!email.includes('@')) {
      toast('error', 'Validation error', 'Please enter a valid email address');
      return;
    }

    await execute(
      async () => {
        await simulateApiDelay();
        onSubmit({
          name: name.trim(),
          email: email.trim(),
          status: 'active',
          roles: [{ id: crypto.randomUUID(), name: role, description: '', permissions: [], userCount: 1, createdAt: '', updatedAt: '' }],
        });
      },
      { successMessage: 'User added successfully' }
    );
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add New User" description="Create a new user account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
            placeholder="Enter name" 
            required
          />
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select 
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          >
            <option>User</option>
            <option>Admin</option>
            <option>Viewer</option>
          </select>
        </div>
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} loadingText="Adding..." className="flex-1">
            Add User
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({ user, onClose, onSubmit }: { user: User; onClose: () => void; onSubmit: (updates: Partial<User>) => void }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [status, setStatus] = useState(user.status);
  const { isLoading, execute } = useAsyncAction();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !email.trim()) {
      toast('error', 'Validation error', 'Please fill in all required fields');
      return;
    }

    await execute(
      async () => {
        await simulateApiDelay();
        onSubmit({ name: name.trim(), email: email.trim(), status });
      },
      { successMessage: 'User updated successfully' }
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Edit User" description={`Editing ${user.name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800" 
            required
          />
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
            <option value="suspended">Suspended</option>
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
