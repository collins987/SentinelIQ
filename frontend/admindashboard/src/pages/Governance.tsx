import { useState } from 'react';
import {
  useListPoliciesQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useDeletePolicyMutation,
} from '../services/adminGovernanceApi';
import type { Policy, PolicyCreateRequest, PolicyUpdateRequest } from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  ShieldCheckIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  CogIcon,
  BanknotesIcon,
  LockClosedIcon,
  DocumentCheckIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

const CATEGORY_OPTIONS = [
  { value: 'risk_thresholds', label: 'Risk Thresholds', icon: AdjustmentsHorizontalIcon, color: 'text-red-400' },
  { value: 'auth_requirements', label: 'Auth Requirements', icon: LockClosedIcon, color: 'text-blue-400' },
  { value: 'loan_eligibility', label: 'Loan Eligibility', icon: BanknotesIcon, color: 'text-green-400' },
  { value: 'enforcement_rules', label: 'Enforcement Rules', icon: ShieldCheckIcon, color: 'text-yellow-400' },
  { value: 'compliance', label: 'Compliance', icon: DocumentCheckIcon, color: 'text-purple-400' },
  { value: 'general', label: 'General', icon: Squares2X2Icon, color: 'text-gray-400' },
];

const POLICY_TEMPLATES: Record<string, { description: string; config: Record<string, unknown> }> = {
  risk_thresholds: {
    description: 'Define score boundaries for risk classification levels',
    config: { low_max: 299, medium_max: 599, high_max: 799, critical_min: 800 },
  },
  auth_requirements: {
    description: 'Authentication and session security policies',
    config: { mfa_required_for_admin: true, session_ttl_minutes: 60, max_sessions: 3, password_min_length: 12 },
  },
  loan_eligibility: {
    description: 'Credit and lending eligibility criteria',
    config: { min_credit_score: 620, max_dti_ratio: 0.43, max_loan_amount: 50000, min_account_age_days: 90 },
  },
  enforcement_rules: {
    description: 'Automated enforcement trigger conditions',
    config: { auto_lock_failed_logins: 5, velocity_limit_per_hour: 100, geo_restriction_enabled: true },
  },
  compliance: {
    description: 'Regulatory compliance and data retention settings',
    config: { data_retention_days: 2555, audit_log_retention_days: 3650, pii_encryption_required: true },
  },
  general: {
    description: 'General system configuration',
    config: {},
  },
};

function getCategoryMeta(category: string) {
  return CATEGORY_OPTIONS.find((c) => c.value === category) || CATEGORY_OPTIONS[5];
}

