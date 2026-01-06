// User Roles
export enum UserRole {
  END_USER = 'end_user',
  ANALYST = 'analyst',
  SOC_RESPONDER = 'soc_responder',
  COMPLIANCE = 'compliance',
  DATA_SCIENTIST = 'data_scientist',
  DEVELOPER = 'developer',
  ADMIN = 'admin'
}

// Transaction Status
export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEEDS_VERIFICATION = 'needs_verification'
}

// Risk Level
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// User Types
export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: string[]
  created_at: string
}

export interface UserSession {
  sessionId: string
  device: string
  location: string
  ipAddress: string
  lastActivity: string
  isActive: boolean
}

// Transaction Types
export interface Transaction {
  id: string
  userId: string
  amount: number
  currency: string
  timestamp: string
  status: TransactionStatus
  riskScore: number
  riskLevel: RiskLevel
  merchantName: string
  merchantCategory: string
  location: string
  ipAddress: string
  deviceId: string
  description: string
  flaggedRules: string[]
}

export interface TransactionDetail extends Transaction {
  deviceFingerprint: string
  userAgent: string
  previousTransactions: number
  velocityCheck: {
    transactionsInLast24h: number
    totalAmountInLast24h: number
  }
  geoVelocity: {
    lastLocation: string
    lastTimestamp: string
    distance: number
    timeToTravel: number
  }
  linkedUsers: string[]
  linkedDevices: string[]
  linkedIPs: string[]
}

// Graph/Network Types
export interface GraphNode {
  id: string
  type: 'user' | 'ip' | 'device'
  label: string
  riskScore?: number
  metadata?: Record<string, any>
  isSelected?: boolean
}

export interface GraphEdge {
  id: string
  source: string
  target: string
  weight: number
  connectionCount: number
  lastSeen: string
}

// Alert Types
export interface Alert {
  id: string
  type: 'fraud_alert' | 'velocity_alert' | 'geo_velocity_alert' | 'attack_alert'
  severity: RiskLevel
  message: string
  timestamp: string
  sourceTransaction?: string
  affectedUsers?: number
  details: Record<string, any>
}

export interface WebhookLog {
  id: string
  timestamp: string
  eventType: string
  payload: Record<string, any>
  statusCode: number
  deliveryAttempts: number
  lastError?: string
  retryable: boolean
}

// API Key Types
export interface APIKey {
  id: string
  name: string
  key: string
  lastUsed?: string
  createdAt: string
  expiresAt?: string
  isActive: boolean
  permissions: string[]
}

// Audit Log Types
export interface AuditLog {
  id: string
  timestamp: string
  userId: string
  action: string
  resource: string
  resourceId: string
  changes: Record<string, any>
  ipAddress: string
  status: 'success' | 'failure'
  hash: string
  chainVerified: boolean
}

// Rule Types
export interface FraudRule {
  id: string
  name: string
  description: string
  ruleYaml: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  creator: string
  blockRate?: number
  falsePositiveRate?: number
}

// Shadow Mode Types
export interface RuleComparison {
  liveRule: {
    blockRate: number
    falsePositiveRate: number
    totalBlocks: number
  }
  shadowRule: {
    blockRate: number
    falsePositiveRate: number
    totalBlocks: number
  }
  impact: {
    additionalBlocks: number
    additionalFalsePositives: number
    percentageIncrease: number
  }
}

// System Health Types
export interface SystemMetrics {
  riskEngineLatency: number
  errorRate: number
  activeBlockRate: number
  throughput: number
  queueDepth: number
  timestamp: string
}

// Compliance/Evidence Export
export interface EvidenceExport {
  period: {
    start: string
    end: string
  }
  accessLogs: AuditLog[]
  ruleChanges: Array<{
    timestamp: string
    rule: string
    change: string
    author: string
  }>
  securityIncidents: Alert[]
  summary: {
    totalAccess: number
    totalChanges: number
    totalIncidents: number
  }
}

// Store State Types
export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface IncidentState {
  incidents: Transaction[]
  selectedIncident: Transaction | null
  isLoading: boolean
  filters: {
    riskLevel?: RiskLevel
    status?: TransactionStatus
    dateRange?: [string, string]
  }
}

export interface NotificationState {
  notifications: Alert[]
  unreadCount: number
}
