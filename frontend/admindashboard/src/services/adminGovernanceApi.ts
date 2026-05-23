import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

// ─────────────────────────────────────────────────────────────
// Type Definitions
// ─────────────────────────────────────────────────────────────

export interface SystemOverview {
  risk_distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  active_investigations: number;
  pending_recommendations: number;
  recent_enforcement_actions: number;
  total_users: number;
  active_sessions: number;
  high_risk_user_count: number;
  policy_count: number;
  mfa_adoption_percent: number;
  suspicious_org_count: number;
}

export interface PolicyConfig {
  [key: string]: unknown;
}

export interface Policy {
  id: string;
  name: string;
  category: string;
  description: string | null;
  config: PolicyConfig;
  version: number;
  active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PolicyListResponse {
  policies: Policy[];
  total: number;
  page: number;
  page_size: number;
}

export interface PolicyCreateRequest {
  name: string;
  category: string;
  description?: string;
  config: PolicyConfig;
}

export interface PolicyUpdateRequest {
  name?: string;
  category?: string;
  description?: string;
  config?: PolicyConfig;
  active?: boolean;
}

export interface EnforcementActionRecord {
  id: string;
  user_id: string;
  action: string;
  enforced_by: string;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
  target_user_name: string;
  target_user_email: string | null;
  admin_name: string;
}

export interface EnforcementHistoryResponse {
  actions: EnforcementActionRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface PendingRecommendation {
  id: string;
  investigation_id: string;
  recommended_by: string;
  analyst_name: string;
  action: string;
  justification: string;
  status: string;
  created_at: string;
  subject_user_id: string | null;
  subject_name: string;
  subject_email: string | null;
  subject_risk_score: number;
  investigation_severity: string;
}

export interface RecommendationsResponse {
  recommendations: PendingRecommendation[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  visibility: string;
  is_active: boolean;
  email_verified: boolean;
  mfa_enabled: boolean;
  risk_score: number;
  trust_level: string;
  org_id: string | null;
  is_system_user: boolean;
  last_login_at: string | null;
  last_login_ip: string | null;
  created_at: string;
  updated_at: string | null;
  enforcement_count: number;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface AdminUserCreateRequest {
  email: string;
  first_name: string;
  last_name: string;
  role?: string;
  org_id?: string;
  password?: string;
  phone?: string;
  risk_score?: number;
  status?: string;
}

export interface AdminUserUpdateRequest {
  first_name?: string;
  last_name?: string;
  role?: string;
  org_id?: string;
  status?: string;
  visibility?: string;
  trust_level?: string;
}

export interface SystemReport {
  generated_at: string;
  report_period: { start: string; end: string };
  user_summary: {
    total: number;
    active: number;
    suspended: number;
    mfa_enabled: number;
    mfa_adoption_rate: number;
    email_verified: number;
    verification_rate: number;
  };
  risk_summary: {
    average_risk_score: number;
    high_risk_users: number;
    high_risk_rate: number;
  };
  enforcement_summary: {
    total_actions_30d: number;
    by_type: Record<string, number>;
  };
  policy_summary: {
    active_policies: number;
    total_policies: number;
  };
  compliance_indicators: {
    failed_logins_30d: number;
    audit_entries_30d: number;
    mfa_adoption_rate: number;
    account_lockout_rate: number;
  };
}

export interface OrgRiskSummary {
  org_id: string;
  org_name: string;
  total_users: number;
  high_risk_users: number;
  avg_risk_score: number;
  active_investigations: number;
  pending_recommendations: number;
  recent_enforcement_count: number;
}

export interface AuditLogRecord {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string | null;
  action: string;
  target: string | null;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface AuditLogsResponse {
  logs: AuditLogRecord[];
  total: number;
  page: number;
  page_size: number;
}

export interface RiskOverrideRequest {
  new_risk_score: number;
  reason: string;
}

// ─────────────────────────────────────────────────────────────
// API Definition
// ─────────────────────────────────────────────────────────────

export const adminGovernanceApi = createApi({
  reducerPath: 'adminGovernanceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/v1/admin',
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Overview', 'Policies', 'Enforcement', 'IAMUsers', 'Recommendations', 'Compliance', 'Audits'],
  endpoints: (builder) => ({

    // ── System Overview ──────────────────────────────────────
    getSystemOverview: builder.query<SystemOverview, void>({
      query: () => '/overview',
      providesTags: ['Overview'],
    }),

    // ── Policies ─────────────────────────────────────────────
    listPolicies: builder.query<PolicyListResponse, { category?: string; active_only?: boolean; page?: number; page_size?: number }>({
      query: ({ category, active_only = true, page = 1, page_size = 20 }) => {
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        params.append('active_only', String(active_only));
        params.append('page', String(page));
        params.append('page_size', String(page_size));
        return `/policies?${params.toString()}`;
      },
      providesTags: ['Policies'],
    }),

    createPolicy: builder.mutation<Policy, PolicyCreateRequest>({
      query: (body) => ({ url: '/policies', method: 'POST', body }),
      invalidatesTags: ['Policies', 'Overview'],
    }),

    updatePolicy: builder.mutation<Policy, { id: string; data: PolicyUpdateRequest }>({
      query: ({ id, data }) => ({ url: `/policies/${id}`, method: 'PATCH', body: data }),
      invalidatesTags: ['Policies'],
    }),

    deletePolicy: builder.mutation<{ msg: string }, string>({
      query: (id) => ({ url: `/policies/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Policies', 'Overview'],
    }),

    // ── IAM Users ────────────────────────────────────────────
    listAdminUsers: builder.query<AdminUserListResponse, { role?: string; status?: string; search?: string; page?: number; page_size?: number }>({
      query: ({ role, status, search, page = 1, page_size = 20 }) => {
        const params = new URLSearchParams();
        if (role) params.append('role', role);
        if (status) params.append('status', status);
        if (search) params.append('search', search);
        params.append('page', String(page));
        params.append('page_size', String(page_size));
        return `/users?${params.toString()}`;
      },
      providesTags: ['IAMUsers'],
    }),

    createAdminUser: builder.mutation<{ id: string; email: string; temporary_password: string; org_id?: string; phone?: string; risk_score?: number; status?: string; created_at?: string; msg: string }, AdminUserCreateRequest>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['IAMUsers', 'Overview'],
    }),

    updateAdminUser: builder.mutation<{ msg: string; changes: Record<string, unknown> }, { userId: string; data: AdminUserUpdateRequest }>({
      query: ({ userId, data }) => ({ url: `/users/${userId}`, method: 'PATCH', body: data }),
      invalidatesTags: ['IAMUsers'],
    }),

    suspendUser: builder.mutation<{ msg: string }, { userId: string; reason: string }>({
      query: ({ userId, reason }) => ({
        url: `/users/${userId}/suspend?reason=${encodeURIComponent(reason)}`,
        method: 'POST',
      }),
      invalidatesTags: ['IAMUsers', 'Overview', 'Enforcement'],
    }),

    activateUser: builder.mutation<{ msg: string }, { userId: string; reason?: string }>({
      query: ({ userId, reason = 'Admin activated' }) => ({
        url: `/users/${userId}/activate?reason=${encodeURIComponent(reason)}`,
        method: 'POST',
      }),
      invalidatesTags: ['IAMUsers', 'Overview', 'Enforcement'],
    }),

    forceMfa: builder.mutation<{ msg: string }, string>({
      query: (userId) => ({ url: `/users/${userId}/force-mfa`, method: 'POST' }),
      invalidatesTags: ['IAMUsers', 'Enforcement'],
    }),

    forcePasswordReset: builder.mutation<{ msg: string }, string>({
      query: (userId) => ({ url: `/users/${userId}/reset-password`, method: 'POST' }),
      invalidatesTags: ['IAMUsers', 'Enforcement'],
    }),

    // ── Enforcement ──────────────────────────────────────────
    getEnforcementHistory: builder.query<EnforcementHistoryResponse, { user_id?: string; action_type?: string; page?: number; page_size?: number }>({
      query: ({ user_id, action_type, page = 1, page_size = 20 }) => {
        const params = new URLSearchParams();
        if (user_id) params.append('user_id', user_id);
        if (action_type) params.append('action_type', action_type);
        params.append('page', String(page));
        params.append('page_size', String(page_size));
        return `/enforcement?${params.toString()}`;
      },
      providesTags: ['Enforcement'],
    }),

    lockUser: builder.mutation<{ msg: string }, { userId: string; reason: string }>({
      query: ({ userId, reason }) => ({
        url: `/users/${userId}/lock?reason=${encodeURIComponent(reason)}`,
        method: 'POST',
      }),
      invalidatesTags: ['IAMUsers', 'Overview', 'Enforcement'],
    }),

    unlockUser: builder.mutation<{ msg: string }, { userId: string; reason?: string }>({
      query: ({ userId, reason = 'Admin unlocked' }) => ({
        url: `/users/${userId}/unlock?reason=${encodeURIComponent(reason)}`,
        method: 'POST',
      }),
      invalidatesTags: ['IAMUsers', 'Overview', 'Enforcement'],
    }),

    freezeLoan: builder.mutation<{ msg: string; loans_frozen: number }, { userId: string; reason: string }>({
      query: ({ userId, reason }) => ({
        url: `/users/${userId}/freeze-loan?reason=${encodeURIComponent(reason)}`,
        method: 'POST',
      }),
      invalidatesTags: ['IAMUsers', 'Enforcement'],
    }),

    overrideRisk: builder.mutation<{ msg: string; old_score: number; new_score: number }, { userId: string; data: RiskOverrideRequest }>({
      query: ({ userId, data }) => ({
        url: `/users/${userId}/override-risk`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['IAMUsers', 'Overview', 'Enforcement'],
    }),

    // ── Recommendations ──────────────────────────────────────
    listRecommendations: builder.query<RecommendationsResponse, { page?: number; page_size?: number }>({
      query: ({ page = 1, page_size = 20 }) => `/recommendations?page=${page}&page_size=${page_size}`,
      providesTags: ['Recommendations'],
    }),

    approveRecommendation: builder.mutation<{ msg: string }, { recId: string; review_notes?: string }>({
      query: ({ recId, review_notes }) => ({
        url: `/recommendations/${recId}/approve`,
        method: 'POST',
        body: review_notes ? { review_notes } : undefined,
      }),
      invalidatesTags: ['Recommendations', 'IAMUsers', 'Overview', 'Enforcement'],
    }),

    rejectRecommendation: builder.mutation<{ msg: string }, { recId: string; review_notes?: string }>({
      query: ({ recId, review_notes }) => ({
        url: `/recommendations/${recId}/reject`,
        method: 'POST',
        body: review_notes ? { review_notes } : undefined,
      }),
      invalidatesTags: ['Recommendations'],
    }),

    // ── Compliance & Reporting ───────────────────────────────
    getSystemReport: builder.query<SystemReport, void>({
      query: () => '/system-report',
      providesTags: ['Compliance'],
    }),

    getOrgRiskSummary: builder.query<OrgRiskSummary[], void>({
      query: () => '/org-risk-summary',
      providesTags: ['Compliance'],
    }),

    getGovernanceAuditLogs: builder.query<AuditLogsResponse, { actor_id?: string; action?: string; start_date?: string; end_date?: string; page?: number; page_size?: number }>({
      query: ({ actor_id, action, start_date, end_date, page = 1, page_size = 50 }) => {
        const params = new URLSearchParams();
        if (actor_id) params.append('actor_id', actor_id);
        if (action) params.append('action', action);
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        params.append('page', String(page));
        params.append('page_size', String(page_size));
        return `/audits?${params.toString()}`;
      },
      providesTags: ['Audits'],
    }),

    exportGovernanceAuditLogs: builder.mutation<{ format: string; record_count: number; exported_at: string; records: unknown[] }, { format?: string; start_date?: string; end_date?: string }>({
      query: ({ format = 'json', start_date, end_date }) => {
        const params = new URLSearchParams();
        params.append('format', format);
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        return { url: `/audits/export?${params.toString()}`, method: 'GET' };
      },
    }),

    // ── Fintech: Interest, Repayments, Transactions ─────────
    listInterestPolicies: builder.query<{ policies: Array<{ id: string; name: string; risk_tier: string; base_rate: number; penalty_rate: number; grace_period_days: number; active: boolean }>; total: number }, { active_only?: boolean }>({
      query: ({ active_only = true } = {}) => `/interest/policies?active_only=${active_only}`,
      providesTags: ['Policies'],
    }),

    createInterestPolicy: builder.mutation<unknown, { name: string; risk_tier: string; base_rate: number; penalty_rate: number; grace_period_days?: number }>({
      query: (body) => ({ url: '/interest/policies', method: 'POST', body }),
      invalidatesTags: ['Policies'],
    }),

    getOverdueRepayments: builder.query<{ items: Array<Record<string, unknown>>; total: number }, { limit?: number }>({
      query: ({ limit = 50 } = {}) => `/repayments/overdue?limit=${limit}`,
      providesTags: ['Enforcement'],
    }),

    verifyRepayment: builder.mutation<unknown, { repaymentId: string; approve: boolean }>({
      query: ({ repaymentId, approve }) => ({
        url: `/repayments/${repaymentId}/verify`,
        method: 'POST',
        body: { approve },
      }),
      invalidatesTags: ['Enforcement'],
    }),

    freezeLoanRepayments: builder.mutation<unknown, { loan_id: string; freeze: boolean; reason?: string }>({
      query: (body) => ({ url: '/repayments/freeze', method: 'POST', body }),
      invalidatesTags: ['Enforcement'],
    }),

    getTransactionAlerts: builder.query<{ alerts: Array<Record<string, unknown>>; total: number }, { severity?: string; limit?: number }>({
      query: ({ severity, limit = 50 } = {}) => {
        const params = new URLSearchParams();
        if (severity) params.append('severity', severity);
        params.append('limit', String(limit));
        return `/transactions/alerts?${params.toString()}`;
      },
      providesTags: ['Compliance'],
    }),

    getGlobalTxnThresholds: builder.query<{ daily_velocity_limit: number; weekly_velocity_limit: number; anomaly_score_threshold: number }, void>({
      query: () => '/transactions/thresholds',
      providesTags: ['Compliance'],
    }),

    updateGlobalTxnThresholds: builder.mutation<unknown, { daily_velocity_limit?: number; weekly_velocity_limit?: number; anomaly_score_threshold?: number }>({
      query: (body) => ({ url: '/transactions/thresholds', method: 'PATCH', body }),
      invalidatesTags: ['Compliance'],
    }),
  }),
});

// Export Hooks
export const {
  useGetSystemOverviewQuery,
  useListPoliciesQuery,
  useCreatePolicyMutation,
  useUpdatePolicyMutation,
  useDeletePolicyMutation,
  useListAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useSuspendUserMutation,
  useActivateUserMutation,
  useForceMfaMutation,
  useForcePasswordResetMutation,
  useGetEnforcementHistoryQuery,
  useLockUserMutation,
  useUnlockUserMutation,
  useFreezeLoanMutation,
  useOverrideRiskMutation,
  useListRecommendationsQuery,
  useApproveRecommendationMutation,
  useRejectRecommendationMutation,
  useGetSystemReportQuery,
  useGetOrgRiskSummaryQuery,
  useGetGovernanceAuditLogsQuery,
  useExportGovernanceAuditLogsMutation,
  useListInterestPoliciesQuery,
  useCreateInterestPolicyMutation,
  useGetOverdueRepaymentsQuery,
  useVerifyRepaymentMutation,
  useFreezeLoanRepaymentsMutation,
  useGetTransactionAlertsQuery,
  useGetGlobalTxnThresholdsQuery,
  useUpdateGlobalTxnThresholdsMutation,
} = adminGovernanceApi;
