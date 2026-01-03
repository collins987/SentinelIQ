// ============================================================================
// SentinelIQ Type Definitions - Complete Backend Integration
// ============================================================================

// ===== USER & AUTH =====
export type UserRole = 
  | 'admin' 
  | 'risk_analyst' 
  | 'soc_responder' 
  | 'compliance_officer' 
  | 'data_scientist' 
  | 'developer' 
  | 'end_user';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  org_id: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  last_login?: string;
  mfa_enabled: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// ===== RISK EVENTS & SCORING =====
export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type RecommendedAction = 'block' | 'challenge' | 'allow' | 'review';

export interface RiskEvent {
  id: string;
  event_id: string;
  event_type: string;
  user_id: string;
  email?: string;
  risk_score: number;
  risk_level: RiskLevel;
  recommended_action: RecommendedAction;
  confidence: number;
  hard_rules_triggered: string[];
  velocity_alerts: string[];
  behavioral_flags: string[];
  triggered_rules: string[];
  device_fingerprint?: DeviceFingerprint;
  location?: GeoLocation;
  timestamp: string;
  resolved?: boolean;
  resolved_by?: string;
  resolution_notes?: string;
}

export interface DeviceFingerprint {
  device_id: string;
  device_type: string;
  browser: string;
  os: string;
  screen_resolution: string;
  timezone: string;
  language: string;
  is_known: boolean;
  trust_score: number;
}

export interface GeoLocation {
  ip: string;
  country: string;
  city: string;
  latitude: number;
  longitude: number;
  isp: string;
  is_vpn: boolean;
  is_tor: boolean;
  is_proxy: boolean;
}

// ===== ANALYTICS DASHBOARD =====
export interface DashboardStats {
  total_events: number;
  events_by_risk_level: Record<RiskLevel, number>;
  events_by_action: Record<RecommendedAction, number>;
  total_users: number;
  active_users: number;
  blocked_users: number;
  avg_risk_score: number;
  detection_rate: number;
  false_positive_rate: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface RiskTimeline {
  granularity: 'hourly' | 'daily' | 'weekly';
  data: TimeSeriesDataPoint[];
  summary: {
    total: number;
    avg: number;
    max: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface VelocityTrend {
  counter_type: string;
  data: TimeSeriesDataPoint[];
  spikes: Array<{
    timestamp: string;
    value: number;
    threshold: number;
  }>;
  current_rate: number;
  avg_rate: number;
}

// ===== COHORT ANALYSIS =====
export type CohortType = 'low_risk' | 'medium_risk' | 'high_risk' | 'flagged';

export interface CohortAnalysis {
  cohort: CohortType;
  user_count: number;
  avg_risk_score: number;
  common_triggers: string[];
  behavior_patterns: {
    avg_login_frequency: number;
    avg_device_count: number;
    avg_location_changes: number;
  };
}

// ===== SHADOW MODE =====
export interface ShadowRule {
  rule_id: string;
  rule_name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface ShadowEvaluation {
  id: string;
  rule_id: string;
  event_id: string;
  user_id: string;
  would_have_blocked: boolean;
  confidence_score: number;
  actual_fraud?: boolean;
  labeled_by?: string;
  labeled_at?: string;
  timestamp: string;
}

export interface ShadowAccuracy {
  rule_id: string;
  precision: number;
  recall: number;
  f1_score: number;
  total_evaluations: number;
  labeled_count: number;
  confusion_matrix: {
    true_positives: number;
    true_negatives: number;
    false_positives: number;
    false_negatives: number;
  };
}

export interface AccuracyTrend {
  date: string;
  precision: number;
  recall: number;
  f1_score: number;
}

// ===== LINK ANALYSIS / FRAUD RINGS =====
export interface UserConnection {
  source_user_id: string;
  target_user_id: string;
  connection_type: 'shared_ip' | 'shared_device' | 'shared_email_domain' | 'shared_phone_prefix';
  strength: number;
  first_seen: string;
  last_seen: string;
}

export interface FraudRing {
  ring_id: string;
  hub_user_id: string;
  members: string[];
  total_connections: number;
  avg_risk_score: number;
  centrality_scores: Record<string, number>;
  detected_at: string;
  flagged: boolean;
  flagged_reason?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'device' | 'ip' | 'email_domain';
  risk_score?: number;
  is_flagged?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ===== ML MODELS =====
export interface MLModelStatus {
  model_name: string;
  version: string;
  status: 'active' | 'training' | 'inactive' | 'error';
  last_trained: string;
  accuracy: number;
  precision: number;
  recall: number;
  total_predictions: number;
}

export interface AnomalyDetectionResult {
  user_id: string;
  is_anomaly: boolean;
  anomaly_score: number;
  anomalous_features: string[];
  threshold: number;
  sensitivity: 'strict' | 'normal' | 'loose';
}

export interface RiskPrediction {
  user_id: string;
  risk_probability: number;
  risk_factors: Array<{
    factor: string;
    contribution: number;
  }>;
  prediction_confidence: number;
  recommended_actions: string[];
}

// ===== RULES MANAGEMENT =====
export interface FraudRule {
  id: string;
  name: string;
  description: string;
  type: 'hard' | 'velocity' | 'behavioral' | 'ml';
  is_active: boolean;
  is_shadow: boolean;
  conditions: Record<string, any>;
  score_contribution: number;
  action: RecommendedAction;
  created_at: string;
  updated_at: string;
  triggered_count: number;
}

export interface RuleVersion {
  version: string;
  timestamp: string;
  changes: string[];
  author: string;
}

export interface RuleStats {
  version: string;
  total_rules: number;
  rules_by_type: Record<string, number>;
  hard_gates: number;
  scoring_config: Record<string, any>;
  last_updated: string;
}

// ===== AUDIT LOGS =====
export interface AuditLog {
  id: string;
  event_type: string;
  actor_id: string;
  actor_email?: string;
  resource_type: string;
  resource_id: string;
  action: string;
  details: Record<string, any>;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  chain_hash: string;
  prev_hash: string;
}

// ===== INTEGRATIONS =====
export interface Webhook {
  id: string;
  url: string;
  description?: string;
  is_active: boolean;
  event_types: string[];
  min_risk_level?: RiskLevel;
  success_rate: number;
  total_deliveries: number;
  last_triggered_at?: string;
  secret_key?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_id: string;
  status: 'pending' | 'success' | 'failed';
  response_code?: number;
  response_time_ms?: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
}

export interface SlackIntegration {
  is_configured: boolean;
  channel: string;
  webhook_url: string;
  last_message_at?: string;
}

export interface PagerDutyIntegration {
  is_configured: boolean;
  service_id: string;
  last_incident_at?: string;
}

export interface IntegrationStatus {
  slack: SlackIntegration;
  pagerduty: PagerDutyIntegration;
  webhooks_count: number;
  webhooks_active: number;
}

// ===== ALERTS =====
export interface Alert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'info';
  title: string;
  message: string;
  source: string;
  event_id?: string;
  user_id?: string;
  is_acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

// ===== SEARCH =====
export interface SearchQuery {
  q?: string;
  risk_level?: RiskLevel[];
  recommended_action?: RecommendedAction[];
  user_id?: string;
  days?: number;
  page?: number;
  limit?: number;
}

export interface SearchResult<T> {
  total: number;
  page: number;
  limit: number;
  results: T[];
  facets?: Record<string, Record<string, number>>;
}

// ===== REAL-TIME UPDATES =====
export interface WebSocketMessage {
  type: 'risk_event' | 'alert' | 'stats_update' | 'rule_change';
  payload: any;
  timestamp: string;
}

// ===== API RESPONSES =====
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}
