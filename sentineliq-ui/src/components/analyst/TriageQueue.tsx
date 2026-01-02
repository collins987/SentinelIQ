import React, { useState } from 'react'
import { Card, Badge } from '@tremor/react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { RiskLevel, Transaction, TransactionStatus } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface TriageQueueProps {
  transactions: Transaction[]
  selectedId?: string
  onSelect: (transaction: Transaction) => void
  isLoading?: boolean
}

const getRiskColor = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.CRITICAL:
      return 'red'
    case RiskLevel.HIGH:
      return 'orange'
    case RiskLevel.MEDIUM:
      return 'yellow'
    case RiskLevel.LOW:
      return 'green'
  }
}

const getRiskBgColor = (level: RiskLevel) => {
  switch (level) {
    case RiskLevel.CRITICAL:
      return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
    case RiskLevel.HIGH:
      return 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800'
    case RiskLevel.MEDIUM:
      return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800'
    case RiskLevel.LOW:
      return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
  }
}

const calculateSLATime = (timestamp: string): { remaining: number; status: string } => {
  const created = new Date(timestamp)
  const now = new Date()
  const elapsed = Math.floor((now.getTime() - created.getTime()) / 1000 / 60)
  const remaining = Math.max(0, 300 - elapsed) // 5 hour SLA

  let status = 'sla-ok'
  if (remaining < 60) status = 'sla-critical'
  else if (remaining < 120) status = 'sla-warning'

  return { remaining, status }
}

export const TriageQueue: React.FC<TriageQueueProps> = ({
  transactions,
  selectedId,
  onSelect,
  isLoading
}) => {
  const [sortBy, setSortBy] = useState<'risk' | 'sla' | 'time'>('sla')

  const sortedTransactions = [...transactions].sort((a, b) => {
    switch (sortBy) {
      case 'risk':
        return b.riskScore - a.riskScore
      case 'sla':
        return (
          calculateSLATime(b.timestamp).remaining -
          calculateSLATime(a.timestamp).remaining
        )
      case 'time':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    }
  })

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading transactions...</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-3">Triage Queue ({transactions.length})</h3>
        <div className="flex gap-2 mb-4">
          {(['risk', 'sla', 'time'] as const).map((sort) => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-3 py-1 text-sm rounded ${
                sortBy === sort
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Sort by {sort}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {sortedTransactions.map((txn) => {
          const sla = calculateSLATime(txn.timestamp)
          const isSelected = selectedId === txn.id

          return (
            <button
              key={txn.id}
              onClick={() => onSelect(txn)}
              className={`w-full p-4 rounded-lg border-2 text-left transition ${
                isSelected
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950'
                  : `border-transparent ${getRiskBgColor(txn.riskLevel)} hover:shadow-md`
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {txn.merchantName}
                    </span>
                    <Badge>{txn.riskLevel.toUpperCase()}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    User {txn.userId} • ${txn.amount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-bold ${sla.status}`}>
                    {sla.remaining}m
                  </div>
                  <p className="text-xs text-gray-500">SLA</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <span>{txn.location} • {txn.ipAddress}</span>
                <span>{formatDistanceToNow(new Date(txn.timestamp), { addSuffix: true })}</span>
              </div>

              {txn.flaggedRules.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {txn.flaggedRules.slice(0, 3).map((rule) => (
                    <span
                      key={rule}
                      className="text-xs bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                    >
                      {rule}
                    </span>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </Card>
  )
}
