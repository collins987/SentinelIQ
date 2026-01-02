import React, { useState } from 'react'
import { DashboardLayout } from '@/layouts'
import { Card, Badge } from '@tremor/react'
import { mockAPIKeys, mockWebhooks } from '@/mockData'

const localMockWebhooks = [
  {
    id: 'wh_001',
    timestamp: '2025-01-02T10:30:00Z',
    eventType: 'fraud.alert',
    payload: { transactionId: 'txn_001', riskScore: 92 },
    statusCode: 200,
    deliveryAttempts: 1,
    lastError: null,
    retryable: false
  },
  {
    id: 'wh_002',
    timestamp: '2025-01-02T09:15:00Z',
    eventType: 'fraud.alert',
    payload: { transactionId: 'txn_003', riskScore: 88 },
    statusCode: 500,
    deliveryAttempts: 1,
    lastError: 'Connection timeout',
    retryable: true
  },
  {
    id: 'wh_003',
    timestamp: '2025-01-02T08:00:00Z',
    eventType: 'transaction.approved',
    payload: { transactionId: 'txn_004' },
    statusCode: 200,
    deliveryAttempts: 1,
    lastError: null,
    retryable: false
  }
]

export const DeveloperPortalPage: React.FC = () => {
  const [apiKeys, setApiKeys] = useState(mockAPIKeys)
  const [showNewKey, setShowNewKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const handleGenerateKey = () => {
    const newKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key: `sk_${Math.random().toString(36).substring(2, 15)}`,
      lastUsed: undefined,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60000).toISOString(),
      isActive: true,
      permissions: ['read:transactions', 'read:alerts']
    }
    setApiKeys([...apiKeys, newKey])
    setNewKeyName('')
    setShowNewKey(false)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Developer Portal</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage API keys and webhook integrations
          </p>
        </div>

        {/* API Keys Section */}
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <button
              onClick={() => setShowNewKey(!showNewKey)}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
            >
              + Generate New Key
            </button>
          </div>

          {showNewKey && (
            <div className="mb-4 p-4 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Key Name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Mobile App Sandbox"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateKey}
                  disabled={!newKeyName}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Generate
                </button>
                <button
                  onClick={() => setShowNewKey(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{key.name}</p>
                      {key.isActive ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Active</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Inactive</Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
                      {key.key}
                    </p>
                  </div>
                  <button className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded hover:bg-red-200">
                    Revoke
                  </button>
                </div>

                <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <div>
                    Created: {new Date(key.createdAt).toLocaleDateString()}
                  </div>
                  {key.lastUsed && (
                    <div>Last Used: {new Date(key.lastUsed).toLocaleString()}</div>
                  )}
                  {key.expiresAt && (
                    <div>Expires: {new Date(key.expiresAt).toLocaleDateString()}</div>
                  )}
                  <div>Permissions: {key.permissions.join(', ')}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Webhook Replay Console */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Webhook Replay Console</h3>

          <div className="space-y-3">
            {localMockWebhooks.map((webhook) => (
              <div
                key={webhook.id}
                className={`p-4 border rounded-lg ${
                  webhook.statusCode === 200
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950'
                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">{webhook.eventType}</p>
                      <Badge className={webhook.statusCode === 200 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}>
                        {webhook.statusCode === 200 ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {new Date(webhook.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono">{webhook.statusCode}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Attempts: {webhook.deliveryAttempts}
                    </p>
                  </div>
                </div>

                {webhook.lastError && (
                  <p className="text-sm text-red-600 dark:text-red-300 mb-2">
                    Error: {webhook.lastError}
                  </p>
                )}

                <div className="mb-3 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs font-mono text-gray-800 dark:text-gray-200 max-h-32 overflow-y-auto">
                  {JSON.stringify(webhook.payload, null, 2)}
                </div>

                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded hover:bg-gray-400">
                    View Raw
                  </button>
                  {webhook.retryable && webhook.statusCode !== 200 && (
                    <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                      🔄 Retry Delivery
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
