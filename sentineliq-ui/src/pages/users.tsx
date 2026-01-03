import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDistanceToNow } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type { User } from '@/types';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Filter,
  X,
  Mail,
  Shield,
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
  const [users] = useState<User[]>(mockUsers);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

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
      cell: () => (
        <div className="flex items-center gap-1">
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800">
            <Edit className="h-4 w-4" />
          </button>
          <button className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-gray-800">
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

      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}
    </div>
  );
}

function AddUserModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add New User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
            <input type="text" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="Enter name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input type="email" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800" placeholder="Enter email" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800">
              <option>User</option>
              <option>Admin</option>
              <option>Viewer</option>
            </select>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300">Cancel</button>
            <button type="submit" className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Add User</button>
          </div>
        </form>
      </div>
    </>
  );
}
