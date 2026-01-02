import api from './api'
import { Transaction, TransactionDetail, Alert, WebhookLog, AuditLog, APIKey, FraudRule, RuleComparison, SystemMetrics, EvidenceExport } from '@/types'

// Transaction/Incident APIs
export const transactionAPI = {
  getAll: async (filters?: Record<string, any>) => {
    const response = await api.get('/transactions', { params: filters })
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/transactions/${id}`)
    return response.data
  },
  approve: async (id: string, notes?: string) => {
    const response = await api.post(`/transactions/${id}/approve`, { notes })
    return response.data
  },
  reject: async (id: string, reason: string) => {
    const response = await api.post(`/transactions/${id}/reject`, { reason })
    return response.data
  },
  requestVerification: async (id: string) => {
    const response = await api.post(`/transactions/${id}/step-up-auth`)
    return response.data
  }
}

// Alert APIs
export const alertAPI = {
  getAll: async (filters?: Record<string, any>) => {
    const response = await api.get('/alerts', { params: filters })
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/alerts/${id}`)
    return response.data
  },
  acknowledge: async (id: string) => {
    const response = await api.post(`/alerts/${id}/acknowledge`)
    return response.data
  }
}

// User Session APIs
export const sessionAPI = {
  getAllSessions: async (userId: string) => {
    const response = await api.get(`/users/${userId}/sessions`)
    return response.data
  },
  revokeSession: async (sessionId: string) => {
    const response = await api.post(`/sessions/${sessionId}/revoke`)
    return response.data
  },
  panicMode: async () => {
    const response = await api.post('/auth/panic-mode')
    return response.data
  }
}

// Graph/Link Analysis APIs
export const graphAPI = {
  getConnectedEntities: async (entityId: string, type: 'user' | 'ip' | 'device') => {
    const response = await api.get(`/graph/entities/${type}/${entityId}`)
    return response.data
  },
  getRiskNetwork: async (transactionId: string) => {
    const response = await api.get(`/graph/risk-network/${transactionId}`)
    return response.data
  },
  expandNode: async (nodeId: string, nodeType: string) => {
    const response = await api.get(`/graph/expand/${nodeType}/${nodeId}`)
    return response.data
  }
}

// Webhook APIs
export const webhookAPI = {
  getLogs: async (filters?: Record<string, any>) => {
    const response = await api.get('/webhooks/logs', { params: filters })
    return response.data
  },
  retryDelivery: async (logId: string) => {
    const response = await api.post(`/webhooks/logs/${logId}/retry`)
    return response.data
  },
  getRegistrations: async () => {
    const response = await api.get('/webhooks/registrations')
    return response.data
  }
}

// API Key Management APIs
export const apiKeyAPI = {
  listKeys: async () => {
    const response = await api.get('/api-keys')
    return response.data
  },
  generateKey: async (name: string, permissions?: string[]) => {
    const response = await api.post('/api-keys', { name, permissions })
    return response.data
  },
  revokeKey: async (keyId: string) => {
    const response = await api.delete(`/api-keys/${keyId}`)
    return response.data
  }
}

// Audit Log APIs
export const auditLogAPI = {
  getAll: async (filters?: Record<string, any>) => {
    const response = await api.get('/audit-logs', { params: filters })
    return response.data
  },
  verifyChain: async (logId: string) => {
    const response = await api.get(`/audit-logs/${logId}/verify`)
    return response.data
  },
  exportEvidence: async (filters?: Record<string, any>) => {
    const response = await api.get('/audit-logs/export/evidence', {
      params: filters,
      responseType: 'blob'
    })
    return response.data
  }
}

// Rule Management APIs
export const ruleAPI = {
  getAll: async () => {
    const response = await api.get('/rules')
    return response.data
  },
  getById: async (id: string) => {
    const response = await api.get(`/rules/${id}`)
    return response.data
  },
  create: async (rule: Partial<FraudRule>) => {
    const response = await api.post('/rules', rule)
    return response.data
  },
  update: async (id: string, rule: Partial<FraudRule>) => {
    const response = await api.put(`/rules/${id}`, rule)
    return response.data
  },
  testRule: async (ruleYaml: string) => {
    const response = await api.post('/rules/test', { ruleYaml })
    return response.data
  },
  compareRules: async (liveRuleId: string, shadowRuleId: string): Promise<RuleComparison> => {
    const response = await api.post('/rules/compare', {
      liveRuleId,
      shadowRuleId
    })
    return response.data
  },
  replayRule: async (ruleYaml: string, dateRange?: [string, string]) => {
    const response = await api.post('/rules/replay', { ruleYaml, dateRange })
    return response.data
  }
}

// System Metrics APIs
export const metricsAPI = {
  getSystemHealth: async (): Promise<SystemMetrics> => {
    const response = await api.get('/metrics/system-health')
    return response.data
  },
  getRealtimeStream: async () => {
    // Returns a WebSocket-ready URL
    const response = await api.get('/metrics/realtime-stream-url')
    return response.data.streamUrl
  }
}

// Analytics APIs
export const analyticsAPI = {
  getTransactionStats: async (period?: string) => {
    const response = await api.get('/analytics/transaction-stats', { params: { period } })
    return response.data
  },
  getRiskDistribution: async (period?: string) => {
    const response = await api.get('/analytics/risk-distribution', { params: { period } })
    return response.data
  },
  getAttackMap: async () => {
    const response = await api.get('/analytics/attack-map')
    return response.data
  }
}

export default {
  transaction: transactionAPI,
  alert: alertAPI,
  session: sessionAPI,
  graph: graphAPI,
  webhook: webhookAPI,
  apiKey: apiKeyAPI,
  auditLog: auditLogAPI,
  rule: ruleAPI,
  metrics: metricsAPI,
  analytics: analyticsAPI
}
