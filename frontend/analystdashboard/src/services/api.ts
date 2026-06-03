import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1/analyst';

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface AnalystAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  user_id?: string;
  user_email?: string;
  risk_score?: number;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface AlertFeedResponse {
  alerts: AnalystAlert[];
  total: number;
  categories: Record<string, number>;
}

export interface HighRiskUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  org_id?: string;
  risk_score: number;
  risk_breakdown: Record<string, number>;
  trust_level: string;
  status: string;
  is_active: boolean;
  last_login_at?: string;
  created_at?: string;
}

export interface HighRiskUsersResponse {
  users: HighRiskUser[];
  total: number;
  threshold: number;
}

export interface UserInspection {
  user: Record<string, any>;
  risk: Record<string, any>;
  activity_timeline: any[];
  login_history: any[];
  devices: any[];
  loans: any[];
  sessions: any[];
  investigations: any[];
  alerts: any[];
}

export interface InvestigationSummary {
  id: string;
  user_id: string;
  subject_name: string;
  subject_email?: string;
  subject_risk_score: number;
  opened_by: string;
  status: string;
  severity: string;
  reason: string;
  summary?: string;
  created_at?: string;
  updated_at?: string;
  notes_count: number;
  recommendations_count: number;
}

export interface InvestigationDetail {
  investigation: Record<string, any>;
  subject: Record<string, any>;
  analyst: Record<string, any>;
  notes: any[];
  recommendations: any[];
  risk_context: Record<string, any>;
}

export interface RiskInsights {
  risk_distribution: Record<string, number>;
  severity_breakdown: Record<string, number>;
  top_risk_orgs: any[];
  recent_patterns: any[];
  open_investigations: number;
  pending_recommendations: number;
  avg_risk_score: number;
  high_risk_users_count: number;
}

