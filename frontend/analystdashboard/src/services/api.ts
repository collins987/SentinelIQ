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

export async function loginAnalyst(email: string, password: string) {
  const base = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000/users';
  const res = await axios.post(`${base}/auth/login`, { email, password });
  return res.data;
}

export async function getProfile(token: string) {
  const base = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8000/users';
  const res = await axios.get(`${base}/profile`, { headers: headers(token) });
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
