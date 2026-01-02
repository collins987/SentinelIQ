import React, { useState } from 'react'
import { DashboardLayout } from '@/layouts'
import { Card, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from '@tremor/react'
import { mockFraudRules } from '@/mockData'

const compareData = [
  { time: '00:00', live: 50, shadow: 120 },
  { time: '04:00', live: 45, shadow: 145 },
  { time: '08:00', live: 55, shadow: 165 },
  { time: '12:00', live: 60, shadow: 200 },
  { time: '16:00', live: 65, shadow: 220 },
  { time: '20:00', live: 58, shadow: 180 },
  { time: '24:00', live: 50, shadow: 120 }
]

export const DataScientistLabPage: React.FC = () => {
  const [shadowRule, setShadowRule] = useState(
    `name: Enhanced Velocity Check
conditions:
  - transactions_in_24h > 8  # Lowered from 10
  - total_amount_in_24h > 40000  # Lowered from 50000
  - transaction_interval < 5min
actions:
  - risk_score: +30  # Increased from 25
  - notify: true
  - step_up_auth: true`
  )
  const [testResults, setTestResults] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'compare' | 'editor' | 'results'>('compare')

  const handleReplayRule = async () => {
    // Simulate rule replay
    setTestResults({
      totalTransactions: 1543,
      blockCount: 245,
      blockRate: 15.9,
      falsePositives: 8,
      falsePositiveRate: 0.52,
      comparison: {
        additionalBlocks: 195,
        additionalFalsePositives: 7,
        percentageIncrease: 1000
      }
    })
    setActiveTab('results')
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Data Scientist Lab</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test and compare fraud detection rules in shadow mode
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700">
          {(['compare', 'editor', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              }`}
            >
              {tab === 'compare' && '📊 Live vs Shadow'}
              {tab === 'editor' && '✏️ Rule Editor'}
              {tab === 'results' && '📈 Test Results'}
            </button>
          ))}
        </div>

        {/* Shadow vs Live Comparator */}
        {activeTab === 'compare' && (
          <Card>
            <h3 className="text-lg font-semibold mb-4">Rule Impact Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={compareData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="live"
                  stroke="#22c55e"
                  name="Live Rule - Blocks/day"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="shadow"
                  stroke="#3b82f6"
                  name="Shadow Rule - Blocks/day"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="font-semibold text-red-700 dark:text-red-200 mb-2">
                ⚠️ Warning: High False Positive Risk
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                Your shadow rule increases the block rate by <strong>1000%</strong>. This suggests very high false positive risk.
                Block rate would increase from 50/day to 500+/day, potentially blocking 10+ legitimate transactions.
              </p>
            </div>
          </Card>
        )}

        {/* Rule Editor */}
        {activeTab === 'editor' && (
          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold mb-4">Shadow Rule YAML Editor</h3>
              <textarea
                value={shadowRule}
                onChange={(e) => setShadowRule(e.target.value)}
                className="w-full h-64 p-4 font-mono text-sm border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-900 dark:text-white"
              />

              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleReplayRule}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                >
                  🔄 Replay Against Yesterday's Data
                </button>
                <button className="flex-1 px-4 py-3 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded-md hover:bg-gray-400">
                  📋 Validate Syntax
                </button>
              </div>
            </Card>

            <Card>
              <h4 className="font-semibold mb-3">Rule Syntax Help</h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <strong>Conditions:</strong> Use logical operators (>, <, =, AND, OR)
                </div>
                <div>
                  <strong>Actions:</strong> risk_score, notify, block_account, step_up_auth
                </div>
                <div>
                  <strong>Variables:</strong> transactions_in_24h, total_amount_in_24h, transaction_interval
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Test Results */}
        {activeTab === 'results' && testResults && (
          <div className="space-y-4">
            <Card>
              <h3 className="text-lg font-semibold mb-4">Replay Test Results</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Transactions Tested</p>
                  <p className="text-2xl font-bold">{testResults.totalTransactions}</p>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Blocks</p>
                  <p className="text-2xl font-bold text-red-600">{testResults.blockCount}</p>
                </div>
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Block Rate</p>
                  <p className="text-2xl font-bold text-yellow-600">{testResults.blockRate.toFixed(1)}%</p>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">False Positives</p>
                  <p className="text-2xl font-bold text-orange-600">{testResults.falsePositives}</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="font-semibold text-blue-700 dark:text-blue-200 mb-2">
                  Impact vs Current Rule
                </p>
                <div className="space-y-2 text-sm text-blue-600 dark:text-blue-300">
                  <div>
                    <strong>+{testResults.comparison.additionalBlocks}</strong> additional blocks per day
                  </div>
                  <div>
                    <strong>+{testResults.comparison.additionalFalsePositives}</strong> additional false positives
                  </div>
                  <div>
                    <strong>{testResults.comparison.percentageIncrease}%</strong> increase in block rate
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h4 className="font-semibold mb-3">Recommendation</h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                This rule is <strong>too aggressive</strong> for production. Consider:
              </p>
              <ul className="space-y-2 text-sm list-disc list-inside text-gray-600 dark:text-gray-400">
                <li>Raising thresholds to reduce false positives</li>
                <li>Using step_up_auth instead of immediate blocking</li>
                <li>Adding user reputation score as a condition</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
