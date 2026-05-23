import { useState } from 'react';
import {
  useGetEnforcementHistoryQuery,
  useListRecommendationsQuery,
  useApproveRecommendationMutation,
  useRejectRecommendationMutation,
  useLockUserMutation,
  useUnlockUserMutation,
  useFreezeLoanMutation,
  useOverrideRiskMutation,
  useForceMfaMutation,
  useForcePasswordResetMutation,
} from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ShieldExclamationIcon,
  LockClosedIcon,
  LockOpenIcon,
  BanknotesIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  FingerPrintIcon,
  AdjustmentsHorizontalIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const ACTION_LABELS: Record<string, { label: string; color: string; icon: typeof LockClosedIcon }> = {
  lock: { label: 'Account Locked', color: 'badge-danger', icon: LockClosedIcon },
  unlock: { label: 'Account Unlocked', color: 'badge-success', icon: LockOpenIcon },
  suspend: { label: 'Account Suspended', color: 'badge-warning', icon: ExclamationTriangleIcon },
  activate: { label: 'Account Activated', color: 'badge-success', icon: CheckCircleIcon },
  freeze_loan: { label: 'Loans Frozen', color: 'badge-danger', icon: BanknotesIcon },
  unfreeze_loan: { label: 'Loans Unfrozen', color: 'badge-success', icon: BanknotesIcon },
  require_mfa: { label: 'MFA Enforced', color: 'badge-info', icon: FingerPrintIcon },
  override_risk: { label: 'Risk Override', color: 'badge-warning', icon: AdjustmentsHorizontalIcon },
  force_password_reset: { label: 'Password Reset', color: 'badge-info', icon: KeyIcon },
  restrict: { label: 'Restricted', color: 'badge-warning', icon: ShieldExclamationIcon },
};

const SEVERITY_COLORS: Record<string, string> = {
  low: 'text-green-400 bg-green-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  high: 'text-red-400 bg-red-500/10',
  critical: 'text-red-600 bg-red-600/10',
};

const REC_ACTION_LABELS: Record<string, string> = {
  monitor: 'Monitor',
  restrict: 'Restrict Access',
  lock: 'Lock Account',
  step_up_auth: 'Require MFA',
  freeze_loan: 'Freeze Loans',
  escalate: 'Escalate',
};

