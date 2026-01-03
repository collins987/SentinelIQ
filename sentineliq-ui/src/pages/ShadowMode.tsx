// ============================================================================
// Shadow Mode Page - Rule Testing & Accuracy Metrics
// ============================================================================

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface ShadowResult {
  id: string;
  event_id: string;
  rule_id: string;
  rule_name: string;
  would_block: boolean;
  actual_fraud: boolean | null;
  risk_score: number;
  timestamp: string;
  user_email: string;
}

// Mock shadow mode accuracy data
const accuracyData = {
  precision: 0.87,
  recall: 0.92,
  f1_score: 0.89,
  true_positives: 245,
  false_positives: 38,
  true_negatives: 1842,
  false_negatives: 22,
};

const accuracyTrends = [
  { date: 'Mon', precision: 0.82, recall: 0.88, f1: 0.85 },
  { date: 'Tue', precision: 0.84, recall: 0.89, f1: 0.86 },
  { date: 'Wed', precision: 0.85, recall: 0.90, f1: 0.87 },
  { date: 'Thu', precision: 0.86, recall: 0.91, f1: 0.88 },
  { date: 'Fri', precision: 0.87, recall: 0.92, f1: 0.89 },
  { date: 'Sat', precision: 0.88, recall: 0.92, f1: 0.90 },
  { date: 'Sun', precision: 0.87, recall: 0.92, f1: 0.89 },
];

const rulePerformance = [
  { rule: 'velocity_check', tp: 85, fp: 12, fn: 5, precision: 0.88, recall: 0.94 },
  { rule: 'tor_exit_node', tp: 42, fp: 3, fn: 2, precision: 0.93, recall: 0.95 },
  { rule: 'impossible_travel', tp: 38, fp: 8, fn: 6, precision: 0.83, recall: 0.86 },
  { rule: 'high_risk_country', tp: 55, fp: 15, fn: 8, precision: 0.79, recall: 0.87 },
  { rule: 'device_fingerprint', tp: 25, fp: 0, fn: 1, precision: 1.0, recall: 0.96 },
];

const pendingLabels: ShadowResult[] = [
  { id: '1', event_id: 'evt-001', rule_id: 'r1', rule_name: 'velocity_check', would_block: true, actual_fraud: null, risk_score: 82, timestamp: '2024-01-15T10:23:45Z', user_email: 'john@example.com' },
  { id: '2', event_id: 'evt-002', rule_id: 'r2', rule_name: 'tor_exit_node', would_block: true, actual_fraud: null, risk_score: 95, timestamp: '2024-01-15T10:25:12Z', user_email: 'jane@corp.io' },
  { id: '3', event_id: 'evt-003', rule_id: 'r3', rule_name: 'impossible_travel', would_block: true, actual_fraud: null, risk_score: 78, timestamp: '2024-01-15T10:28:33Z', user_email: 'bob@acme.com' },
  { id: '4', event_id: 'evt-004', rule_id: 'r1', rule_name: 'velocity_check', would_block: false, actual_fraud: null, risk_score: 45, timestamp: '2024-01-15T10:32:18Z', user_email: 'alice@tech.co' },
  { id: '5', event_id: 'evt-005', rule_id: 'r4', rule_name: 'high_risk_country', would_block: true, actual_fraud: null, risk_score: 88, timestamp: '2024-01-15T10:35:42Z', user_email: 'charlie@startup.io' },
];

function MetricGauge({ value, label, color }: { value: number; label: string; color: string }) {
  const percentage = value * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - value);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="#374151"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute mt-10 text-center">
        <p className="text-2xl font-bold text-white">{percentage.toFixed(0)}%</p>
      </div>
      <p className="text-sm text-gray-400 mt-2">{label}</p>
    </div>
  );
}

