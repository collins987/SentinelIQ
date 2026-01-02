import { Transaction, Alert, UserSession, GraphNode, GraphEdge, RiskLevel, TransactionStatus, APIKey, AuditLog, FraudRule, SystemMetrics } from '@/types'

export const mockTransactions: Transaction[] = [
  {
    id: 'txn_001',
    userId: 'user_123',
    amount: 5000,
    currency: 'USD',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    status: TransactionStatus.PENDING,
    riskScore: 78,
    riskLevel: RiskLevel.HIGH,
    merchantName: 'Unknown Merchant LLC',
    merchantCategory: 'Electronics',
    location: 'Lagos, Nigeria',
    ipAddress: '192.168.1.1',
    deviceId: 'device_456',
    description: 'Suspicious transfer from new IP',
    flaggedRules: ['velocity_check', 'geo_velocity', 'new_merchant']
  },
  {
    id: 'txn_002',
    userId: 'user_456',
    amount: 150,
    currency: 'USD',
    timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
    status: TransactionStatus.PENDING,
    riskScore: 45,
    riskLevel: RiskLevel.MEDIUM,
    merchantName: 'Amazon.com',
    merchantCategory: 'Retail',
    location: 'New York, USA',
    ipAddress: '10.0.0.1',
    deviceId: 'device_789',
    description: 'Multiple transactions in short timeframe',
    flaggedRules: ['velocity_check']
  },
  {
    id: 'txn_003',
    userId: 'user_789',
    amount: 25000,
    currency: 'USD',
    timestamp: new Date(Date.now() - 48 * 60000).toISOString(),
    status: TransactionStatus.PENDING,
    riskScore: 92,
    riskLevel: RiskLevel.CRITICAL,
    merchantName: 'Wire Transfer - Unlicensed',
    merchantCategory: 'Money Transfer',
    location: 'Moscow, Russia',
    ipAddress: '172.16.0.1',
    deviceId: 'device_999',
    description: 'Potential credential stuffing attack',
    flaggedRules: ['credential_stuffing', 'velocity_check', 'geo_velocity', 'new_device']
  },
  {
    id: 'txn_004',
    userId: 'user_101',
    amount: 200,
    currency: 'USD',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    status: TransactionStatus.APPROVED,
    riskScore: 15,
    riskLevel: RiskLevel.LOW,
    merchantName: 'Starbucks Coffee',
    merchantCategory: 'Food & Beverage',
    location: 'San Francisco, USA',
    ipAddress: '203.0.113.1',
    deviceId: 'device_111',
    description: 'Normal transaction',
    flaggedRules: []
  },
  {
    id: 'txn_005',
    userId: 'user_202',
    amount: 8500,
    currency: 'USD',
    timestamp: new Date(Date.now() - 90 * 60000).toISOString(),
    status: TransactionStatus.REJECTED,
    riskScore: 88,
    riskLevel: RiskLevel.HIGH,
    merchantName: 'Crypto Exchange - Unregistered',
    merchantCategory: 'Cryptocurrency',
    location: 'Singapore',
    ipAddress: '198.51.100.1',
    deviceId: 'device_222',
    description: 'High-risk crypto transaction',
    flaggedRules: ['high_value_crypto', 'new_merchant', 'jurisdiction_risk']
  }
]

export const mockAlerts: Alert[] = [
  {
    id: 'alert_001',
    type: 'fraud_alert',
    severity: RiskLevel.CRITICAL,
    message: 'Credential stuffing attack detected from Moscow region',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    affectedUsers: 47,
    details: {
      failedAttempts: 1200,
      uniqueIPs: 8,
      timeWindow: '15 minutes'
    }
  },
  {
    id: 'alert_002',
    type: 'velocity_alert',
    severity: RiskLevel.HIGH,
    message: 'User 789 made 5 transactions in 2 minutes',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    sourceTransaction: 'txn_003',
    details: {
      transactionCount: 5,
      timeWindow: '2 minutes',
      totalAmount: 12000
    }
  },
  {
    id: 'alert_003',
    type: 'geo_velocity_alert',
    severity: RiskLevel.MEDIUM,
    message: 'Impossible travel detected for user 456',
    timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
    sourceTransaction: 'txn_002',
    details: {
      distance: 8000,
      timeToTravel: 45,
      lastLocation: 'London, UK',
      currentLocation: 'New York, USA'
    }
  }
]