export default function Enforcement() {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'history' | 'actions'>('recommendations');
  const [historyFilter, setHistoryFilter] = useState('');
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [actionUserId, setActionUserId] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [actionScore, setActionScore] = useState(0);
  const [reviewNotes, setReviewNotes] = useState('');

  const { data: recommendations, isLoading: recsLoading } = useListRecommendationsQuery({ page: 1, page_size: 50 });
  const { data: enforcement, isLoading: enfLoading } = useGetEnforcementHistoryQuery({
    action_type: historyFilter || undefined,
    page: 1,
    page_size: 50,
  });

  const [approveRec, { isLoading: approving }] = useApproveRecommendationMutation();
  const [rejectRec, { isLoading: rejecting }] = useRejectRecommendationMutation();
  const [lockUser] = useLockUserMutation();
  const [unlockUser] = useUnlockUserMutation();
  const [freezeLoan] = useFreezeLoanMutation();
  const [overrideRisk] = useOverrideRiskMutation();
  const [forceMfa] = useForceMfaMutation();
  const [forcePasswordReset] = useForcePasswordResetMutation();

  const handleApprove = async (recId: string) => {
    await approveRec({ recId, review_notes: reviewNotes || undefined });
    setReviewNotes('');
  };

  const handleReject = async (recId: string) => {
    await rejectRec({ recId, review_notes: reviewNotes || undefined });
    setReviewNotes('');
  };

  const openActionModal = (type: string) => {
    setActionType(type);
    setActionUserId('');
    setActionReason('');
    setActionScore(0);
    setShowActionModal(true);
  };

  const executeAction = async () => {
    if (!actionUserId) return;
    try {
      switch (actionType) {
        case 'lock':
          await lockUser({ userId: actionUserId, reason: actionReason }).unwrap();
          break;
        case 'unlock':
          await unlockUser({ userId: actionUserId, reason: actionReason }).unwrap();
          break;
        case 'freeze_loan':
          await freezeLoan({ userId: actionUserId, reason: actionReason }).unwrap();
          break;
        case 'override_risk':
          await overrideRisk({
            userId: actionUserId,
            data: { new_risk_score: actionScore, reason: actionReason },
          }).unwrap();
          break;
        case 'force_mfa':
          await forceMfa(actionUserId).unwrap();
          break;
        case 'force_password_reset':
          await forcePasswordReset(actionUserId).unwrap();
          break;
      }
      setShowActionModal(false);
    } catch (err) {
      console.error('Enforcement action failed:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ShieldExclamationIcon className="h-8 w-8 text-red-400" />
            Enforcement Authority
          </h1>
          <p className="text-gray-400 mt-1">
            Review recommendations, execute enforcement decisions, and manage account actions
          </p>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { type: 'lock', label: 'Lock Account', icon: LockClosedIcon, color: 'hover:border-red-500/50 hover:bg-red-900/20' },
          { type: 'unlock', label: 'Unlock Account', icon: LockOpenIcon, color: 'hover:border-green-500/50 hover:bg-green-900/20' },
          { type: 'freeze_loan', label: 'Freeze Loans', icon: BanknotesIcon, color: 'hover:border-blue-500/50 hover:bg-blue-900/20' },
          { type: 'override_risk', label: 'Override Risk', icon: AdjustmentsHorizontalIcon, color: 'hover:border-yellow-500/50 hover:bg-yellow-900/20' },
          { type: 'force_mfa', label: 'Force MFA', icon: FingerPrintIcon, color: 'hover:border-purple-500/50 hover:bg-purple-900/20' },
          { type: 'force_password_reset', label: 'Reset Password', icon: KeyIcon, color: 'hover:border-cyan-500/50 hover:bg-cyan-900/20' },
        ].map((btn) => (
          <button
            key={btn.type}
            onClick={() => openActionModal(btn.type)}
            className={clsx(
              'card flex flex-col items-center gap-2 py-4 px-3 cursor-pointer border-transparent transition-all',
              btn.color
            )}
          >
            <btn.icon className="h-6 w-6 text-gray-300" />
            <span className="text-xs font-medium text-gray-300">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dashboard-border">
        {[
          { key: 'recommendations', label: 'Pending Recommendations', count: recommendations?.total },
          { key: 'history', label: 'Enforcement History', count: enforcement?.total },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as 'recommendations' | 'history')}
            className={clsx(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-sentinel-500 text-white'
                : 'border-transparent text-gray-400 hover:text-white'
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-sentinel-600/30 text-sentinel-300">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content: Recommendations */}
      {activeTab === 'recommendations' && (
        <div className="space-y-4">
          {recsLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : !recommendations?.recommendations.length ? (
            <div className="card text-center py-12">
              <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-400">No pending recommendations</p>
              <p className="text-sm text-gray-500 mt-1">All analyst recommendations have been reviewed</p>
            </div>
          ) : (
            recommendations.recommendations.map((rec) => (
              <div key={rec.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={clsx('px-2 py-1 rounded text-xs font-semibold', SEVERITY_COLORS[rec.investigation_severity] || 'text-gray-400 bg-gray-500/10')}>
                        {rec.investigation_severity.toUpperCase()}
                      </span>
                      <span className="badge-info">{REC_ACTION_LABELS[rec.action] || rec.action}</span>
                    </div>

                    <h3 className="text-white font-semibold">
                      {rec.subject_name}
                      <span className="text-gray-400 font-normal ml-2">{rec.subject_email}</span>
                    </h3>

                    <p className="text-sm text-gray-400 mt-2">{rec.justification}</p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>Analyst: <span className="text-gray-300">{rec.analyst_name}</span></span>
                      <span>Risk Score: <span className={rec.subject_risk_score >= 600 ? 'text-red-400' : rec.subject_risk_score >= 300 ? 'text-yellow-400' : 'text-green-400'}>{rec.subject_risk_score}</span></span>
                      <span>{new Date(rec.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Review Notes Input */}
                    <div className="mt-3">
                      <input
                        type="text"
                        placeholder="Add review notes (optional)..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        className="input text-sm py-1.5"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <button
                      onClick={() => handleApprove(rec.id)}
                      disabled={approving}
                      className="btn bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1.5 inline" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(rec.id)}
                      disabled={rejecting}
                      className="btn bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2"
                    >
                      <XCircleIcon className="h-4 w-4 mr-1.5 inline" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Enforcement History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-3">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value)}
              className="input w-auto py-1.5 text-sm"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {enfLoading ? (
            <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
          ) : !enforcement?.actions.length ? (
            <div className="card text-center py-12">
              <ArrowPathIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No enforcement actions recorded</p>
            </div>
          ) : (
            <div className="table-container card p-0">
              <table className="table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Action</th>
                    <th>Target User</th>
                    <th>Admin</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {enforcement.actions.map((action) => {
                    const meta = ACTION_LABELS[action.action] || { label: action.action, color: 'badge-neutral', icon: ShieldExclamationIcon };
                    return (
                      <tr key={action.id}>
                        <td className="text-gray-400 text-sm whitespace-nowrap">
                          {new Date(action.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span className={meta.color}>{meta.label}</span>
                        </td>
                        <td>
                          <div>
                            <div className="text-white text-sm">{action.target_user_name}</div>
                            <div className="text-xs text-gray-500">{action.target_user_email}</div>
                          </div>
                        </td>
                        <td className="text-gray-300 text-sm">{action.admin_name}</td>
                        <td className="text-gray-400 text-sm max-w-xs truncate" title={action.reason}>
                          {action.reason}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dashboard-card border border-dashboard-border rounded-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
              <h2 className="text-xl font-bold text-white capitalize">
                {actionType.replace(/_/g, ' ')}
              </h2>
              <button
                onClick={() => setShowActionModal(false)}
                className="p-2 rounded-lg hover:bg-dashboard-hover text-gray-400 hover:text-white"
              >
                <XCircleIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">User ID</label>
                <input
                  type="text"
                  value={actionUserId}
                  onChange={(e) => setActionUserId(e.target.value)}
                  placeholder="Enter user ID..."
                  className="input"
                />
              </div>

              {actionType === 'override_risk' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">New Risk Score</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={actionScore}
                    onChange={(e) => setActionScore(Number(e.target.value))}
                    className="input"
                  />
                </div>
              )}

              {!['force_mfa', 'force_password_reset'].includes(actionType) && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Reason</label>
                  <textarea
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    placeholder="Justification for this action..."
                    rows={3}
                    className="input resize-none"
                  />
                </div>
              )}

              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3 flex items-start gap-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-300">
                  This action will be permanently recorded in the audit trail and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-dashboard-border">
              <button onClick={() => setShowActionModal(false)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={executeAction}
                disabled={!actionUserId}
                className="btn-danger"
              >
                Execute Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
