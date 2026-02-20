import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface RiskScore {
  id: string;
  score: number;
  type: string;
  suggestions: string[];
}

export interface SupportTicket {
  message: string;
  email: string;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await axios.post(`${API_BASE}/auth/login`, { email, password });
  return res.data;
}

export async function getProfile(token: string): Promise<UserProfile> {
  const res = await axios.get(`${API_BASE}/user/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function getRiskScores(token: string): Promise<RiskScore[]> {
  const res = await axios.get(`${API_BASE}/analytics/risk-review`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}

export async function submitSupportTicket(ticket: SupportTicket, token: string): Promise<{ success: boolean }> {
  const res = await axios.post(`${API_BASE}/support/ticket`, ticket, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.data;
}
