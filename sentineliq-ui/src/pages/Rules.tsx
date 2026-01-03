// ============================================================================
// Rules Engine Page - Rule Management & Hot Reload
// ============================================================================

import React, { useState } from 'react';

interface FraudRule {
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

const mockRules: FraudRule[] = [
  {
    id: 'rule-1',
    name: 'High Velocity Login',
    description: 'Block users with more than 10 login attempts in 5 minutes',
    condition: 'login_attempts > 10 AND time_window < 5m',
    action: 'block',
    risk_weight: 30,
    enabled: true,
    version: 3,
    last_modified: '2024-01-14T18:30:00Z',
    triggers_today: 245,
  },
  {
    id: 'rule-2',
    name: 'TOR Exit Node Detection',
    description: 'Flag connections from known TOR exit nodes',
    condition: 'ip IN tor_exit_nodes',
    action: 'flag',
    risk_weight: 50,
    enabled: true,
    version: 1,
    last_modified: '2024-01-10T14:00:00Z',
    triggers_today: 89,
  },
  {
    id: 'rule-3',
    name: 'Impossible Travel',
    description: 'Block if user appears in two distant locations within impossible timeframe',
    condition: 'distance(prev_location, curr_location) / time_diff > 1000 km/h',
    action: 'block',
    risk_weight: 40,
    enabled: true,
    version: 2,
    last_modified: '2024-01-12T09:15:00Z',
    triggers_today: 32,
  },
  {
    id: 'rule-4',
    name: 'High-Risk Country',
    description: 'Add risk weight for connections from high-risk countries',
    condition: 'country IN high_risk_countries',
    action: 'flag',
    risk_weight: 25,
    enabled: true,
    version: 5,
    last_modified: '2024-01-13T16:45:00Z',
    triggers_today: 456,
  },
  {
    id: 'rule-5',
    name: 'Device Fingerprint Mismatch',
    description: 'Block if device fingerprint does not match user history',
    condition: 'device_fingerprint NOT IN user.known_devices',
    action: 'shadow',
    risk_weight: 20,
    enabled: false,
    version: 1,
    last_modified: '2024-01-08T11:00:00Z',
    triggers_today: 0,
  },
  {
    id: 'rule-6',
    name: 'Large Transaction Amount',
    description: 'Flag transactions above 10x user average',
    condition: 'amount > user.avg_transaction * 10',
    action: 'flag',
    risk_weight: 35,
    enabled: true,
    version: 2,
    last_modified: '2024-01-11T20:30:00Z',
    triggers_today: 78,
  },
];

export default function RulesPage() {
  const [rules, setRules] = useState(mockRules);
  const [selectedRule, setSelectedRule] = useState<FraudRule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleToggleRule = (ruleId: string) => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    );
  };

  const handleReloadRules = () => {
    // Simulate API call
    alert('Rules reloaded from configuration!');
  };

  const filteredRules = rules.filter(
    (rule) =>
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'block':
        return <span className="stat-badge-critical">Block</span>;
      case 'flag':
        return <span className="stat-badge-high">Flag</span>;
      case 'shadow':
        return <span className="stat-badge-medium">Shadow</span>;
      default:
        return <span className="stat-badge">{action}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Rules Engine</h1>
          <p>Manage fraud detection rules and risk weights</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReloadRules} className="btn-secondary">
            🔄 Hot Reload
          </button>
          <button className="btn-primary">+ New Rule</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Total Rules</p>
          <p className="text-2xl font-bold text-white">{rules.length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Active Rules</p>
          <p className="text-2xl font-bold text-green-400">{rules.filter((r) => r.enabled).length}</p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Total Triggers Today</p>
          <p className="text-2xl font-bold text-indigo-400">
            {rules.reduce((acc, r) => acc + r.triggers_today, 0).toLocaleString()}
          </p>
        </div>
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Shadow Mode Rules</p>
          <p className="text-2xl font-bold text-yellow-400">{rules.filter((r) => r.action === 'shadow').length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search rules..."
          className="input-field flex-1"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select className="input-field w-40">
          <option value="all">All Actions</option>
          <option value="block">Block</option>
          <option value="flag">Flag</option>
          <option value="shadow">Shadow</option>
        </select>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            onClick={() => setSelectedRule(rule)}
            className={`glass-card p-5 cursor-pointer transition-all hover:scale-[1.01] ${
              selectedRule?.id === rule.id ? 'ring-2 ring-indigo-500' : ''
            } ${!rule.enabled ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${rule.enabled ? 'bg-green-400' : 'bg-gray-500'}`}
                />
                <h3 className="text-white font-semibold">{rule.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                {getActionBadge(rule.action)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleRule(rule.id);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    rule.enabled ? 'bg-indigo-600' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                      rule.enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-400 mb-3">{rule.description}</p>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">
                  Weight: <span className="text-white">{rule.risk_weight}</span>
                </span>
                <span className="text-gray-500">
                  v{rule.version}
                </span>
              </div>
              <span className="text-indigo-400">{rule.triggers_today} triggers today</span>
            </div>
          </div>
        ))}
      </div>

      {/* Rule Detail Panel */}
      {selectedRule && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Rule Details</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsEditing(true)} className="btn-secondary">Edit</button>
              <button onClick={() => setSelectedRule(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Rule Name</p>
                <p className="text-white font-medium">{selectedRule.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Description</p>
                <p className="text-gray-300">{selectedRule.description}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Condition</p>
                <code className="block bg-gray-800 rounded-lg p-3 text-sm text-green-400 font-mono">
                  {selectedRule.condition}
                </code>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Action</p>
                  {getActionBadge(selectedRule.action)}
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Risk Weight</p>
                  <p className="text-white font-bold">{selectedRule.risk_weight}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Version</p>
                  <p className="text-white">v{selectedRule.version}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Last Modified</p>
                  <p className="text-white text-sm">{new Date(selectedRule.last_modified).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2">Performance (Today)</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Triggers</span>
                  <span className="text-xl font-bold text-indigo-400">{selectedRule.triggers_today}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-4 border-t border-gray-700">
            <button className="btn-secondary">View History</button>
            <button className="btn-secondary">Test Rule</button>
            <button className="btn-secondary text-red-400 hover:text-red-300">Delete Rule</button>
          </div>
        </div>
      )}
    </div>
  );
}
