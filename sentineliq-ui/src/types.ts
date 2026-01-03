// ============================================================================
// Type Definitions for SentinelIQ
// ============================================================================

// User & Auth
export enum UserRole {
  ANALYST = 'analyst',
  END_USER = 'enduser',
  SOC_RESPONDER = 'soc_responder',
  DATA_SCIENTIST = 'data_scientist',
  DEVELOPER = 'developer',
  COMPLIANCE = 'compliance',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: UserRole;
  permissions: string[];
  created_at: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Risk Events & Analytics
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export interface RiskEvent {
  id: string;
  user_id: string;
  user_email: string;
  risk_score: number;
  risk_level: RiskLevel;
  event_type: string;
  triggered_rules: string[];
  device_info: {
    device_id: string;
    device_name: string;
    device_type: string;
    is_new: boolean;
  };
  location: {
    country: string;
    city: string;
    ip_address: string;
    is_vpn: boolean;
    is_tor: boolean;
  };
  timestamp: string;
  resolved: boolean;
  resolution_notes?: string;
}

export interface DashboardStats {
  total_events: number;
  critical_events: number;
  blocked_events: number;
  detection_rate: number;
  avg_response_time: number;
  active_users: number;
}

export interface RiskTimeline {
  timestamp: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface VelocityTrend {
  period: string;
  logins: number;
  transactions: number;
  api_calls: number;
}

export interface CohortAnalysis {
  cohort: string;
  total: number;
  risky: number;
  blocked: number;
  risk_rate: number;
}

// Shadow Mode
export interface ShadowAccuracy {
  precision: number;
  recall: number;
  f1_score: number;
  true_positives: number;
  false_positives: number;
  true_negatives: number;
  false_negatives: number;
}

export interface AccuracyTrend {
  date: string;
  precision: number;
  recall: number;
  f1: number;
}

export interface ShadowEvaluation {
  id: string;
  event_id: string;
  rule_id: string;
  would_block: boolean;
  actual_fraud: boolean | null;
  risk_score: number;
  timestamp: string;
}

// Link Analysis
export interface FraudRing {
  id: string;
  name: string;
  risk_score: number;
  user_count: number;
  connection_count: number;
  is_flagged: boolean;
  detected_at: string;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    risk_score: number;
    is_flagged: boolean;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
}

// ML Models
export interface MLModelStatus {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'training' | 'inactive';
  version: string;
  accuracy: number;
  last_trained: string;
  predictions_today: number;
}

export interface AnomalyDetectionResult {
  user_id: string;
  is_anomaly: boolean;
  confidence: number;
  anomaly_score: number;
  risk_factors: string[];
}

export interface RiskPrediction {
  user_id: string;
  risk_score: number;
  risk_level: RiskLevel;
  prediction_factors: string[];
  confidence: number;
}

// Rules
export interface FraudRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: 'block' | 'flag' | 'shadow';
  risk_weight: number;
  enabled: boolean;
  version: number;
  last_modified: string;
  triggers_today: number;
}

export interface RuleStats {
  total_rules: number;
  active_rules: number;
  total_triggers: number;
  shadow_rules: number;
}

export interface RuleVersion {
  version: number;
  created_at: string;
  modified_by: string;
  changes: string[];
}

// Audit Logs
export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actor_role: UserRole;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  previous_hash: string;
  current_hash: string;
  verified: boolean;
}

// Integrations & Webhooks
export interface Webhook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  created_at: string;
}

export interface IntegrationStatus {
  slack: boolean;
  pagerduty: boolean;
  webhooks: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: RiskLevel;
  created_at: string;
  resolved: boolean;
}

// Search
export interface SearchQuery {
  query: string;
  filters: Record<string, any>;
  limit: number;
  offset: number;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}