export interface SearchResult {
  result_type: string;
  id: string;
  title: string;
  subtitle?: string;
  risk_score?: number;
  status?: string;
  metadata: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// Auth
// ═══════════════════════════════════════════════════════════════

const authBase = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';

export async function loginAnalyst(email: string, password: string) {
  const res = await axios.post(`${authBase}/auth/login`, { email, password });
  return res.data;
}

export async function registerAnalyst(
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  org_id?: string
) {
  const res = await axios.post(`${authBase}/auth/register`, {
    first_name,
    last_name,
    email,
    password,
    role: 'analyst',
    ...(org_id ? { org_id } : {}),
  });
  return res.data;
}

export async function getProfile(token: string) {
  const res = await axios.get(`${authBase}/auth/me`, { headers: headers(token) });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
// Alerts
// ═══════════════════════════════════════════════════════════════

export async function getAlerts(
  token: string,
  params?: { severity?: string; category?: string; limit?: number; offset?: number }
): Promise<AlertFeedResponse> {
  const res = await axios.get(`${API_BASE}/alerts`, {
    headers: headers(token),
    params,
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
// Users
// ═══════════════════════════════════════════════════════════════

export async function getHighRiskUsers(
  token: string,
  params?: { risk?: number; org_id?: string; limit?: number }
): Promise<HighRiskUsersResponse> {
  const res = await axios.get(`${API_BASE}/users`, {
    headers: headers(token),
    params,
  });
  return res.data;
}

export async function inspectUser(token: string, userId: string): Promise<UserInspection> {
  const res = await axios.get(`${API_BASE}/users/${userId}`, {
    headers: headers(token),
  });
  return res.data;
}

export async function getUserTimeline(token: string, userId: string, days?: number) {
  const res = await axios.get(`${API_BASE}/users/${userId}/timeline`, {
    headers: headers(token),
    params: { days },
  });
  return res.data;
}

export async function getUserDevices(token: string, userId: string) {
  const res = await axios.get(`${API_BASE}/users/${userId}/devices`, {
    headers: headers(token),
  });
  return res.data;
}

export async function getUserLoans(token: string, userId: string) {
  const res = await axios.get(`${API_BASE}/users/${userId}/loans`, {
    headers: headers(token),
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
// Investigations
// ═══════════════════════════════════════════════════════════════

export async function createInvestigation(
  token: string,
  data: { user_id: string; severity: string; reason: string }
) {
  const res = await axios.post(`${API_BASE}/investigations`, data, {
    headers: headers(token),
  });
  return res.data;
}

export async function listInvestigations(
  token: string,
  params?: {
    status?: string;
    severity?: string;
    mine?: boolean;
    page?: number;
    page_size?: number;
  }
) {
  const res = await axios.get(`${API_BASE}/investigations`, {
    headers: headers(token),
    params,
  });
  return res.data;
}

export async function getInvestigation(token: string, id: string): Promise<InvestigationDetail> {
  const res = await axios.get(`${API_BASE}/investigations/${id}`, {
    headers: headers(token),
  });
  return res.data;
}

export async function updateInvestigation(
  token: string,
  id: string,
  data: { status?: string; severity?: string; summary?: string }
) {
  const res = await axios.patch(`${API_BASE}/investigations/${id}`, data, {
    headers: headers(token),
  });
  return res.data;
}

export async function addNote(
  token: string,
  investigationId: string,
  data: { note: string; note_type?: string }
) {
  const res = await axios.post(
    `${API_BASE}/investigations/${investigationId}/notes`,
    data,
    { headers: headers(token) }
  );
  return res.data;
}

export async function addRecommendation(
  token: string,
  investigationId: string,
  data: { action: string; justification: string }
) {
  const res = await axios.post(
    `${API_BASE}/investigations/${investigationId}/recommend`,
    data,
    { headers: headers(token) }
  );
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
// Risk Insights
// ═══════════════════════════════════════════════════════════════

export async function getRiskInsights(token: string): Promise<RiskInsights> {
  const res = await axios.get(`${API_BASE}/insights`, {
    headers: headers(token),
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
// Organizations
// ═══════════════════════════════════════════════════════════════

export interface OrgDetail {
  organization: { id: string; name: string };
  stats: {
    total_users: number;
    active_users: number;
    avg_risk_score: number;
    high_risk_users: number;
    open_investigations: number;
  };
  users: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    risk_score: number;
    status: string;
    is_active: boolean;
    trust_level: string;
    last_login_at?: string;
    created_at?: string;
  }>;
}

export async function getOrganizationDetail(token: string, orgId: string): Promise<OrgDetail> {
  const res = await axios.get(`${API_BASE}/organizations/${orgId}`, {
    headers: headers(token),
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
// Search
// ═══════════════════════════════════════════════════════════════

export async function search(
  token: string,
  query: string,
  limit?: number
): Promise<{ results: SearchResult[]; total: number; query: string }> {
  const res = await axios.get(`${API_BASE}/search`, {
    headers: headers(token),
    params: { q: query, limit },
  });
  return res.data;
}

// Backwards-compatible search with AbortSignal support
export async function searchWithSignal(
  token: string,
  query: string,
  limit?: number,
  signal?: AbortSignal
): Promise<{ results: SearchResult[]; total: number; query: string }> {
  const res = await axios.get(`${API_BASE}/search`, {
    headers: headers(token),
    params: { q: query, limit },
    signal,
  });
  return res.data;
}

// ═══════════════════════════════════════════════════════════════
export async function getOverdueRepayments(token: string, limit = 50) {
  const res = await axios.get(`${API_BASE}/repayments/overdue`, {
    headers: headers(token),
    params: { limit },
  });
  return res.data;
}

export async function getTransactionAnomalies(token: string, min_score = 70, limit = 50) {
  const res = await axios.get(`${API_BASE}/transactions/anomalies`, {
    headers: headers(token),
    params: { min_score, limit },
  });
  return res.data;
}

export async function getInterestSimulation(token: string, loanId: string) {
  const res = await axios.get(`${API_BASE}/loans/${loanId}/interest-simulations`, {
    headers: headers(token),
  });
  return res.data;
}

// Password Management
// ═══════════════════════════════════════════════════════════════

export async function requestPasswordReset(email: string) {
  const base = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';
  const res = await axios.post(`${base}/auth/password-reset/request`, { email });
  return res.data;
}

export async function confirmPasswordReset(token: string, new_password: string) {
  const base = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';
  const res = await axios.post(`${base}/auth/password-reset/confirm`, { token, new_password });
  return res.data;
}

export async function changePassword(authToken: string, current_password: string, new_password: string) {
  const base = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000';
  const res = await axios.post(`${base}/auth/change-password`, { current_password, new_password }, {
    headers: headers(authToken),
  });
  return res.data;
}
