// ============================================================================
// Risk Events Page - Full Event Management & Investigation
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface RiskEvent {
  id: string;
  event_id: string;
  user_id: string;
  email: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  risk_score: number;
  event_type: string;
  triggered_rules: string[];
  recommended_action: string;
  device: {
    type: string;
    browser: string;
    os: string;
    is_known: boolean;
  };
  location: {
    country: string;
    city: string;
    ip: string;
    is_vpn: boolean;
    is_tor: boolean;
  };
  timestamp: string;
  resolved: boolean;
}

// Mock events data
const generateMockEvents = (): RiskEvent[] => [
  {
    id: 'evt-001',
    event_id: 'TXN-2026-001234',
    user_id: 'usr-123',
    email: 'john.doe@acme.com',
    risk_level: 'critical',
    risk_score: 95,
    event_type: 'login',
    triggered_rules: ['impossible_travel', 'new_device', 'vpn_detected'],
    recommended_action: 'block',
    device: { type: 'Desktop', browser: 'Chrome 120', os: 'Windows 11', is_known: false },
    location: { country: 'Russia', city: 'Moscow', ip: '185.220.101.42', is_vpn: true, is_tor: false },
    timestamp: new Date(Date.now() - 120000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-002',
    event_id: 'TXN-2026-001235',
    user_id: 'usr-456',
    email: 'jane.smith@corp.io',
    risk_level: 'high',
    risk_score: 78,
    event_type: 'transaction',
    triggered_rules: ['velocity_check', 'unusual_amount'],
    recommended_action: 'challenge',
    device: { type: 'Mobile', browser: 'Safari 17', os: 'iOS 17', is_known: true },
    location: { country: 'United States', city: 'New York', ip: '72.229.28.185', is_vpn: false, is_tor: false },
    timestamp: new Date(Date.now() - 300000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-003',
    event_id: 'TXN-2026-001236',
    user_id: 'usr-789',
    email: 'bob.wilson@bank.com',
    risk_level: 'medium',
    risk_score: 55,
    event_type: 'password_change',
    triggered_rules: ['new_device'],
    recommended_action: 'allow',
    device: { type: 'Desktop', browser: 'Firefox 121', os: 'macOS Sonoma', is_known: false },
    location: { country: 'Canada', city: 'Toronto', ip: '99.241.37.12', is_vpn: false, is_tor: false },
    timestamp: new Date(Date.now() - 480000).toISOString(),
    resolved: true,
  },
  {
    id: 'evt-004',
    event_id: 'TXN-2026-001237',
    user_id: 'usr-321',
    email: 'alice.brown@tech.co',
    risk_level: 'critical',
    risk_score: 92,
    event_type: 'api_call',
    triggered_rules: ['known_fraud_ip', 'rate_limit_exceeded'],
    recommended_action: 'block',
    device: { type: 'Server', browser: 'API Client', os: 'Linux', is_known: false },
    location: { country: 'China', city: 'Beijing', ip: '101.200.35.78', is_vpn: false, is_tor: true },
    timestamp: new Date(Date.now() - 720000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-005',
    event_id: 'TXN-2026-001238',
    user_id: 'usr-654',
    email: 'charlie.davis@fin.org',
    risk_level: 'high',
    risk_score: 71,
    event_type: 'transaction',
    triggered_rules: ['velocity_check', 'geo_anomaly'],
    recommended_action: 'challenge',
    device: { type: 'Mobile', browser: 'Chrome Mobile', os: 'Android 14', is_known: true },
    location: { country: 'United Kingdom', city: 'London', ip: '81.2.69.142', is_vpn: false, is_tor: false },
    timestamp: new Date(Date.now() - 900000).toISOString(),
    resolved: false,
  },
  {
    id: 'evt-006',
    event_id: 'TXN-2026-001239',
    user_id: 'usr-987',
    email: 'diana.miller@shop.net',
    risk_level: 'low',
    risk_score: 25,
    event_type: 'login',
    triggered_rules: [],
    recommended_action: 'allow',
    device: { type: 'Desktop', browser: 'Edge 120', os: 'Windows 11', is_known: true },
    location: { country: 'United States', city: 'Los Angeles', ip: '50.184.72.19', is_vpn: false, is_tor: false },
    timestamp: new Date(Date.now() - 1080000).toISOString(),
    resolved: true,
  },
];

const RISK_COLORS = {
  critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', fill: '#ef4444' },
  high: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', fill: '#f97316' },
  medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', fill: '#eab308' },
  low: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', fill: '#22c55e' },
};

export default function EventsPage() {
  const [events] = useState<RiskEvent[]>(generateMockEvents());
  const [selectedEvent, setSelectedEvent] = useState<RiskEvent | null>(null);
  const [filters, setFilters] = useState({
    riskLevel: 'all',
    eventType: 'all',
    resolved: 'all',
    search: '',
  });

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (filters.riskLevel !== 'all' && event.risk_level !== filters.riskLevel) return false;
      if (filters.eventType !== 'all' && event.event_type !== filters.eventType) return false;
      if (filters.resolved !== 'all') {
        if (filters.resolved === 'resolved' && !event.resolved) return false;
        if (filters.resolved === 'pending' && event.resolved) return false;
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          event.email.toLowerCase().includes(searchLower) ||
          event.event_id.toLowerCase().includes(searchLower) ||
          event.location.city.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [events, filters]);

  const stats = useMemo(() => ({
    total: events.length,
    critical: events.filter((e) => e.risk_level === 'critical').length,
    high: events.filter((e) => e.risk_level === 'high').length,
    pending: events.filter((e) => !e.resolved).length,
  }), [events]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Risk Events</h1>
          <p>Monitor and investigate security events in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-secondary">Export CSV</button>
          <button className="btn-primary">+ Create Rule</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="metric-card">
          <p className="text-sm text-gray-400 mb-1">Total Events</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="metric-card border-l-2 border-red-500">
          <p className="text-sm text-gray-400 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-400">{stats.critical}</p>
        </div>
        <div className="metric-card border-l-2 border-orange-500">
          <p className="text-sm text-gray-400 mb-1">High Risk</p>
          <p className="text-2xl font-bold text-orange-400">{stats.high}</p>
        </div>
        <div className="metric-card border-l-2 border-yellow-500">
          <p className="text-sm text-gray-400 mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search by email, event ID, location..."
              className="input-field"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select
            className="input-field w-40"
            value={filters.riskLevel}
            onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="input-field w-40"
            value={filters.eventType}
            onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
          >
            <option value="all">All Types</option>
            <option value="login">Login</option>
            <option value="transaction">Transaction</option>
            <option value="password_change">Password Change</option>
            <option value="api_call">API Call</option>
          </select>
          <select
            className="input-field w-40"
            value={filters.resolved}
            onChange={(e) => setFilters({ ...filters, resolved: e.target.value })}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Events List & Detail Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-2 glass-card">
          <div className="overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>User</th>
                  <th>Risk</th>
                  <th>Location</th>
                  <th>Time</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((event) => {
                  const riskStyle = RISK_COLORS[event.risk_level];
                  return (
                    <tr
                      key={event.id}
                      className={`cursor-pointer ${selectedEvent?.id === event.id ? 'bg-indigo-500/10' : ''}`}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <td>
                        <div>
                          <p className="font-mono text-indigo-400 text-sm">{event.event_id}</p>
                          <p className="text-xs text-gray-500 capitalize">{event.event_type}</p>
                        </div>
                      </td>
                      <td>
                        <p className="text-white">{event.email}</p>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className={`stat-badge ${riskStyle.bg} ${riskStyle.text} ring-1 ${riskStyle.border}`}>
                            {event.risk_level.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-400">{event.risk_score}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{event.location.country === 'United States' ? '🇺🇸' : event.location.country === 'Russia' ? '🇷🇺' : event.location.country === 'China' ? '🇨🇳' : event.location.country === 'United Kingdom' ? '🇬🇧' : event.location.country === 'Canada' ? '🇨🇦' : '🌍'}</span>
                          <span className="text-sm">{event.location.city}</span>
                          {event.location.is_vpn && <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">VPN</span>}
                          {event.location.is_tor && <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded">TOR</span>}
                        </div>
                      </td>
                      <td className="text-gray-400 text-sm">{formatTime(event.timestamp)}</td>
                      <td>
                        {event.resolved ? (
                          <span className="text-green-400 text-sm">✓ Resolved</span>
                        ) : (
                          <span className="text-yellow-400 text-sm">● Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="glass-card p-6">
          {selectedEvent ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Event Details</h3>
                <span className={`stat-badge ${RISK_COLORS[selectedEvent.risk_level].bg} ${RISK_COLORS[selectedEvent.risk_level].text}`}>
                  {selectedEvent.risk_level.toUpperCase()}
                </span>
              </div>

              {/* Risk Score Gauge */}
              <div className="text-center py-4">
                <div className="relative w-32 h-32 mx-auto">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" stroke="#374151" strokeWidth="8" fill="none" />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke={RISK_COLORS[selectedEvent.risk_level].fill}
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${selectedEvent.risk_score * 3.52} 352`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{selectedEvent.risk_score}</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400 mt-2">Risk Score</p>
              </div>

              {/* Event Info */}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Event ID</span>
                  <span className="font-mono text-indigo-400">{selectedEvent.event_id}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">User</span>
                  <span className="text-white">{selectedEvent.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Type</span>
                  <span className="text-white capitalize">{selectedEvent.event_type}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-800">
                  <span className="text-gray-400">Action</span>
                  <span className={`capitalize ${
                    selectedEvent.recommended_action === 'block' ? 'text-red-400' :
                    selectedEvent.recommended_action === 'challenge' ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {selectedEvent.recommended_action}
                  </span>
                </div>
              </div>

              {/* Triggered Rules */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Triggered Rules</p>
                <div className="flex flex-wrap gap-2">
                  {selectedEvent.triggered_rules.length > 0 ? (
                    selectedEvent.triggered_rules.map((rule) => (
                      <span key={rule} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-lg">
                        {rule.replace(/_/g, ' ')}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 text-sm">No rules triggered</span>
                  )}
                </div>
              </div>

              {/* Device Info */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Device</p>
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Type</span>
                    <span className="text-gray-300">{selectedEvent.device.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Browser</span>
                    <span className="text-gray-300">{selectedEvent.device.browser}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">OS</span>
                    <span className="text-gray-300">{selectedEvent.device.os}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Known Device</span>
                    <span className={selectedEvent.device.is_known ? 'text-green-400' : 'text-red-400'}>
                      {selectedEvent.device.is_known ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location Info */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Location</p>
                <div className="bg-gray-800/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Location</span>
                    <span className="text-gray-300">{selectedEvent.location.city}, {selectedEvent.location.country}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">IP Address</span>
                    <span className="font-mono text-gray-300">{selectedEvent.location.ip}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button className="btn-primary flex-1">Resolve</button>
                <button className="btn-secondary flex-1">Investigate</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Select an event to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