export const mockUserSessions: UserSession[] = [
  {
    sessionId: 'sess_001',
    device: 'iPhone 13 Pro',
    location: 'Lagos, Nigeria',
    ipAddress: '192.168.1.100',
    lastActivity: new Date(Date.now() - 2 * 60000).toISOString(),
    isActive: true
  },
  {
    sessionId: 'sess_002',
    device: 'MacBook Pro M1',
    location: 'San Francisco, USA',
    ipAddress: '192.168.1.101',
    lastActivity: new Date(Date.now() - 30 * 60000).toISOString(),
    isActive: true
  },
  {
    sessionId: 'sess_003',
    device: 'Chrome Browser - Windows',
    location: 'Lagos, Nigeria',
    ipAddress: '192.168.1.102',
    lastActivity: new Date(Date.now() - 3 * 60000).toISOString(),
    isActive: true
  },
  {
    sessionId: 'sess_004',
    device: 'Samsung Galaxy S21',
    location: 'New York, USA',
    ipAddress: '192.168.1.103',
    lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
    isActive: false
  }
]

export const mockGraphNodes: GraphNode[] = [
  { id: 'user_789', type: 'user', label: 'User 789', riskScore: 92, metadata: { name: 'John Doe' } },
  { id: 'ip_172.16.0.1', type: 'ip', label: '172.16.0.1', riskScore: 88, metadata: { location: 'Moscow, Russia' } },
  { id: 'device_999', type: 'device', label: 'Device 999', riskScore: 85, metadata: { type: 'Mobile' } },
  { id: 'user_234', type: 'user', label: 'User 234', riskScore: 72, metadata: { name: 'Jane Smith' } },
  { id: 'user_345', type: 'user', label: 'User 345', riskScore: 68, metadata: { name: 'Bob Johnson' } },
  { id: 'ip_10.0.0.5', type: 'ip', label: '10.0.0.5', riskScore: 75, metadata: { location: 'Moscow, Russia' } },
  { id: 'device_888', type: 'device', label: 'Device 888', riskScore: 70, metadata: { type: 'Desktop' } },
  { id: 'user_456', type: 'user', label: 'User 456', riskScore: 45, metadata: { name: 'Alice Brown' } },
  { id: 'ip_203.0.113.1', type: 'ip', label: '203.0.113.1', riskScore: 20, metadata: { location: 'San Francisco, USA' } },
  { id: 'user_567', type: 'user', label: 'User 567', riskScore: 55, metadata: { name: 'Charlie Davis' } }
]

export const mockGraphEdges: GraphEdge[] = [
  { id: 'edge_1', source: 'user_789', target: 'ip_172.16.0.1', weight: 15, connectionCount: 23, lastSeen: new Date().toISOString() },
  { id: 'edge_2', source: 'user_789', target: 'device_999', weight: 20, connectionCount: 45, lastSeen: new Date().toISOString() },
  { id: 'edge_3', source: 'ip_172.16.0.1', target: 'user_234', weight: 12, connectionCount: 18, lastSeen: new Date().toISOString() },
  { id: 'edge_4', source: 'ip_172.16.0.1', target: 'user_345', weight: 10, connectionCount: 14, lastSeen: new Date().toISOString() },
  { id: 'edge_5', source: 'user_234', target: 'device_888', weight: 8, connectionCount: 12, lastSeen: new Date().toISOString() },
  { id: 'edge_6', source: 'ip_10.0.0.5', target: 'user_567', weight: 6, connectionCount: 8, lastSeen: new Date().toISOString() },
  { id: 'edge_7', source: 'user_456', target: 'ip_203.0.113.1', weight: 3, connectionCount: 4, lastSeen: new Date().toISOString() }
]

export const mockAPIKeys: APIKey[] = [
  {
    id: 'key_001',
    name: 'Production API Key',
    key: 'sk_live_xxxxxxxxxxxxx',
    lastUsed: new Date(Date.now() - 60000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60000).toISOString(),
    isActive: true,
    permissions: ['read:transactions', 'write:webhooks', 'read:alerts']
  },
  {
    id: 'key_002',
    name: 'Development API Key',
    key: 'sk_test_xxxxxxxxxxxxxxx',
    lastUsed: new Date(Date.now() - 5 * 60000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60000).toISOString(),
    isActive: true,
    permissions: ['read:transactions', 'read:alerts']
  },
  {
    id: 'key_003',
    name: 'Sandbox Testing',
    key: 'sk_sandbox_yyyyyyyyyyyy',
    lastUsed: undefined,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60000).toISOString(),
    isActive: false,
    permissions: ['read:transactions']
  }
]

