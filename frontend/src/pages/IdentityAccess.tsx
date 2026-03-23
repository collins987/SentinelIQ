import { useState } from 'react';
import {
  useListAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useSuspendUserMutation,
  useActivateUserMutation,
  useForceMfaMutation,
  useForcePasswordResetMutation,
} from '../services/adminGovernanceApi';
import type { AdminUser, AdminUserCreateRequest } from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  UserGroupIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  LockClosedIcon,
  FingerPrintIcon,
  KeyIcon,
  UserIcon,
  EnvelopeIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ROLE_BADGES: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-400',
  analyst: 'bg-blue-500/20 text-blue-400',
  viewer: 'bg-gray-500/20 text-gray-400',
};

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  active: { className: 'badge-success', label: 'Active' },
  suspended: { className: 'badge-danger', label: 'Suspended' },
  pending: { className: 'badge-warning', label: 'Pending' },
  system: { className: 'badge-info', label: 'System' },
};

const TRUST_INDICATORS: Record<string, { color: string; label: string }> = {
  trusted: { color: 'text-green-400', label: 'Trusted' },
  under_review: { color: 'text-yellow-400', label: 'Under Review' },
  restricted: { color: 'text-red-400', label: 'Restricted' },
  unknown: { color: 'text-gray-400', label: 'Unknown' },
};

