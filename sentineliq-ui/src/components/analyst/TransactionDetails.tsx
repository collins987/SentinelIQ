import React from 'react'
import { Card, Badge, Button } from '@tremor/react'
import { Transaction, TransactionStatus, RiskLevel } from '@/types'

interface TransactionDetailsProps {
  transaction: Transaction | null
  onApprove: (notes?: string) => void
  onReject: (reason: string) => void
  onRequestVerification: () => void
  isLoading?: boolean
}

export const TransactionDetails: React.FC<TransactionDetailsProps> = ({
  transaction,
  onApprove,
  onReject,
  onRequestVerification,
  isLoading
}) => {
  const [notes, setNotes] = React.useState('')
  const [rejectReason, setRejectReason] = React.useState('')
  const [mode, setMode] = React.useState<'view' | 'approve' | 'reject'>('view')

  if (!transaction) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          Select a transaction to view details
        </div>
      </Card>
    )
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

  return (
    <Card>
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold">{transaction.merchantName}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Transaction ID: {transaction.id}
            </p>
          </div>
          <Badge>
            {transaction.riskLevel.toUpperCase()}
          </Badge>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Amount</p>
            <p className="text-2xl font-bold">
              ${transaction.amount.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Risk Score</p>
            <p className="text-2xl font-bold">{transaction.riskScore}%</p>
          </div>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">User ID:</span>
            <span className="font-medium">{transaction.userId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Time:</span>
            <span className="font-medium">{new Date(transaction.timestamp).toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Location:</span>
            <span className="font-medium">{transaction.location}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">IP Address:</span>
            <span className="font-medium">{transaction.ipAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Device ID:</span>
            <span className="font-medium">{transaction.deviceId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Category:</span>
            <span className="font-medium">{transaction.merchantCategory}</span>
          </div>
        </div>

        {/* Flagged Rules */}
        {transaction.flaggedRules.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-semibold mb-2">Flagged Rules:</p>
            <div className="flex flex-wrap gap-2">
              {transaction.flaggedRules.map((rule) => (
                <span
                  key={rule}
                  className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 px-3 py-1 rounded-full"
                >
                  {rule}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm">{transaction.description}</p>
        </div>
      </div>

      {/* Action Buttons */}
      {mode === 'view' && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode('approve')}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Approve
          </button>
          <button
            onClick={() => setMode('reject')}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            onClick={onRequestVerification}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
          >
            Step-Up Auth
          </button>
        </div>
      )}

      {/* Approve Mode */}
      {mode === 'approve' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Investigation Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Called customer, verified DOB. Safe."
              className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white text-sm"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onApprove(notes)}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Confirm Approval
            </button>
            <button
              onClick={() => {
                setMode('view')
                setNotes('')
              }}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Reject Mode */}
      {mode === 'reject' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-2">Rejection Reason:</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Likely credential stuffing attack. 47 users affected from same IP."
              className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white text-sm"
              rows={4}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onReject(rejectReason)}
              disabled={isLoading || !rejectReason}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Confirm Rejection
            </button>
            <button
              onClick={() => {
                setMode('view')
                setRejectReason('')
              }}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
