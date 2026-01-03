import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/data-table';
import { formatDistanceToNow, format } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type { AuditEntry } from '@/types';
import {
  History,
  Filter,
  Download,
  Search,
  User,
  FileEdit,
  Trash2,
  Plus,
  Eye,
  ChevronDown,
  Calendar,
} from 'lucide-react';

// Mock audit data
const mockAuditEntries: AuditEntry[] = [
  { id: '1', action: 'create', entityType: 'user', entityId: 'u123', userId: 'admin1', userName: 'Admin User', timestamp: new Date().toISOString(), changes: [{ field: 'email', oldValue: null, newValue: 'new@example.com' }], ipAddress: '192.168.1.1', userAgent: 'Chrome/120.0' },
  { id: '2', action: 'update', entityType: 'settings', entityId: 's1', userId: 'admin1', userName: 'Admin User', timestamp: new Date(Date.now() - 3600000).toISOString(), changes: [{ field: 'theme', oldValue: 'light', newValue: 'dark' }], ipAddress: '192.168.1.1', userAgent: 'Chrome/120.0' },
  { id: '3', action: 'delete', entityType: 'api_key', entityId: 'ak456', userId: 'user2', userName: 'John Doe', timestamp: new Date(Date.now() - 7200000).toISOString(), changes: [], ipAddress: '10.0.0.5', userAgent: 'Firefox/121.0' },
  { id: '4', action: 'view', entityType: 'report', entityId: 'r789', userId: 'user3', userName: 'Jane Smith', timestamp: new Date(Date.now() - 86400000).toISOString(), changes: [], ipAddress: '172.16.0.10', userAgent: 'Safari/17.0' },
];

const actionConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  create: { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  update: { icon: FileEdit, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  delete: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  view: { icon: Eye, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

export function AuditPage() {
  const [auditEntries] = useState<AuditEntry[]>(mockAuditEntries);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    if (actionFilter === 'all') return auditEntries;
    return auditEntries.filter((entry) => entry.action === actionFilter);
  }, [auditEntries, actionFilter]);

  const columns: ColumnDef<AuditEntry>[] = [
    {
      accessorKey: 'action',
      header: 'Action',
      cell: ({ row }) => {
        const config = actionConfig[row.original.action] || actionConfig.view;
        const Icon = config.icon;
        return (
          <div className="flex items-center gap-2">
            <div className={cn('rounded-full p-1.5', config.bg)}>
              <Icon className={cn('h-3.5 w-3.5', config.color)} />
            </div>
            <span className="capitalize font-medium text-gray-900 dark:text-white">{row.original.action}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'entityType',
      header: 'Resource',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900 dark:text-white capitalize">{row.original.entityType.replace('_', ' ')}</p>
          <p className="text-xs text-gray-500 font-mono">{row.original.entityId}</p>
        </div>
      ),
    },
    {
      accessorKey: 'userName',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
            {row.original.userName.charAt(0)}
          </div>
          <span className="text-gray-900 dark:text-white">{row.original.userName}</span>
        </div>
      ),
    },
    {
      accessorKey: 'timestamp',
      header: 'Time',
      cell: ({ row }) => (
        <span className="text-gray-500 dark:text-gray-400">
          {formatDistanceToNow(new Date(row.original.timestamp), { addSuffix: true })}
        </span>
      ),
    },
    {
      accessorKey: 'ipAddress',
      header: 'IP Address',
      cell: ({ row }) => (
        <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{row.original.ipAddress}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track all system changes and user actions
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          <Download className="h-4 w-4" />
          Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-500">Action:</span>
          {['all', 'create', 'update', 'delete', 'view'].map((action) => (
            <button
              key={action}
              onClick={() => setActionFilter(action)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors capitalize',
                actionFilter === action
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              )}
            >
              {action}
            </button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

        <button className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          Date Range
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredEntries}
        searchKey="userName"
        searchPlaceholder="Search by user..."
        onRowClick={(entry) => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
      />

      {/* Detail Panel */}
      {expandedEntry && (
        <AuditDetailPanel
          entry={auditEntries.find((e) => e.id === expandedEntry)!}
          onClose={() => setExpandedEntry(null)}
        />
      )}
    </div>
  );
}

function AuditDetailPanel({ entry, onClose }: { entry: AuditEntry; onClose: () => void }) {
  const config = actionConfig[entry.action] || actionConfig.view;
  const Icon = config.icon;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', config.bg)}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
              {entry.action} {entry.entityType.replace('_', ' ')}
            </h3>
            <p className="text-sm text-gray-500">ID: {entry.entityId}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">User</p>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">{entry.userName}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Timestamp</p>
          <p className="mt-1 font-medium text-gray-900 dark:text-white">{format(new Date(entry.timestamp), 'PPpp')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">IP Address</p>
          <p className="mt-1 font-mono text-gray-900 dark:text-white">{entry.ipAddress}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">User Agent</p>
          <p className="mt-1 text-gray-900 dark:text-white">{entry.userAgent}</p>
        </div>
      </div>

      {entry.changes.length > 0 && (
        <div className="mt-6">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Changes</p>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500">Field</th>
                  <th className="px-4 py-2 text-left text-gray-500">Old Value</th>
                  <th className="px-4 py-2 text-left text-gray-500">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {entry.changes.map((change, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{change.field}</td>
                    <td className="px-4 py-2 text-red-500 line-through">{String(change.oldValue) || '—'}</td>
                    <td className="px-4 py-2 text-emerald-500">{String(change.newValue) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
