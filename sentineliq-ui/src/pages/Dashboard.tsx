// ============================================================================
// SentinelIQ Main Dashboard - Command Center View
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

// Mock data generators
const generateRiskTimeline = () => {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 3600000);
    data.push({
      time: hour.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      critical: Math.floor(Math.random() * 15) + 5,
      high: Math.floor(Math.random() * 30) + 10,
      medium: Math.floor(Math.random() * 50) + 20,
      low: Math.floor(Math.random() * 80) + 30,
    });
  }
  return data;
};

const generateRecentEvents = () => [
  { id: 'EVT-001', user: 'john.doe@acme.com', risk: 'critical', score: 95, rule: 'Impossible Travel', time: '2 min ago', action: 'block' },
  { id: 'EVT-002', user: 'jane.smith@corp.io', risk: 'high', score: 78, rule: 'Velocity Check', time: '5 min ago', action: 'challenge' },
  { id: 'EVT-003', user: 'bob.wilson@bank.com', risk: 'medium', score: 55, rule: 'New Device', time: '8 min ago', action: 'allow' },
  { id: 'EVT-004', user: 'alice.brown@tech.co', risk: 'critical', score: 92, rule: 'Known Fraud IP', time: '12 min ago', action: 'block' },
  { id: 'EVT-005', user: 'charlie.davis@fin.org', risk: 'high', score: 71, rule: 'Unusual Amount', time: '15 min ago', action: 'challenge' },
  { id: 'EVT-006', user: 'diana.miller@shop.net', risk: 'low', score: 25, rule: 'Standard', time: '18 min ago', action: 'allow' },
];

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

const PIE_DATA = [
  { name: 'Critical', value: 127, color: RISK_COLORS.critical },
  { name: 'High', value: 342, color: RISK_COLORS.high },
  { name: 'Medium', value: 891, color: RISK_COLORS.medium },
  { name: 'Low', value: 2340, color: RISK_COLORS.low },
];

export default function Dashboard() {
  const [timelineData, setTimelineData] = useState(generateRiskTimeline());
  const [recentEvents, setRecentEvents] = useState(generateRecentEvents());
  const [activeTab, setActiveTab] = useState('overview');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTimelineData(generateRiskTimeline());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: 'Total Events (24h)',
      value: '3,700',
      change: '+12.5%',
      changeType: 'increase',
      icon: '📊',
    },
    {
      label: 'Critical Alerts',
      value: '127',
      change: '+8.2%',
      changeType: 'increase',
      icon: '🚨',
    },
    {
      label: 'Blocked Actions',
      value: '89',
      change: '-3.1%',
      changeType: 'decrease',
      icon: '🛡️',
    },
    {
      label: 'Detection Rate',
      value: '98.7%',
      change: '+0.5%',
      changeType: 'increase',
      icon: '🎯',
    },
    {
      label: 'Avg Response Time',
      value: '1.2s',
      change: '-15%',
      changeType: 'decrease',
      icon: '⚡',
    },
    {
      label: 'Active Users',
      value: '12,847',
      change: '+2.3%',
      changeType: 'increase',
      icon: '👥',
    },
  ];

  const getRiskBadgeClass = (risk: string) => {
    switch (risk) {
      case 'critical': return 'stat-badge-critical';
      case 'high': return 'stat-badge-high';
      case 'medium': return 'stat-badge-medium';
      case 'low': return 'stat-badge-low';
      default: return 'stat-badge-low';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Security Command Center</h1>
          <p>Real-time risk monitoring and threat intelligence</p>
        </div>
        <div className="flex items-center gap-3">
          <select className="input-field py-2 px-4 w-40">
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
            <option>Last 30 days</option>
          </select>
          <button className="btn-primary">
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="metric-card">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                stat.changeType === 'increase' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Timeline Chart */}
        <div className="lg:col-span-2 chart-container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">Risk Events Timeline</h3>
              <p className="text-sm text-gray-400">Hourly breakdown by severity</p>
            </div>
            <div className="tabs">
              {['1H', '24H', '7D'].map((period) => (
                <button key={period} className={`tab ${period === '24H' ? 'active' : ''}`}>
                  {period}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="criticalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RISK_COLORS.critical} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={RISK_COLORS.critical} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RISK_COLORS.high} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={RISK_COLORS.high} stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="mediumGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RISK_COLORS.medium} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={RISK_COLORS.medium} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="critical" stackId="1" stroke={RISK_COLORS.critical} fill="url(#criticalGradient)" />
              <Area type="monotone" dataKey="high" stackId="1" stroke={RISK_COLORS.high} fill="url(#highGradient)" />
              <Area type="monotone" dataKey="medium" stackId="1" stroke={RISK_COLORS.medium} fill="url(#mediumGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="chart-container">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Risk Distribution</h3>
            <p className="text-sm text-gray-400">Events by severity level</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={PIE_DATA}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {PIE_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {PIE_DATA.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-400">{item.name}</span>
                <span className="text-sm font-medium text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Events Table */}
      <div className="glass-card">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Recent Risk Events</h3>
            <p className="text-sm text-gray-400">Real-time event stream</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="realtime-indicator">
              <span>Auto-refresh</span>
            </div>
            <button className="btn-ghost">View All →</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event ID</th>
                <th>User</th>
                <th>Risk Level</th>
                <th>Score</th>
                <th>Triggered Rule</th>
                <th>Action</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-800/50 cursor-pointer">
                  <td className="font-mono text-indigo-400">{event.id}</td>
                  <td>{event.user}</td>
                  <td>
                    <span className={getRiskBadgeClass(event.risk)}>
                      {event.risk.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full"
                          style={{ 
                            width: `${event.score}%`,
                            backgroundColor: RISK_COLORS[event.risk as keyof typeof RISK_COLORS]
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium">{event.score}</span>
                    </div>
                  </td>
                  <td className="text-gray-300">{event.rule}</td>
                  <td>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      event.action === 'block' 
                        ? 'bg-red-500/20 text-red-400' 
                        : event.action === 'challenge'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {event.action}
                    </span>
                  </td>
                  <td className="text-gray-500">{event.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Row - Quick Actions & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Review Critical Events', icon: '🚨', count: 12 },
              { label: 'Pending Shadow Labels', icon: '🏷️', count: 47 },
              { label: 'ML Model Alerts', icon: '🤖', count: 3 },
              { label: 'Integration Issues', icon: '🔌', count: 1 },
            ].map((action, index) => (
              <button
                key={index}
                className="flex items-center gap-3 p-4 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-colors text-left"
              >
                <span className="text-2xl">{action.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{action.label}</p>
                  <p className="text-xs text-gray-400">{action.count} pending</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { name: 'Risk Engine', status: 'healthy', latency: '12ms', uptime: '99.99%' },
              { name: 'ML Inference', status: 'healthy', latency: '45ms', uptime: '99.95%' },
              { name: 'Redis Stream', status: 'healthy', latency: '2ms', uptime: '100%' },
              { name: 'PostgreSQL', status: 'warning', latency: '89ms', uptime: '99.90%' },
            ].map((service, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-800/30 rounded-lg">
                <div className={`status-dot-${service.status === 'healthy' ? 'active' : 'warning'}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{service.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">{service.latency}</p>
                  <p className="text-xs text-gray-500">{service.uptime} uptime</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
