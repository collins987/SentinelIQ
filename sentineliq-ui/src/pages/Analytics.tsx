// ============================================================================
// Advanced Analytics Page - Time-series, Cohorts, and Velocity Trends
// ============================================================================

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Mock time-series data
const timeSeriesData = [
  { time: '00:00', events: 120, critical: 8, high: 25, medium: 42, low: 45 },
  { time: '02:00', events: 85, critical: 5, high: 18, medium: 32, low: 30 },
  { time: '04:00', events: 45, critical: 2, high: 8, medium: 15, low: 20 },
  { time: '06:00', events: 78, critical: 4, high: 15, medium: 28, low: 31 },
  { time: '08:00', events: 245, critical: 18, high: 52, medium: 85, low: 90 },
  { time: '10:00', events: 320, critical: 25, high: 68, medium: 112, low: 115 },
  { time: '12:00', events: 385, critical: 32, high: 82, medium: 138, low: 133 },
  { time: '14:00', events: 410, critical: 35, high: 88, medium: 145, low: 142 },
  { time: '16:00', events: 365, critical: 28, high: 75, medium: 128, low: 134 },
  { time: '18:00', events: 298, critical: 22, high: 62, medium: 105, low: 109 },
  { time: '20:00', events: 225, critical: 15, high: 48, medium: 78, low: 84 },
  { time: '22:00', events: 165, critical: 10, high: 35, medium: 58, low: 62 },
];

const velocityTrends = [
  { period: 'Week 1', logins: 4.2, transactions: 2.8, api_calls: 12.5 },
  { period: 'Week 2', logins: 4.5, transactions: 3.1, api_calls: 14.2 },
  { period: 'Week 3', logins: 5.1, transactions: 3.8, api_calls: 18.5 },
  { period: 'Week 4', logins: 4.8, transactions: 3.5, api_calls: 16.8 },
  { period: 'Week 5', logins: 5.5, transactions: 4.2, api_calls: 22.1 },
  { period: 'Week 6', logins: 6.2, transactions: 4.8, api_calls: 25.5 },
];

const cohortData = [
  { cohort: 'New Users (<30d)', total: 2450, risky: 285, blocked: 42, risk_rate: 11.6 },
  { cohort: 'Regular (30-90d)', total: 8920, risky: 445, blocked: 89, risk_rate: 5.0 },
  { cohort: 'Established (90-180d)', total: 12500, risky: 312, blocked: 58, risk_rate: 2.5 },
  { cohort: 'Loyal (180-365d)', total: 15800, risky: 158, blocked: 32, risk_rate: 1.0 },
  { cohort: 'Veterans (>365d)', total: 22400, risky: 112, blocked: 18, risk_rate: 0.5 },
];

const geoDistribution = [
  { country: 'United States', events: 12450, blocked: 245, rate: 2.0, flag: '🇺🇸' },
  { country: 'United Kingdom', events: 4820, blocked: 125, rate: 2.6, flag: '🇬🇧' },
  { country: 'Germany', events: 3650, blocked: 85, rate: 2.3, flag: '🇩🇪' },
  { country: 'Canada', events: 2890, blocked: 52, rate: 1.8, flag: '🇨🇦' },
  { country: 'Nigeria', events: 1250, blocked: 425, rate: 34.0, flag: '🇳🇬' },
  { country: 'Russia', events: 980, blocked: 385, rate: 39.3, flag: '🇷🇺' },
  { country: 'China', events: 850, blocked: 245, rate: 28.8, flag: '🇨🇳' },
  { country: 'Brazil', events: 2100, blocked: 95, rate: 4.5, flag: '🇧🇷' },
];

const eventTypeDistribution = [
  { name: 'Login', value: 45, color: '#6366f1' },
  { name: 'Transaction', value: 25, color: '#8b5cf6' },
  { name: 'Account Change', value: 15, color: '#ec4899' },
  { name: 'API Access', value: 10, color: '#14b8a6' },
  { name: 'Other', value: 5, color: '#64748b' },
];

