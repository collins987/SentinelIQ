// ============================================================================
// Audit Logs Page - Crypto-chained Audit Trail & Verification
// ============================================================================

import React, { useState } from 'react';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
  actor_role: string;
  resource_type: string;
  resource_id: string;
  details: Record<string, any>;
  previous_hash: string;
  current_hash: string;
  verified: boolean;
}

const mockAuditLogs: AuditLog[] = [
  {
    id: 'audit-001',
    timestamp: '2024-01-15T10:45:23Z',
    action: 'user.blocked',
    actor: 'admin@sentineliq.com',
    actor_role: 'admin',
    resource_type: 'user',
    resource_id: 'user-456',
    details: { reason: 'Suspected fraud activity', blocked_by: 'rule-2' },
    previous_hash: 'a3f4b2c1...',
    current_hash: 'b7e8d9f0...',
    verified: true,
  },
  {
    id: 'audit-002',
    timestamp: '2024-01-15T10:32:18Z',
    action: 'rule.modified',
    actor: 'risk.analyst@sentineliq.com',
    actor_role: 'risk_analyst',
    resource_type: 'rule',
    resource_id: 'rule-3',
    details: { field: 'risk_weight', old_value: 35, new_value: 40 },
    previous_hash: 'c8f7e6d5...',
    current_hash: 'a3f4b2c1...',
    verified: true,
  },
  {
    id: 'audit-003',
    timestamp: '2024-01-15T10:15:42Z',
    action: 'event.resolved',
    actor: 'soc.responder@sentineliq.com',
    actor_role: 'soc_responder',
    resource_type: 'event',
    resource_id: 'evt-789',
    details: { resolution: 'false_positive', notes: 'Verified with user' },
    previous_hash: 'd9e0f1g2...',
    current_hash: 'c8f7e6d5...',
    verified: true,
  },
  {
    id: 'audit-004',
    timestamp: '2024-01-15T09:58:31Z',
    action: 'integration.configured',
    actor: 'admin@sentineliq.com',
    actor_role: 'admin',
    resource_type: 'integration',
    resource_id: 'slack-001',
    details: { channel: '#security-alerts', enabled: true },
    previous_hash: 'e1f2g3h4...',
    current_hash: 'd9e0f1g2...',
    verified: true,
  },
  {
    id: 'audit-005',
    timestamp: '2024-01-15T09:45:12Z',
    action: 'model.retrained',
    actor: 'data.scientist@sentineliq.com',
    actor_role: 'data_scientist',
    resource_type: 'ml_model',
    resource_id: 'model-1',
    details: { version: 'v2.3.1', accuracy: 0.94 },
    previous_hash: 'f3g4h5i6...',
    current_hash: 'e1f2g3h4...',
    verified: true,
  },
  {
    id: 'audit-006',
    timestamp: '2024-01-15T09:30:05Z',
    action: 'login.success',
    actor: 'admin@sentineliq.com',
    actor_role: 'admin',
    resource_type: 'session',
    resource_id: 'session-123',
    details: { ip: '192.168.1.100', user_agent: 'Chrome/120.0' },
    previous_hash: 'g5h6i7j8...',
    current_hash: 'f3g4h5i6...',
    verified: true,
  },
];

const actionColors: Record<string, string> = {
  'user.blocked': 'bg-red-900/30 text-red-400',
  'user.unblocked': 'bg-green-900/30 text-green-400',
  'rule.modified': 'bg-yellow-900/30 text-yellow-400',
  'rule.created': 'bg-blue-900/30 text-blue-400',
  'event.resolved': 'bg-green-900/30 text-green-400',
  'integration.configured': 'bg-purple-900/30 text-purple-400',
  'model.retrained': 'bg-indigo-900/30 text-indigo-400',
  'login.success': 'bg-gray-700/30 text-gray-400',
};

const actionIcons: Record<string, string> = {
  'user.blocked': '🚫',
  'user.unblocked': '✅',
  'rule.modified': '📝',
  'rule.created': '➕',
  'event.resolved': '✓',
  'integration.configured': '🔗',
  'model.retrained': '🤖',
  'login.success': '🔐',
};

