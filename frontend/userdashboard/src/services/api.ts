import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';
const API_V1 = process.env.NEXT_PUBLIC_API_BASE_URL ? `${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/api$/, '')}/api/v1` : 'http://localhost:3000/api/v1';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  mfa_enabled?: boolean;
  trust_level?: string;
  phone?: string;
  email_verified?: boolean;
}

export interface RiskScore {
  id: string;
  score: number;
  type: string;
  suggestions: string[];
}

export interface RiskSignal {
  signal: string;
  impact: number;
  detail: string;
  timestamp?: string;
}

export interface RiskBreakdown {
  risk_score: number;
  risk_level: string;
  breakdown: { identity: number; behavior: number; financial: number; compliance: number };
  trust_level: string;
  last_updated?: string;
  explanation: RiskSignal[];
}

export interface SessionInfo {
  id: string;
  device_info: Record<string, any>;
  ip_address?: string;
  location: Record<string, any>;
  user_agent?: string;
  is_current: boolean;
  revoked: boolean;
  created_at?: string;
  last_seen_at?: string;
}

export interface LoanInfo {
  id: string;
  status: string;
  principal: number;
  outstanding: number;
  interest_rate: number;
  term_months: number;
  purpose?: string;
  next_due_date?: string;
  repayment_schedule: any[];
  last_repayment_at?: string;
  approved_at?: string;
  created_at?: string;
}

export interface RepaymentInfo {
  id: string;
  loan_id: string;
  amount: number;
  status: string;
  due_date?: string;
  paid_at?: string;
  is_late: boolean;
  created_at?: string;
}

export interface AlertInfo {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_read: boolean;
  is_dismissed: boolean;
  alert_metadata: Record<string, any>;
  created_at?: string;
}

export interface SupportTicket {
  message: string;
  email: string;
}

// ─── Auth ───────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  return res.data;
}

export async function register(
  first_name: string,
  last_name: string,
  email: string,
  password: string,
  org_id?: string
): Promise<LoginResponse & { user?: any; message?: string }> {
  const res = await axios.post(`${API_BASE}/auth/register`, {
    first_name,
    last_name,
    email,
    password,
    ...(org_id ? { org_id } : {}),
  });
  return res.data;
}

// ─── Profile ────────────────────────────────────────────────

export async function getProfile(token: string): Promise<UserProfile> {
  const res = await axios.get(`${API_BASE}/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Risk ───────────────────────────────────────────────────

export async function getRiskScores(token: string): Promise<RiskScore[]> {
  const res = await axios.get(`${API_BASE}/analytics/risk-review`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getRiskBreakdown(token: string): Promise<RiskBreakdown> {
  const res = await axios.get(`${API_V1}/users/me/risk`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Sessions ───────────────────────────────────────────────

export async function getSessions(token: string): Promise<{ sessions: SessionInfo[]; total: number }> {
  const res = await axios.get(`${API_V1}/users/me/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function revokeSession(sessionId: string, token: string): Promise<void> {
  await axios.delete(`${API_V1}/users/me/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Loans ──────────────────────────────────────────────────

export async function getLoans(token: string): Promise<{ loans: LoanInfo[]; total: number; total_outstanding: number; total_principal: number }> {
  const res = await axios.get(`${API_V1}/users/me/loans`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getLoanDetail(loanId: string, token: string): Promise<{ loan: LoanInfo; repayments: RepaymentInfo[]; total_paid: number; total_late_payments: number }> {
  const res = await axios.get(`${API_V1}/users/me/loans/${loanId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function applyForLoan(data: { amount: number; term_months: number; purpose?: string }, token: string): Promise<{ loan: LoanInfo; message: string; eligible: boolean }> {
  const res = await axios.post(`${API_V1}/users/me/loans/apply`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function repayLoan(loanId: string, amount: number, token: string): Promise<{ repayment: RepaymentInfo; loan: LoanInfo; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/loans/${loanId}/repay`, { amount }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── MFA ────────────────────────────────────────────────────

export async function getMFAStatus(token: string): Promise<{ mfa_enabled: boolean; message: string }> {
  const res = await axios.get(`${API_V1}/users/me/mfa/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function enableMFA(token: string): Promise<{ secret: string; qr_uri: string; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/mfa/enable`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function verifyMFA(code: string, token: string): Promise<{ verified: boolean; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/mfa/verify`, { code }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function disableMFA(code: string, token: string): Promise<{ mfa_enabled: boolean; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/mfa/disable`, { code }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Alerts ─────────────────────────────────────────────────

export async function getAlerts(token: string): Promise<{ alerts: AlertInfo[]; total: number; unread: number }> {
  const res = await axios.get(`${API_V1}/users/me/alerts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function markAlertRead(alertId: string, token: string): Promise<void> {
  await axios.patch(`${API_V1}/users/me/alerts/${alertId}/read`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function dismissAlert(alertId: string, token: string): Promise<void> {
  await axios.delete(`${API_V1}/users/me/alerts/${alertId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ─── Incidents ──────────────────────────────────────────────

export async function reportIncident(data: { incident_type: string; description: string; related_transaction_id?: string }, token: string): Promise<{ incident_id: string; status: string; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/report-incident`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Phone Verification ────────────────────────────────────

export async function getPhoneStatus(token: string): Promise<{ phone: string | null; phone_verified: boolean; message: string }> {
  const res = await axios.get(`${API_V1}/users/me/phone/status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function updatePhone(phone: string, token: string): Promise<{ phone: string | null; phone_verified: boolean; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/phone/update`, { phone }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function verifyPhone(code: string, token: string): Promise<{ verified: boolean; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/phone/verify`, { code }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function resendPhoneCode(token: string): Promise<{ phone: string | null; phone_verified: boolean; message: string }> {
  const res = await axios.post(`${API_V1}/users/me/phone/resend-code`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Support ────────────────────────────────────────────────

export async function submitSupportTicket(ticket: SupportTicket, token: string): Promise<{ success: boolean }> {
  const res = await axios.post(`${API_BASE}/support/ticket`, ticket, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

// ─── Password Management ────────────────────────────────────

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await axios.post(`${API_BASE}/auth/password-reset/request`, { email });
  return res.data;
}

export async function confirmPasswordReset(token: string, new_password: string): Promise<{ message: string }> {
  const res = await axios.post(`${API_BASE}/auth/password-reset/confirm`, { token, new_password });
  return res.data;
}

export async function changePassword(authToken: string, current_password: string, new_password: string): Promise<{ message: string }> {
  const res = await axios.post(`${API_BASE}/auth/change-password`, { current_password, new_password }, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return res.data;
}