const RISK_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
};

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Advanced Analytics</h1>
          <p>Deep insights into risk patterns and user behavior</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field w-40"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="btn-secondary">Export Report</button>
          <button className="btn-primary">Refresh Data</button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-700 pb-3">
        {['overview', 'velocity', 'cohorts', 'geography'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4">
            <div className="metric-card">
              <p className="text-sm text-gray-400 mb-1">Total Events</p>
              <p className="text-2xl font-bold text-white">2,741</p>
              <p className="text-xs text-green-400 mt-1">↑ 12.5% vs yesterday</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-gray-400 mb-1">Critical Events</p>
              <p className="text-2xl font-bold text-red-400">204</p>
              <p className="text-xs text-red-400 mt-1">↑ 8.2% vs yesterday</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-gray-400 mb-1">Block Rate</p>
              <p className="text-2xl font-bold text-white">3.2%</p>
              <p className="text-xs text-green-400 mt-1">↓ 0.5% vs yesterday</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-gray-400 mb-1">Avg Risk Score</p>
              <p className="text-2xl font-bold text-yellow-400">42</p>
              <p className="text-xs text-green-400 mt-1">↓ 3 pts vs yesterday</p>
            </div>
            <div className="metric-card">
              <p className="text-sm text-gray-400 mb-1">Unique Users</p>
              <p className="text-2xl font-bold text-indigo-400">1,428</p>
              <p className="text-xs text-green-400 mt-1">↑ 5.8% vs yesterday</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-2 gap-6">
            {/* Time Series Chart */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Events Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="critical" stackId="1" stroke={RISK_COLORS.critical} fill={RISK_COLORS.critical} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="high" stackId="1" stroke={RISK_COLORS.high} fill={RISK_COLORS.high} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="medium" stackId="1" stroke={RISK_COLORS.medium} fill={RISK_COLORS.medium} fillOpacity={0.6} />
                  <Area type="monotone" dataKey="low" stackId="1" stroke={RISK_COLORS.low} fill={RISK_COLORS.low} fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Event Type Distribution */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Event Type Distribution</h3>
              <div className="flex items-center gap-8">
                <ResponsiveContainer width="50%" height={250}>
                  <PieChart>
                    <Pie
                      data={eventTypeDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {eventTypeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {eventTypeDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-gray-300">{item.name}</span>
                      <span className="text-white font-semibold ml-auto">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Velocity Tab */}
      {activeTab === 'velocity' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Velocity Trends (Avg per User/Day)</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={velocityTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="period" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="logins" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1' }} />
                <Line type="monotone" dataKey="transactions" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6' }} />
                <Line type="monotone" dataKey="api_calls" stroke="#14b8a6" strokeWidth={3} dot={{ fill: '#14b8a6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="metric-card text-center">
              <p className="text-3xl mb-2">📈</p>
              <p className="text-xl font-bold text-white">+47.6%</p>
              <p className="text-sm text-gray-400">Login Velocity Growth</p>
            </div>
            <div className="metric-card text-center">
              <p className="text-3xl mb-2">💳</p>
              <p className="text-xl font-bold text-white">+71.4%</p>
              <p className="text-sm text-gray-400">Transaction Velocity Growth</p>
            </div>
            <div className="metric-card text-center">
              <p className="text-3xl mb-2">🔌</p>
              <p className="text-xl font-bold text-white">+104%</p>
              <p className="text-sm text-gray-400">API Call Velocity Growth</p>
            </div>
          </div>
        </div>
      )}

      {/* Cohorts Tab */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">User Cohort Risk Analysis</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={cohortData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="cohort" type="category" stroke="#9ca3af" width={150} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="total" fill="#6366f1" name="Total Users" />
                <Bar dataKey="risky" fill="#f97316" name="Risky Users" />
                <Bar dataKey="blocked" fill="#ef4444" name="Blocked" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card overflow-hidden">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cohort</th>
                  <th>Total Users</th>
                  <th>Risky Users</th>
                  <th>Blocked</th>
                  <th>Risk Rate</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((cohort) => (
                  <tr key={cohort.cohort}>
                    <td className="font-medium">{cohort.cohort}</td>
                    <td>{cohort.total.toLocaleString()}</td>
                    <td className="text-orange-400">{cohort.risky}</td>
                    <td className="text-red-400">{cohort.blocked}</td>
                    <td>
                      <span className={`stat-badge ${
                        cohort.risk_rate > 10 ? 'stat-badge-critical' :
                        cohort.risk_rate > 5 ? 'stat-badge-high' :
                        cohort.risk_rate > 2 ? 'stat-badge-medium' : 'stat-badge-low'
                      }`}>
                        {cohort.risk_rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Geography Tab */}
      {activeTab === 'geography' && (
        <div className="space-y-6">
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">Geographic Distribution</h3>
              <p className="text-sm text-gray-400">Risk events by country of origin</p>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Total Events</th>
                  <th>Blocked</th>
                  <th>Block Rate</th>
                  <th>Risk Level</th>
                </tr>
              </thead>
              <tbody>
                {geoDistribution.map((geo) => (
                  <tr key={geo.country}>
                    <td>
                      <span className="flex items-center gap-2">
                        <span className="text-lg">{geo.flag}</span>
                        <span className="font-medium">{geo.country}</span>
                      </span>
                    </td>
                    <td>{geo.events.toLocaleString()}</td>
                    <td className="text-red-400">{geo.blocked}</td>
                    <td>{geo.rate.toFixed(1)}%</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(geo.rate * 2, 100)}%`,
                              backgroundColor:
                                geo.rate > 30 ? '#ef4444' :
                                geo.rate > 15 ? '#f97316' :
                                geo.rate > 5 ? '#eab308' : '#22c55e'
                            }}
                          />
                        </div>
                        <span className={`stat-badge ${
                          geo.rate > 30 ? 'stat-badge-critical' :
                          geo.rate > 15 ? 'stat-badge-high' :
                          geo.rate > 5 ? 'stat-badge-medium' : 'stat-badge-low'
                        }`}>
                          {geo.rate > 30 ? 'Critical' :
                           geo.rate > 15 ? 'High' :
                           geo.rate > 5 ? 'Medium' : 'Low'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