export default function AuditLogsPage() {
  const [logs] = useState(mockAuditLogs);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainStatus, setChainStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const handleVerifyChain = () => {
    setVerifyingChain(true);
    setTimeout(() => {
      setVerifyingChain(false);
      setChainStatus('valid');
    }, 2000);
  };

  const handleExport = () => {
    alert('Exporting audit logs...');
  };

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.resource_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterAction === 'all' || log.action.startsWith(filterAction);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Audit Logs</h1>
          <p>Crypto-chained audit trail with tamper detection</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            className="btn-secondary"
          >
            {verifyingChain ? '⏳ Verifying...' : '🔗 Verify Chain'}
          </button>
          <button onClick={handleExport} className="btn-primary">📥 Export</button>
        </div>
      </div>

      {/* Chain Status */}
      {chainStatus !== 'idle' && (
        <div
          className={`glass-card p-4 flex items-center gap-4 ${
            chainStatus === 'valid' ? 'bg-green-900/20 border-green-700/50' : 'bg-red-900/20 border-red-700/50'
          }`}
        >
          <span className="text-2xl">{chainStatus === 'valid' ? '✅' : '❌'}</span>
          <div>
            <p className={`font-semibold ${chainStatus === 'valid' ? 'text-green-400' : 'text-red-400'}`}>
              {chainStatus === 'valid' ? 'Chain Integrity Verified' : 'Chain Integrity Compromised'}
            </p>
            <p className="text-sm text-gray-400">
              {chainStatus === 'valid'
                ? 'All audit logs have been cryptographically verified and the chain is intact.'
                : 'Warning: Potential tampering detected. Please investigate immediately.'}
            </p>
          </div>
          <button
            onClick={() => setChainStatus('idle')}
            className="ml-auto text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Total Logs</p>
          <p className="text-2xl font-bold text-white">{logs.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Admin Actions</p>
          <p className="text-2xl font-bold text-indigo-400">
            {logs.filter((l) => l.actor_role === 'admin').length}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Critical Actions</p>
          <p className="text-2xl font-bold text-red-400">
            {logs.filter((l) => l.action.includes('blocked') || l.action.includes('deleted')).length}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Chain Status</p>
          <p className="text-2xl font-bold text-green-400">Verified</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search logs..."
          className="input-field flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="input-field w-48"
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
        >
          <option value="all">All Actions</option>
          <option value="user">User Actions</option>
          <option value="rule">Rule Changes</option>
          <option value="event">Event Actions</option>
          <option value="integration">Integrations</option>
          <option value="model">ML Models</option>
          <option value="login">Logins</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="glass-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Actor</th>
              <th>Resource</th>
              <th>Hash</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => (
              <tr
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="cursor-pointer"
              >
                <td className="font-mono text-sm">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${actionColors[log.action] || 'bg-gray-700'}`}>
                    {actionIcons[log.action] || '📋'} {log.action}
                  </span>
                </td>
                <td>
                  <div>
                    <p className="text-white text-sm">{log.actor}</p>
                    <p className="text-xs text-gray-500">{log.actor_role}</p>
                  </div>
                </td>
                <td>
                  <span className="text-gray-400 text-sm">
                    {log.resource_type}:<span className="text-white">{log.resource_id}</span>
                  </span>
                </td>
                <td className="font-mono text-xs text-gray-500">{log.current_hash}</td>
                <td>
                  {log.verified ? (
                    <span className="text-green-400">✓ Verified</span>
                  ) : (
                    <span className="text-red-400">⚠ Unverified</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in">
          <div className="glass-card p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Audit Log Details</h3>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-white text-xl">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Timestamp</p>
                  <p className="text-white font-mono">{new Date(selectedLog.timestamp).toLocaleString()}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">Action</p>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${actionColors[selectedLog.action] || 'bg-gray-700'}`}>
                    {actionIcons[selectedLog.action]} {selectedLog.action}
                  </span>
                </div>
              </div>

              {/* Actor Info */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Actor</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                    {selectedLog.actor.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white">{selectedLog.actor}</p>
                    <p className="text-xs text-gray-500 capitalize">{selectedLog.actor_role.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              {/* Resource Info */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Resource</p>
                <p className="text-white">
                  <span className="text-gray-400">{selectedLog.resource_type}:</span> {selectedLog.resource_id}
                </p>
              </div>

              {/* Details */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Details</p>
                <pre className="text-sm text-green-400 font-mono bg-gray-900 rounded p-3 overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>

              {/* Crypto Chain */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-3">Cryptographic Chain</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Previous Hash</span>
                    <code className="text-xs text-yellow-400 font-mono">{selectedLog.previous_hash}</code>
                  </div>
                  <div className="flex items-center justify-center">
                    <span className="text-gray-500">↓</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">Current Hash</span>
                    <code className="text-xs text-green-400 font-mono">{selectedLog.current_hash}</code>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              <div className={`rounded-lg p-4 ${selectedLog.verified ? 'bg-green-900/20 border border-green-700/50' : 'bg-red-900/20 border border-red-700/50'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedLog.verified ? '✅' : '❌'}</span>
                  <div>
                    <p className={`font-semibold ${selectedLog.verified ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedLog.verified ? 'Integrity Verified' : 'Verification Failed'}
                    </p>
                    <p className="text-sm text-gray-400">
                      {selectedLog.verified
                        ? 'This log entry has been cryptographically verified.'
                        : 'Warning: This log may have been tampered with.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
              <button className="btn-secondary">Copy Hash</button>
              <button className="btn-secondary">Export Log</button>
              <button onClick={() => setSelectedLog(null)} className="btn-primary ml-auto">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
