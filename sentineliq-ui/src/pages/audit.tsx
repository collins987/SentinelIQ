import { useState, useMemo, useCallback, useEffect } from 'react';
import { cn } from '../lib/utils';
import { DataTable } from '../components/ui/data-table';
import { Button } from '../components/ui/button';
import { Modal, ConfirmModal } from '../components/ui/modal';
import { toast } from '../components/ui/toast';
import { exportToCsv, useAsyncAction } from '../hooks/useActions';
import { formatDistanceToNow, format, subDays } from 'date-fns';
import type { ColumnDef } from '@tanstack/react-table';
import type { AuditEntry, AuditChange } from '../types';
import { auditService } from '../services/auditService';
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
  X,
  Save,
  MoreVertical,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

const actionConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  create: { icon: Plus, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  update: { icon: FileEdit, color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  delete: { icon: Trash2, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
  view: { icon: Eye, color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800' },
};

export function AuditPage() {
  // State management for audit entries
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ 
    start: null, 
    end: null 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CRUD modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AuditEntry | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [viewingEntry, setViewingEntry] = useState<AuditEntry | null>(null);
  const { isLoading: actionLoading, execute: executeAction } = useAsyncAction();

  // Load audit entries
  const loadAuditEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (actionFilter !== 'all') params.action = actionFilter;
      if (dateRange.start) params.startDate = dateRange.start.toISOString();
      if (dateRange.end) params.endDate = dateRange.end.toISOString();
      
      const data = await auditService.list(params);
      setAuditEntries(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load audit entries';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter, dateRange]);

  useEffect(() => {
    loadAuditEntries();
  }, [loadAuditEntries]);

  // Create new audit entry
  const handleCreateAuditEntry = async (entryData: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    await executeAction(
      async () => {
        await auditService.create(entryData);
        await loadAuditEntries();
        setShowCreateModal(false);
      },
      { successMessage: 'Audit entry created successfully' }
    );
  };

  // Update existing audit entry
  const handleUpdateAuditEntry = async (entryData: AuditEntry) => {
    await executeAction(
      async () => {
        await auditService.update(entryData.id, entryData);
        await loadAuditEntries();
        setEditingEntry(null);
      },
      { successMessage: 'Audit entry updated successfully' }
    );
  };

  // Soft delete audit entry (mark as deleted but preserve for compliance)
  const handleDeleteAuditEntry = async (entryId: string) => {
    await simulateApiDelay();
    // In a real system, this would be a soft delete (add 'deleted' flag)
    // For demo purposes, we'll remove from UI but log the action
    const deletedEntry = auditEntries.find(e => e.id === entryId);
    setAuditEntries(prev => prev.filter(e => e.id !== entryId));
    
    // Create audit trail of the deletion itself
    const deletionAudit: AuditEntry = {
      id: crypto.randomUUID(),
      action: 'delete',
      entityType: 'audit_entry',
      entityId: entryId,
      userId: 'current_user',
      userName: 'Admin User',
      timestamp: new Date().toISOString(),
      changes: [{
        field: 'deleted',
        oldValue: false,
        newValue: true,
      }],
      ipAddress: '127.0.0.1',
      userAgent: navigator.userAgent,
    };
    setAuditEntries(prev => [deletionAudit, ...prev]);
    
    toast('success', 'Audit entry deleted', 'Record has been removed (action logged)');
    setDeletingEntryId(null);
  };

  const handleExport = useCallback(() => {
    if (filteredEntries.length === 0) {
      toast('warning', 'No data to export', 'There are no audit entries matching your filters');
      return;
    }
    exportToCsv(
      filteredEntries.map(e => ({
        id: e.id,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId,
        userId: e.userId,
        userName: e.userName,
        timestamp: e.timestamp,
        ipAddress: e.ipAddress,
        userAgent: e.userAgent,
      })),
      'audit-log',
      [
        { key: 'timestamp', label: 'Timestamp' },
        { key: 'action', label: 'Action' },
        { key: 'entityType', label: 'Resource Type' },
        { key: 'entityId', label: 'Resource ID' },
        { key: 'userName', label: 'User' },
        { key: 'ipAddress', label: 'IP Address' },
      ]
    );
  }, []);

  const handleDateRangeSelect = (days: number) => {
    const end = new Date();
    const start = subDays(end, days);
    setDateRange({ start, end });
    setShowDatePicker(false);
    toast('info', 'Date range applied', `Showing last ${days} days`);
  };

  const filteredEntries = useMemo(() => {
    let filtered = auditEntries;
    if (actionFilter !== 'all') {
      filtered = filtered.filter((entry) => entry.action === actionFilter);
    }
    if (dateRange.start && dateRange.end) {
      filtered = filtered.filter((entry) => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= dateRange.start! && entryDate <= dateRange.end!;
      });
    }
    return filtered;
  }, [auditEntries, actionFilter, dateRange]);

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
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setViewingEntry(row.original); }}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
            title="View details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setEditingEntry(row.original); }}
            className="rounded p-1.5 text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30"
            title="Edit entry"
          >
            <FileEdit className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeletingEntryId(row.original.id); }}
            className="rounded p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
            title="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Export Logs
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Entry
          </Button>
        </div>
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

        <div className="relative">
          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <Calendar className="h-4 w-4" />
            {dateRange.start ? `Last ${Math.ceil((dateRange.end!.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} days` : 'Date Range'}
            <ChevronDown className="h-4 w-4" />
          </button>
          
          {showDatePicker && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDatePicker(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                {[
                  { label: 'Last 7 days', days: 7 },
                  { label: 'Last 30 days', days: 30 },
                  { label: 'Last 90 days', days: 90 },
                ].map((option) => (
                  <button
                    key={option.days}
                    onClick={() => handleDateRangeSelect(option.days)}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {option.label}
                  </button>
                ))}
                {dateRange.start && (
                  <>
                    <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => { setDateRange({ start: null, end: null }); setShowDatePicker(false); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Clear filter
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredEntries}
        searchKey="userName"
        searchPlaceholder="Search by user..."
        onRowClick={(entry) => setViewingEntry(entry)}
      />

      {/* CRUD Modals */}
      {showCreateModal && (
        <AuditEntryFormModal
          isOpen={true}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateAuditEntry}
          title="Create Audit Entry"
          description="Manually add an audit record (for corrections or adjustments)"
        />
      )}

      {editingEntry && (
        <AuditEntryFormModal
          isOpen={true}
          onClose={() => setEditingEntry(null)}
          onSubmit={handleUpdateAuditEntry}
          initialData={editingEntry}
          title="Edit Audit Entry"
          description="Update audit record metadata (changes will be logged)"
        />
      )}

      {deletingEntryId && (
        <ConfirmModal
          isOpen={true}
          onClose={() => setDeletingEntryId(null)}
          onConfirm={() => handleDeleteAuditEntry(deletingEntryId)}
          title="Delete Audit Entry"
          message="Are you sure you want to delete this audit record? This action will be logged for compliance purposes."
          confirmText="Delete Entry"
          variant="danger"
        />
      )}

      {viewingEntry && (
        <AuditDetailModal
          entry={viewingEntry}
          onClose={() => setViewingEntry(null)}
          onEdit={() => {
            setEditingEntry(viewingEntry);
            setViewingEntry(null);
          }}
          onDelete={() => {
            setDeletingEntryId(viewingEntry.id);
            setViewingEntry(null);
          }}
        />
      )}
    </div>
  );
}

// Audit Entry Create/Edit Form Modal
function AuditEntryFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  description,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: AuditEntry;
  title: string;
  description: string;
}) {
  const { isLoading, execute } = useAsyncAction();
  
  // Form state
  const [action, setAction] = useState(initialData?.action || 'create');
  const [entityType, setEntityType] = useState(initialData?.entityType || '');
  const [entityId, setEntityId] = useState(initialData?.entityId || '');
  const [userId, setUserId] = useState(initialData?.userId || '');
  const [userName, setUserName] = useState(initialData?.userName || '');
  const [ipAddress, setIpAddress] = useState(initialData?.ipAddress || '');
  const [userAgent, setUserAgent] = useState(initialData?.userAgent || navigator.userAgent);
  const [changes, setChanges] = useState<AuditChange[]>(initialData?.changes || []);

  const handleAddChange = () => {
    setChanges(prev => [...prev, { field: '', oldValue: '', newValue: '' }]);
  };

  const handleRemoveChange = (index: number) => {
    setChanges(prev => prev.filter((_, i) => i !== index));
  };

  const handleChangeUpdate = (index: number, key: keyof AuditChange, value: any) => {
    setChanges(prev => prev.map((change, i) => 
      i === index ? { ...change, [key]: value } : change
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!action || !entityType || !entityId || !userId || !userName) {
      toast('error', 'Validation error', 'Please fill in all required fields');
      return;
    }

    await execute(
      async () => {
        const data = initialData 
          ? { ...initialData, action, entityType, entityId, userId, userName, ipAddress, userAgent, changes: changes.filter(c => c.field) }
          : { action, entityType, entityId, userId, userName, ipAddress, userAgent, changes: changes.filter(c => c.field) };
        await onSubmit(data);
      },
      {}
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action <span className="text-red-500">*</span>
            </label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              required
            >
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="view">View</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entity Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              placeholder="e.g., user, settings, api_key"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Entity ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder="e.g., u123, s456"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="e.g., admin1, user123"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g., Admin User"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              IP Address
            </label>
            <input
              type="text"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="e.g., 192.168.1.1"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            User Agent
          </label>
          <input
            type="text"
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
            placeholder="Browser user agent string"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
          />
        </div>

        {/* Changes Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Changes (Optional)
            </label>
            <button
              type="button"
              onClick={handleAddChange}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Change
            </button>
          </div>

          <div className="space-y-2">
            {changes.map((change, index) => (
              <div key={index} className="flex gap-2 items-start">
                <input
                  type="text"
                  value={change.field}
                  onChange={(e) => handleChangeUpdate(index, 'field', e.target.value)}
                  placeholder="Field name"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                />
                <input
                  type="text"
                  value={String(change.oldValue)}
                  onChange={(e) => handleChangeUpdate(index, 'oldValue', e.target.value)}
                  placeholder="Old value"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                />
                <input
                  type="text"
                  value={String(change.newValue)}
                  onChange={(e) => handleChangeUpdate(index, 'newValue', e.target.value)}
                  placeholder="New value"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveChange(index)}
                  className="p-2 text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {changes.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No changes recorded. Click "Add Change" to track field modifications.
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            type="submit" 
            isLoading={isLoading} 
            loadingText={initialData ? "Updating..." : "Creating..."}
            leftIcon={<Save className="h-4 w-4" />}
            className="flex-1"
          >
            {initialData ? 'Update Entry' : 'Create Entry'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// Audit Detail View Modal
function AuditDetailModal({
  entry,
  onClose,
  onEdit,
  onDelete,
}: {
  entry: AuditEntry;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const config = actionConfig[entry.action] || actionConfig.view;
  const Icon = config.icon;

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Audit Entry Details"
      description={`Complete metadata for ${entry.action} action`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className={cn('rounded-full p-3', config.bg)}>
            <Icon className={cn('h-6 w-6', config.color)} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg text-gray-900 dark:text-white capitalize">
              {entry.action} {entry.entityType.replace('_', ' ')}
            </h3>
            <p className="text-sm text-gray-500">ID: {entry.entityId}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="rounded-lg p-2 text-gray-400 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30"
              title="Edit entry"
            >
              <FileEdit className="h-5 w-5" />
            </button>
            <button
              onClick={onDelete}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
              title="Delete entry"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">User</p>
            <p className="font-medium text-gray-900 dark:text-white">{entry.userName}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">ID: {entry.userId}</p>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Timestamp</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {format(new Date(entry.timestamp), 'PPpp')}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">IP Address</p>
            <p className="font-mono text-gray-900 dark:text-white">{entry.ipAddress}</p>
          </div>

          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Entry ID</p>
            <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{entry.id}</p>
          </div>
        </div>

        {/* User Agent */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">User Agent</p>
          <p className="text-sm text-gray-900 dark:text-white break-words">{entry.userAgent}</p>
        </div>

        {/* Changes Table */}
        {entry.changes.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Field Changes</p>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Field</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">Old Value</th>
                    <th className="px-4 py-2 text-left font-medium text-gray-500">New Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {entry.changes.map((change, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">{change.field}</td>
                      <td className="px-4 py-2 text-red-600 dark:text-red-400">
                        {change.oldValue !== null && change.oldValue !== undefined ? (
                          <span className="line-through">{String(change.oldValue)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400 font-medium">
                        {change.newValue !== null && change.newValue !== undefined ? (
                          String(change.newValue)
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {entry.changes.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No field changes recorded for this action</p>
          </div>
        )}

        {/* Close Button */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// Legacy panel component (keeping for backward compatibility)
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
