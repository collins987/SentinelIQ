/**
 * User Dashboard Types
 * TypeScript interfaces matching the backend response structures
 */

// ============================================================================
// User Profile Types
// ============================================================================

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ============================================================================
// Risk Score Types
// ============================================================================

export interface RiskScore {
  id: string;
  score: number;
  type: string;
  suggestions: string[];
}

// ============================================================================
// Activity Types
// ============================================================================

export interface ActivityAction {
  action: string;
  target: string | null;
  timestamp: string | null;
}

export interface UserActivity {
  failed_logins_24h: number;
  recent_actions: ActivityAction[];
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionInfo {
  last_login_at: string | null;
  last_login_ip: string | null;
  last_device_info: string | null;
  active_sessions: number;
}

// ============================================================================
// Dashboard Response Types (from /user/dashboard)
// ============================================================================

export interface UserDashboardData {
  profile: UserProfile;
  risk_scores: RiskScore[];
  activity: UserActivity;
  session: SessionInfo;
}

// ============================================================================
// Support Ticket Types
// ============================================================================

export interface SupportTicketRequest {
  message: string;
  email: string;
}

export interface SupportTicketResponse {
  success: boolean;
}

// ============================================================================
// Auth Types
// ============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}
