import { useState } from 'react';
import {
  useGetSystemReportQuery,
  useGetOrgRiskSummaryQuery,
  useGetGovernanceAuditLogsQuery,
  useExportGovernanceAuditLogsMutation,
} from '../services/adminGovernanceApi';
import type { OrgRiskSummary } from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ClipboardDocumentListIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  BuildingOffice2Icon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

type Tab = 'report' | 'risk' | 'audit';

export default function Compliance() {
  const [tab, setTab] = useState<Tab>('report');
  const [auditAction, setAuditAction] = useState('');
  const [auditPage, setAuditPage] = useState(1);

  const { data: report, isLoading: rl } = useGetSystemReportQuery();
  const { data: riskSummary, isLoading: rsl } = useGetOrgRiskSummaryQuery();
  const { data: auditLogs, isLoading: al } = useGetGovernanceAuditLogsQuery({
    action: auditAction || undefined,
    page: auditPage,
    page_size: 25,
  });
  const [exportAuditLogs, { isLoading: exporting }] = useExportGovernanceAuditLogsMutation();

  const tabs: { id: Tab; label: string; icon: typeof ClipboardDocumentListIcon }[] = [
    { id: 'report', label: 'System Report', icon: DocumentTextIcon },
    { id: 'risk', label: 'Org Risk Summary', icon: BuildingOffice2Icon },
    { id: 'audit', label: 'Audit Trail', icon: ClipboardDocumentListIcon },
  ];

  const handleExport = async () => {
    try {
      const result = await exportAuditLogs({}).unwrap();
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldCheckIcon className="h-8 w-8 text-green-400" />
            Compliance & Audit
          </h1>
          <p className="text-gray-400 mt-1">
            System reports, organizational risk summaries, and complete audit trail
          </p>
        </div>
        <button onClick={handleExport} disabled={exporting} className="btn-secondary flex items-center gap-2">
          {exporting ? <LoadingSpinner size="sm" /> : <ArrowDownTrayIcon className="h-5 w-5" />}
          Export Audit Logs
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dashboard-border pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors',
              tab === t.id ? 'text-white bg-dashboard-card border border-dashboard-border border-b-0' : 'text-gray-400 hover:text-white'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* System Report Tab */}
      {tab === 'report' && (
        <div className="space-y-6">
          {rl ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : !report ? (
            <div className="card text-center py-12">
              <p className="text-gray-400">Failed to load system report</p>
            </div>
          ) : (
            <>
              {/* Report Header */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">System Compliance Report</h2>
                    <p className="text-sm text-gray-400">Generated {new Date(report.generated_at).toLocaleString()}</p>
                  </div>
                  <div className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-semibold',
                    report.compliance_indicators.mfa_adoption_rate >= 80 ? 'bg-green-900/30 text-green-400' :
                    report.compliance_indicators.mfa_adoption_rate >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                    'bg-red-900/30 text-red-400'
                  )}>
                    MFA Adoption: {report.compliance_indicators.mfa_adoption_rate}%
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: report.user_summary.total, icon: '👤' },
                    { label: 'Active Users', value: report.user_summary.active, icon: '✅' },
                    { label: 'MFA Adoption', value: `${report.user_summary.mfa_adoption_rate}%`, icon: '🔐' },
                    { label: 'Suspended', value: report.user_summary.suspended, icon: '🚫' },
                    { label: 'High Risk', value: report.risk_summary.high_risk_users, icon: '⚠️' },
                    { label: 'Failed Logins (30d)', value: report.compliance_indicators.failed_logins_30d, icon: '📋' },
                    { label: 'Active Policies', value: report.policy_summary.active_policies, icon: '📜' },
                    { label: 'Enforcements (30d)', value: report.enforcement_summary.total_actions_30d, icon: '🔨' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-dashboard-bg rounded-lg p-4 border border-dashboard-border/50">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <span>{kpi.icon}</span>
                        <span>{kpi.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Indicators */}
              {report.compliance_indicators.account_lockout_rate > 5 && (
                <div className="card">
                  <h3 className="text-lg font-semibold text-white mb-4">Compliance Warnings</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-yellow-900/10 border border-yellow-700/20 rounded-lg p-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-yellow-200">Account lockout rate ({report.compliance_indicators.account_lockout_rate}%) exceeds threshold</p>
                    </div>
                    {report.risk_summary.high_risk_rate > 10 && (
                      <div className="flex items-start gap-3 bg-red-900/10 border border-red-700/20 rounded-lg p-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-red-200">High risk user rate ({report.risk_summary.high_risk_rate}%) exceeds safe threshold</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Org Risk Summary Tab */}
      {tab === 'risk' && (
        <div className="space-y-6">
          {rsl ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : !riskSummary ? (
            <div className="card text-center py-12">
              <p className="text-gray-400">Failed to load risk summary</p>
            </div>
          ) : (
            <>
              {/* Risk Distribution by Org */}
              {riskSummary && riskSummary.length > 0 ? (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="card text-center">
                      <p className="text-sm text-gray-400">Total Orgs</p>
                      <p className="text-3xl font-bold text-white mt-1">{riskSummary.length}</p>
                    </div>
                    <div className="card text-center">
                      <p className="text-sm text-gray-400">Avg Risk Score</p>
                      <p className="text-3xl font-bold text-yellow-400 mt-1">
                        {Math.round(riskSummary.reduce((a: number, o: OrgRiskSummary) => a + o.avg_risk_score, 0) / riskSummary.length)}
                      </p>
                    </div>
                    <div className="card text-center">
                      <p className="text-sm text-gray-400">High Risk Users</p>
                      <p className="text-3xl font-bold text-red-400 mt-1">
                        {riskSummary.reduce((a: number, o: OrgRiskSummary) => a + o.high_risk_users, 0)}
                      </p>
                    </div>
                    <div className="card text-center">
                      <p className="text-sm text-gray-400">Total Users</p>
                      <p className="text-3xl font-bold text-green-400 mt-1">
                        {riskSummary.reduce((a: number, o: OrgRiskSummary) => a + o.total_users, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Org Table */}
                  <div className="card p-0 table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Organization</th>
                          <th>Users</th>
                          <th>Avg Risk</th>
                          <th>High Risk</th>
                          <th>Investigations</th>
                          <th>Enforcements</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskSummary.map((org: OrgRiskSummary) => (
                          <tr key={org.org_id}>
                            <td className="text-white font-medium">{org.org_name}</td>
                            <td>{org.total_users}</td>
                            <td>
                              <span className={clsx(
                                'font-semibold',
                                org.avg_risk_score >= 600 ? 'text-red-400' :
                                org.avg_risk_score >= 300 ? 'text-yellow-400' : 'text-green-400'
                              )}>
                                {org.avg_risk_score}
                              </span>
                            </td>
                            <td className="text-red-400">{org.high_risk_users}</td>
                            <td>{org.active_investigations}</td>
                            <td>{org.recent_enforcement_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="card text-center py-12">
                  <ChartBarIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 mb-1">No organization-level risk data</p>
                  <p className="text-xs text-gray-500">Risk summaries are generated when user data is available</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Audit Trail Tab */}
      {tab === 'audit' && (
        <div className="space-y-4">
          {/* Audit Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={auditAction}
              onChange={(e) => { setAuditAction(e.target.value); setAuditPage(1); }}
              className="input w-auto py-2 text-sm"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="user_created">User Created</option>
              <option value="user_suspended">User Suspended</option>
              <option value="user_activated">User Activated</option>
              <option value="role_changed">Role Changed</option>
              <option value="policy_created">Policy Created</option>
              <option value="policy_updated">Policy Updated</option>
              <option value="enforcement">Enforcement</option>
              <option value="mfa_forced">MFA Forced</option>
              <option value="password_reset">Password Reset</option>
              <option value="risk_override">Risk Override</option>
            </select>
            <button onClick={() => { setAuditAction(''); setAuditPage(1); }} className="btn-ghost text-sm flex items-center gap-1">
              <ArrowPathIcon className="h-4 w-4" />
              Reset
            </button>
            <div className="flex-1" />
            <span className="text-sm text-gray-400">{auditLogs?.total || 0} total entries</span>
          </div>

          {al ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : !auditLogs?.logs.length ? (
            <div className="card text-center py-12">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No audit records found</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {auditLogs.logs.map((log, i) => (
                  <div key={i} className="card flex items-start gap-4 py-3 px-4">
                    <div className="flex-shrink-0 mt-0.5">
                      <ClockIcon className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={clsx(
                          'badge text-xs',
                          log.action?.includes('suspend') || log.action?.includes('lock') ? 'badge-danger' :
                          log.action?.includes('creat') || log.action?.includes('activ') ? 'badge-success' :
                          log.action?.includes('poli') ? 'badge-info' : 'badge-neutral'
                        )}>
                          {log.action}
                        </span>
                        {log.actor_name && <span className="text-sm text-gray-300">{log.actor_name}</span>}
                        {log.target && <span className="text-xs text-gray-500">→ {log.target}</span>}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-gray-500 mt-1 truncate">{JSON.stringify(log.metadata)}</p>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {(auditLogs.total || 0) > 25 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm text-gray-400">
                    Page {auditPage} of {Math.ceil((auditLogs.total || 0) / 25)}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAuditPage(Math.max(1, auditPage - 1))}
                      disabled={auditPage <= 1}
                      className="btn-secondary text-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setAuditPage(auditPage + 1)}
                      disabled={auditPage >= Math.ceil((auditLogs.total || 0) / 25)}
                      className="btn-secondary text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