export default function ShadowModePage() {
  const [labelQueue, setLabelQueue] = useState(pendingLabels);
  const [activeView, setActiveView] = useState<'metrics' | 'labeling'>('metrics');

  const handleLabel = (id: string, isFraud: boolean) => {
    setLabelQueue((prev) => prev.filter((item) => item.id !== id));
    // In real app, would send to API
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="page-header mb-0">
          <h1>Shadow Mode</h1>
          <p>Test rules in production without blocking users</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveView('metrics')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeView === 'metrics' ? 'bg-indigo-600 text-white' : 'text-gray-400'
              }`}
            >
              Metrics
            </button>
            <button
              onClick={() => setActiveView('labeling')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                activeView === 'labeling' ? 'bg-indigo-600 text-white' : 'text-gray-400'
              }`}
            >
              Labeling ({labelQueue.length})
            </button>
          </div>
          <button className="btn-primary">Export Report</button>
        </div>
      </div>

      {/* Metrics View */}
      {activeView === 'metrics' && (
        <div className="space-y-6">
          {/* Summary Gauges */}
          <div className="grid grid-cols-3 gap-6">
            <div className="glass-card p-6 flex flex-col items-center">
              <div className="relative">
                <MetricGauge value={accuracyData.precision} label="Precision" color="#6366f1" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {accuracyData.true_positives} TP / {accuracyData.true_positives + accuracyData.false_positives} Predicted
              </p>
            </div>
            <div className="glass-card p-6 flex flex-col items-center">
              <div className="relative">
                <MetricGauge value={accuracyData.recall} label="Recall" color="#8b5cf6" />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {accuracyData.true_positives} TP / {accuracyData.true_positives + accuracyData.false_negatives} Actual
              </p>
            </div>
            <div className="glass-card p-6 flex flex-col items-center">
              <div className="relative">
                <MetricGauge value={accuracyData.f1_score} label="F1 Score" color="#14b8a6" />
              </div>
              <p className="text-xs text-gray-500 mt-2">Harmonic mean of P & R</p>
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="grid grid-cols-2 gap-6">
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Confusion Matrix</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{accuracyData.true_positives}</p>
                  <p className="text-sm text-gray-400 mt-1">True Positives</p>
                  <p className="text-xs text-gray-500">Correctly blocked fraud</p>
                </div>
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{accuracyData.false_positives}</p>
                  <p className="text-sm text-gray-400 mt-1">False Positives</p>
                  <p className="text-xs text-gray-500">Incorrectly blocked</p>
                </div>
                <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-red-400">{accuracyData.false_negatives}</p>
                  <p className="text-sm text-gray-400 mt-1">False Negatives</p>
                  <p className="text-xs text-gray-500">Missed fraud</p>
                </div>
                <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-400">{accuracyData.true_negatives}</p>
                  <p className="text-sm text-gray-400 mt-1">True Negatives</p>
                  <p className="text-xs text-gray-500">Correctly allowed</p>
                </div>
              </div>
            </div>

            {/* Accuracy Trend */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Accuracy Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={accuracyTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" />
                  <YAxis domain={[0.7, 1]} stroke="#9ca3af" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                    formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="precision" stroke="#6366f1" strokeWidth={2} />
                  <Line type="monotone" dataKey="recall" stroke="#8b5cf6" strokeWidth={2} />
                  <Line type="monotone" dataKey="f1" stroke="#14b8a6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rule Performance */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Rule Performance Breakdown</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={rulePerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis dataKey="rule" type="category" stroke="#9ca3af" width={150} />
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="tp" fill="#22c55e" name="True Positives" />
                <Bar dataKey="fp" fill="#ef4444" name="False Positives" />
                <Bar dataKey="fn" fill="#f97316" name="False Negatives" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Labeling View */}
      {activeView === 'labeling' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Pending Labels</h3>
                <p className="text-sm text-gray-400">Review shadow mode results and label actual fraud status</p>
              </div>
              <span className="stat-badge-high">{labelQueue.length} pending</span>
            </div>

            {labelQueue.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">✅</p>
                <p className="text-xl text-white mb-2">All caught up!</p>
                <p className="text-gray-400">No pending labels to review</p>
              </div>
            ) : (
              <div className="space-y-4">
                {labelQueue.map((item) => (
                  <div
                    key={item.id}
                    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          item.would_block ? 'bg-red-900/50 text-red-400' : 'bg-green-900/50 text-green-400'
                        }`}>
                          {item.would_block ? '🚫' : '✓'}
                        </div>
                        <div>
                          <p className="text-white font-medium">{item.user_email}</p>
                          <p className="text-sm text-gray-400">
                            Rule: <span className="text-indigo-400">{item.rule_name}</span>
                            {' · '}
                            Event: {item.event_id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Risk Score</p>
                          <p className={`text-lg font-bold ${
                            item.risk_score >= 80 ? 'text-red-400' :
                            item.risk_score >= 60 ? 'text-orange-400' :
                            item.risk_score >= 40 ? 'text-yellow-400' : 'text-green-400'
                          }`}>
                            {item.risk_score}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">Would Block?</p>
                          <p className={`font-semibold ${item.would_block ? 'text-red-400' : 'text-green-400'}`}>
                            {item.would_block ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLabel(item.id, true)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Fraud
                          </button>
                          <button
                            onClick={() => handleLabel(item.id, false)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Legitimate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="glass-card p-6 bg-indigo-900/20 border-indigo-700/50">
            <h4 className="text-white font-medium mb-2">💡 Labeling Tips</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Review the user's recent activity before labeling</li>
              <li>• Consider the risk score and triggered rule when making decisions</li>
              <li>• When in doubt, skip and come back later with more context</li>
              <li>• Labels directly impact model accuracy metrics and future training</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