export default function IdentityAccess() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [showSuspendModal, setShowSuspendModal] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [createdUserInfo, setCreatedUserInfo] = useState<{ email: string; password: string } | null>(null);

  // Create form state
  const [formEmail, setFormEmail] = useState('');
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formOrgId, setFormOrgId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRiskScore, setFormRiskScore] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useListAdminUsersQuery({
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
    page,
    page_size: 20,
  });

  const [createUser, { isLoading: creating }] = useCreateAdminUserMutation();
  const [updateUser] = useUpdateAdminUserMutation();
  const [suspendUser] = useSuspendUserMutation();
  const [activateUser] = useActivateUserMutation();
  const [forceMfa] = useForceMfaMutation();
  const [forcePasswordReset] = useForcePasswordResetMutation();

  const handleCreate = async () => {
    try {
      setFormError('');
      const payload: AdminUserCreateRequest = {
        email: formEmail,
        first_name: formFirstName,
        last_name: formLastName,
        role: formRole,
        org_id: formOrgId || undefined,
        phone: formPhone || undefined,
        risk_score: formRiskScore ? parseInt(formRiskScore, 10) : undefined,
        status: formStatus,
      };
      const result = await createUser(payload).unwrap();
      setCreatedUserInfo({ email: result.email, password: result.temporary_password });
      setFormEmail('');
      setFormFirstName('');
      setFormLastName('');
      setFormRole('viewer');
      setFormOrgId('');
      setFormPhone('');
      setFormRiskScore('');
      setFormStatus('active');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'data' in err
        ? String((err as { data: { detail?: string } }).data?.detail || 'Failed to create user')
        : 'Failed to create user';
      setFormError(msg);
    }
  };

  const handleSuspend = async () => {
    if (showSuspendModal && suspendReason) {
      await suspendUser({ userId: showSuspendModal.id, reason: suspendReason });
      setShowSuspendModal(null);
      setSuspendReason('');
    }
  };

  const handleActivate = async (userId: string) => {
    await activateUser({ userId, reason: 'Admin re-activated account' });
    setShowUserMenu(null);
  };

  const handleForceMfa = async (userId: string) => {
    await forceMfa(userId);
    setShowUserMenu(null);
  };

  const handleForcePasswordReset = async (userId: string) => {
    await forcePasswordReset(userId);
    setShowUserMenu(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    await updateUser({ userId, data: { role: newRole } });
    setShowUserMenu(null);
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 1;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <UserGroupIcon className="h-8 w-8 text-blue-400" />
            Identity & Access Management
          </h1>
          <p className="text-gray-400 mt-1">
            Create users, assign roles, manage accounts, and enforce security policies
          </p>
        </div>
        <button onClick={() => { setShowCreateModal(true); setCreatedUserInfo(null); setFormError(''); }} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          Create User
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: data?.total || 0, color: 'text-white' },
          { label: 'Admins', value: data?.users.filter((u) => u.role === 'admin').length || 0, color: 'text-purple-400' },
          { label: 'Analysts', value: data?.users.filter((u) => u.role === 'analyst').length || 0, color: 'text-blue-400' },
          { label: 'Suspended', value: data?.users.filter((u) => u.status === 'suspended').length || 0, color: 'text-red-400' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-sm text-gray-400">{s.label}</p>
            <p className={clsx('text-2xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or email..."
            className="input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="input w-auto py-2 text-sm"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="analyst">Analyst</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input w-auto py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {error ? (
        <div className="card text-center py-12">
          <p className="text-red-400">Failed to load users</p>
        </div>
      ) : !data?.users.length ? (
        <div className="card text-center py-12">
          <UserIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No users found</p>
        </div>
      ) : (
        <div className="table-container card p-0">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Status</th>
                <th>Org ID</th>
                <th>Risk</th>
                <th>Trust</th>
                <th>MFA</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => {
                const statusMeta = STATUS_BADGES[user.status] || STATUS_BADGES.active;
                const trustMeta = TRUST_INDICATORS[user.trust_level] || TRUST_INDICATORS.unknown;
                return (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-sentinel-600/20 flex items-center justify-center text-sentinel-400 font-semibold text-sm">
                          {user.first_name[0]}{user.last_name[0]}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{user.first_name} {user.last_name}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={clsx('badge', ROLE_BADGES[user.role] || 'badge-neutral')}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={statusMeta.className}>{statusMeta.label}</span>
                    </td>
                    <td className="text-sm text-gray-400 whitespace-nowrap">
                      {user.org_id || '—'}
                    </td>
                    <td>
                      <span className={clsx(
                        'text-sm font-semibold',
                        user.risk_score >= 600 ? 'text-red-400' : user.risk_score >= 300 ? 'text-yellow-400' : 'text-green-400'
                      )}>
                        {user.risk_score}
                      </span>
                    </td>
                    <td>
                      <span className={clsx('text-xs', trustMeta.color)}>{trustMeta.label}</span>
                    </td>
                    <td>
                      {user.mfa_enabled ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-400" />
                      ) : (
                        <XCircleIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </td>
                    <td className="text-sm text-gray-400 whitespace-nowrap">
                      {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                    </td>
                    <td>
                      <div className="relative">
                        <button
                          onClick={() => setShowUserMenu(showUserMenu === user.id ? null : user.id)}
                          className="p-1.5 rounded hover:bg-dashboard-hover text-gray-400 hover:text-white"
                        >
                          <EllipsisVerticalIcon className="h-5 w-5" />
                        </button>

                        {showUserMenu === user.id && (
                          <div className="absolute right-0 top-8 z-20 w-56 bg-dashboard-card border border-dashboard-border rounded-xl shadow-2xl py-2 animate-fade-in">
                            <div className="px-3 py-1.5 text-xs text-gray-500 border-b border-dashboard-border mb-1">
                              Role Assignment
                            </div>
                            {['admin', 'analyst', 'viewer'].filter((r) => r !== user.role).map((role) => (
                              <button
                                key={role}
                                onClick={() => handleRoleChange(user.id, role)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dashboard-hover hover:text-white flex items-center gap-2"
                              >
                                <ShieldCheckIcon className="h-4 w-4" />
                                Set as {role}
                              </button>
                            ))}

                            <div className="border-t border-dashboard-border my-1" />

                            <div className="px-3 py-1.5 text-xs text-gray-500">Security</div>
                            {!user.mfa_enabled && (
                              <button
                                onClick={() => handleForceMfa(user.id)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dashboard-hover hover:text-white flex items-center gap-2"
                              >
                                <FingerPrintIcon className="h-4 w-4" />
                                Force MFA
                              </button>
                            )}
                            <button
                              onClick={() => handleForcePasswordReset(user.id)}
                              className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-dashboard-hover hover:text-white flex items-center gap-2"
                            >
                              <KeyIcon className="h-4 w-4" />
                              Reset Password
                            </button>

                            <div className="border-t border-dashboard-border my-1" />

                            {user.status === 'suspended' || !user.is_active ? (
                              <button
                                onClick={() => handleActivate(user.id)}
                                className="w-full text-left px-3 py-2 text-sm text-green-400 hover:bg-green-900/20 flex items-center gap-2"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                Activate Account
                              </button>
                            ) : (
                              <button
                                onClick={() => { setShowSuspendModal(user); setShowUserMenu(null); }}
                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <LockClosedIcon className="h-4 w-4" />
                                Suspend Account
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Page {page} of {totalPages} ({data?.total} users)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="btn-secondary text-sm"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="btn-secondary text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dashboard-card border border-dashboard-border rounded-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
              <h2 className="text-xl font-bold text-white">Create New User</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-dashboard-hover text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {createdUserInfo ? (
              <div className="p-6 space-y-4">
                <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4 text-center">
                  <CheckCircleIcon className="h-10 w-10 text-green-400 mx-auto mb-2" />
                  <p className="text-green-300 font-semibold">User Created Successfully</p>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500">Email</label>
                    <div className="flex items-center gap-2 mt-1">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-white">{createdUserInfo.email}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Temporary Password</label>
                    <div className="flex items-center gap-2 mt-1 bg-dashboard-bg rounded-lg p-3">
                      <KeyIcon className="h-4 w-4 text-yellow-400" />
                      <code className="text-yellow-300 text-sm font-mono flex-1">{createdUserInfo.password}</code>
                      <button
                        onClick={() => navigator.clipboard.writeText(createdUserInfo.password)}
                        className="p-1 rounded hover:bg-dashboard-hover text-gray-400 hover:text-white"
                        title="Copy password"
                      >
                        <ClipboardDocumentIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-xs text-yellow-500 mt-1">Share this securely. User must change on first login.</p>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={() => setShowCreateModal(false)} className="btn-primary w-full">Done</button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  {formError && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-400">
                      {formError}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">First Name</label>
                      <input type="text" value={formFirstName} onChange={(e) => setFormFirstName(e.target.value)} placeholder="John" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Last Name</label>
                      <input type="text" value={formLastName} onChange={(e) => setFormLastName(e.target.value)} placeholder="Doe" className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                    <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@company.com" className="input" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">Role</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'viewer', label: 'Viewer', desc: 'Basic access' },
                        { value: 'analyst', label: 'Analyst', desc: 'Investigation access' },
                        { value: 'admin', label: 'Admin', desc: 'Full system access' },
                      ].map((r) => (
                        <button
                          key={r.value}
                          onClick={() => setFormRole(r.value)}
                          className={clsx(
                            'flex flex-col items-center gap-1 px-3 py-3 rounded-lg text-sm border transition-colors',
                            formRole === r.value
                              ? 'border-sentinel-500 bg-sentinel-600/20 text-white'
                              : 'border-dashboard-border bg-dashboard-bg text-gray-400 hover:text-white'
                          )}
                        >
                          <span className="font-medium">{r.label}</span>
                          <span className="text-xs text-gray-500">{r.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Organization ID</label>
                      <input type="text" value={formOrgId} onChange={(e) => setFormOrgId(e.target.value)} placeholder="ORG-001" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Phone Number <span className="text-gray-500 text-xs">(optional)</span></label>
                      <input type="tel" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+2547XXXXXXXX" className="input" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Risk Score</label>
                      <input type="number" min={0} max={1000} value={formRiskScore} onChange={(e) => setFormRiskScore(e.target.value)} placeholder="0" className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1.5">Account Status</label>
                      <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="input">
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3 text-sm text-blue-300">
                    A temporary password will be auto-generated. Share it securely with the user.
                  </div>
                </div>
                <div className="flex items-center justify-end gap-3 p-6 border-t border-dashboard-border">
                  <button onClick={() => setShowCreateModal(false)} className="btn-secondary">Cancel</button>
                  <button
                    onClick={handleCreate}
                    disabled={!formEmail || !formFirstName || !formLastName || creating}
                    className="btn-primary"
                  >
                    {creating ? <LoadingSpinner size="sm" /> : 'Create User'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dashboard-card border border-dashboard-border rounded-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
              <h2 className="text-xl font-bold text-white">Suspend Account</h2>
              <button onClick={() => setShowSuspendModal(null)} className="p-2 rounded-lg hover:bg-dashboard-hover text-gray-400 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  <div>
                    <p className="text-red-300 font-medium">Suspending: {showSuspendModal.first_name} {showSuspendModal.last_name}</p>
                    <p className="text-sm text-red-400/70">{showSuspendModal.email}</p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Suspension Reason</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Provide justification for suspending this account..."
                  rows={3}
                  className="input resize-none"
                />
              </div>
              <p className="text-xs text-gray-500">
                This will immediately revoke all sessions and prevent login. The action is recorded in the audit trail.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-dashboard-border">
              <button onClick={() => setShowSuspendModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handleSuspend} disabled={!suspendReason || suspendReason.length < 5} className="btn-danger">
                Suspend Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click-away for menu */}
      {showUserMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(null)} />
      )}
    </div>
  );
}