export const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit_001',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
    userId: 'analyst_001',
    action: 'APPROVE',
    resource: 'transaction',
    resourceId: 'txn_001',
    changes: { status: 'pending -> approved' },
    ipAddress: '192.168.1.50',
    status: 'success',
    hash: 'sha256_xxxxx',
    chainVerified: true
  },
  {
    id: 'audit_002',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    userId: 'admin_001',
    action: 'UPDATE',
    resource: 'rule',
    resourceId: 'rule_velocity',
    changes: { threshold: '10 -> 15' },
    ipAddress: '192.168.1.51',
    status: 'success',
    hash: 'sha256_yyyyy',
    chainVerified: true
  },
  {
    id: 'audit_003',
    timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
    userId: 'user_789',
    action: 'LOGIN',
    resource: 'auth',
    resourceId: 'session_001',
    changes: {},
    ipAddress: '172.16.0.1',
    status: 'success',
    hash: 'sha256_zzzzz',
    chainVerified: true
  }
]

export const mockFraudRules: FraudRule[] = [
  {
    id: 'rule_velocity',
    name: 'Velocity Check',
    description: 'Flag transactions exceeding velocity thresholds',
    ruleYaml: `name: Velocity Check
conditions:
  - transactions_in_24h > 10
  - total_amount_in_24h > 50000
actions:
  - risk_score: +25
  - notify: true`,
    isActive: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60000).toISOString(),
    creator: 'admin_001',
    blockRate: 0.12,
    falsePositiveRate: 0.02
  },
  {
    id: 'rule_geo_velocity',
    name: 'Geo Velocity',
    description: 'Detect impossible travel patterns',
    ruleYaml: `name: Geo Velocity
conditions:
  - distance_traveled > 1000
  - time_to_travel < 120
actions:
  - risk_score: +50
  - step_up_auth: true`,
    isActive: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60000).toISOString(),
    creator: 'admin_001',
    blockRate: 0.08,
    falsePositiveRate: 0.01
  },
  {
    id: 'rule_credential_stuffing',
    name: 'Credential Stuffing Detection',
    description: 'Identify credential stuffing attacks',
    ruleYaml: `name: Credential Stuffing
conditions:
  - failed_login_attempts > 100
  - time_window: 15m
  - unique_ips >= 5
actions:
  - risk_score: +75
  - block_account: true
  - alert: critical`,
    isActive: true,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    creator: 'datascientist_001',
    blockRate: 0.95,
    falsePositiveRate: 0.001
  }
]

export const mockSystemMetrics: SystemMetrics = {
  riskEngineLatency: 145,
  errorRate: 0.02,
  activeBlockRate: 12,
  throughput: 5000,
  queueDepth: 23,
  timestamp: new Date().toISOString()
}

export const generateMockTransactionHistory = (count: number = 100): Transaction[] => {
  const merchants = ['Amazon', 'PayPal', 'Stripe', 'Square', 'Unknown Vendor', 'Crypto Exchange', 'Wire Transfer']
  const locations = ['New York, USA', 'Lagos, Nigeria', 'London, UK', 'Moscow, Russia', 'Singapore', 'Tokyo, Japan']
  const statuses = [TransactionStatus.APPROVED, TransactionStatus.PENDING, TransactionStatus.REJECTED]

  return Array.from({ length: count }, (_, i) => ({
    id: `txn_mock_${i}`,
    userId: `user_${Math.floor(Math.random() * 1000)}`,
    amount: Math.floor(Math.random() * 100000) + 100,
    currency: 'USD',
    timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60000).toISOString(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    riskScore: Math.floor(Math.random() * 100),
    riskLevel: [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL][
      Math.floor(Math.random() * 4)
    ],
    merchantName: merchants[Math.floor(Math.random() * merchants.length)],
    merchantCategory: ['Electronics', 'Retail', 'Food & Beverage', 'Cryptocurrency'][
      Math.floor(Math.random() * 4)
    ],
    location: locations[Math.floor(Math.random() * locations.length)],
    ipAddress: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
    deviceId: `device_${Math.floor(Math.random() * 10000)}`,
    description: 'Synthetic transaction for testing',
    flaggedRules: []
  }))
}