export default function Governance() {
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [showInactive, setShowInactive] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null);

  const { data, isLoading, error } = useListPoliciesQuery({
    category: filterCategory || undefined,
    active_only: !showInactive,
    page: 1,
    page_size: 50,
  });

  const [createPolicy, { isLoading: creating }] = useCreatePolicyMutation();
  const [updatePolicy, { isLoading: updating }] = useUpdatePolicyMutation();
  const [deletePolicy] = useDeletePolicyMutation();

  // ── Create Form State ────────────────────────────────────
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('risk_thresholds');
  const [formDescription, setFormDescription] = useState('');
  const [formConfig, setFormConfig] = useState('{}');
  const [formError, setFormError] = useState('');

  const resetForm = () => {
    setFormName('');
    setFormCategory('risk_thresholds');
    setFormDescription('');
    setFormConfig('{}');
    setFormError('');
  };

  const openCreateModal = () => {
    resetForm();
    setEditingPolicy(null);
    setShowCreateModal(true);
  };

  const openEditModal = (policy: Policy) => {
    setFormName(policy.name);
    setFormCategory(policy.category);
    setFormDescription(policy.description || '');
    setFormConfig(JSON.stringify(policy.config, null, 2));
    setFormError('');
    setEditingPolicy(policy);
    setShowCreateModal(true);
  };

  const handleCategoryChange = (cat: string) => {
    setFormCategory(cat);
    if (!editingPolicy) {
      const template = POLICY_TEMPLATES[cat];
      if (template) {
        setFormDescription(template.description);
        setFormConfig(JSON.stringify(template.config, null, 2));
      }
    }
  };

  const handleSubmit = async () => {
    try {
      const parsedConfig = JSON.parse(formConfig);
      setFormError('');

      if (editingPolicy) {
        const updateData: PolicyUpdateRequest = {};
        if (formName !== editingPolicy.name) updateData.name = formName;
        if (formCategory !== editingPolicy.category) updateData.category = formCategory;
        if (formDescription !== editingPolicy.description) updateData.description = formDescription;
        if (JSON.stringify(parsedConfig) !== JSON.stringify(editingPolicy.config)) updateData.config = parsedConfig;

        await updatePolicy({ id: editingPolicy.id, data: updateData }).unwrap();
      } else {
        const createData: PolicyCreateRequest = {
          name: formName,
          category: formCategory,
          description: formDescription || undefined,
          config: parsedConfig,
        };
        await createPolicy(createData).unwrap();
      }

      setShowCreateModal(false);
      resetForm();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'data' in err
        ? String((err as { data: { detail?: string } }).data?.detail || 'Failed to save policy')
        : 'Failed to save policy';
      setFormError(errorMsg);
    }
  };

  const handleDelete = async (policyId: string) => {
    if (confirm('Deactivate this policy? It can be restored later.')) {
      await deletePolicy(policyId);
    }
  };

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
            <ShieldCheckIcon className="h-8 w-8 text-sentinel-400" />
            Governance & Policy Control
          </h1>
          <p className="text-gray-400 mt-1">
            Define risk thresholds, authentication rules, and compliance policies
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          New Policy
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory('')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            !filterCategory ? 'bg-sentinel-600 text-white' : 'bg-dashboard-card text-gray-400 hover:text-white'
          )}
        >
          All
        </button>
        {CATEGORY_OPTIONS.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setFilterCategory(cat.value)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5',
              filterCategory === cat.value ? 'bg-sentinel-600 text-white' : 'bg-dashboard-card text-gray-400 hover:text-white'
            )}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
        <label className="flex items-center gap-2 ml-auto text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-dashboard-border bg-dashboard-bg text-sentinel-500 focus:ring-sentinel-500"
          />
          Show inactive
        </label>
      </div>

      {/* Policies Grid */}
      {error ? (
        <div className="card text-center py-12">
          <p className="text-red-400">Failed to load policies</p>
        </div>
      ) : !data?.policies.length ? (
        <div className="card text-center py-12">
          <CogIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No policies found</p>
          <p className="text-sm text-gray-500 mt-1">Create your first governance policy to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.policies.map((policy) => {
            const meta = getCategoryMeta(policy.category);
            const isExpanded = expandedPolicy === policy.id;
            return (
              <div key={policy.id} className={clsx('card transition-all', !policy.active && 'opacity-60')}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={clsx('p-2 rounded-lg bg-dashboard-bg', meta.color)}>
                      <meta.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{policy.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="badge-info">{meta.label}</span>
                        <span className="text-xs text-gray-500">v{policy.version}</span>
                        {!policy.active && <span className="badge-danger">Inactive</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(policy)}
                      className="p-1.5 rounded hover:bg-dashboard-hover text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <PencilSquareIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(policy.id)}
                      className="p-1.5 rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors"
                      title="Deactivate"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {policy.description && (
                  <p className="text-sm text-gray-400 mt-3">{policy.description}</p>
                )}

                {/* Config Preview / Expanded View */}
                <div className="mt-4">
                  <button
                    onClick={() => setExpandedPolicy(isExpanded ? null : policy.id)}
                    className="text-xs text-sentinel-400 hover:text-sentinel-300 transition-colors"
                  >
                    {isExpanded ? 'Hide Configuration' : 'Show Configuration'}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 bg-dashboard-bg rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs text-gray-300 font-mono">
                        {JSON.stringify(policy.config, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-dashboard-border text-xs text-gray-500">
                  <span>Updated {new Date(policy.updated_at).toLocaleDateString()}</span>
                  <span>ID: {policy.id.slice(0, 8)}...</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Summary Bar */}
      <div className="card bg-dashboard-bg/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Showing <span className="text-white font-medium">{data?.policies.length || 0}</span> of{' '}
            <span className="text-white font-medium">{data?.total || 0}</span> policies
          </span>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-dashboard-card border border-dashboard-border rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-dashboard-border">
              <h2 className="text-xl font-bold text-white">
                {editingPolicy ? 'Edit Policy' : 'Create New Policy'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-lg hover:bg-dashboard-hover text-gray-400 hover:text-white"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-400">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Policy Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., risk_thresholds_v2"
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => handleCategoryChange(cat.value)}
                      className={clsx(
                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors',
                        formCategory === cat.value
                          ? 'border-sentinel-500 bg-sentinel-600/20 text-white'
                          : 'border-dashboard-border bg-dashboard-bg text-gray-400 hover:text-white hover:border-dashboard-hover'
                      )}
                    >
                      <cat.icon className="h-4 w-4" />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this policy controls..."
                  rows={2}
                  className="input resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Configuration (JSON)
                </label>
                <textarea
                  value={formConfig}
                  onChange={(e) => setFormConfig(e.target.value)}
                  rows={8}
                  className="input font-mono text-sm resize-none"
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Define thresholds, rules, and weights as a JSON object
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-dashboard-border">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formName || creating || updating}
                className="btn-primary"
              >
                {creating || updating ? (
                  <LoadingSpinner size="sm" />
                ) : editingPolicy ? (
                  'Update Policy'
                ) : (
                  'Create Policy'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
