import React from 'react'
import { DashboardLayout } from '../../layouts'

export const RulesPage: React.FC = () => {
  return (
    <DashboardLayout title="Fraud Rules Engine">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Fraud Detection Rules</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Configure and test machine learning rules.
        </p>
        <div className="space-y-2">
          <div className="p-3 border border-gray-200 dark:border-slate-700 rounded text-sm">
            Rule #1: High Transaction Velocity
          </div>
          <div className="p-3 border border-gray-200 dark:border-slate-700 rounded text-sm">
            Rule #2: Geographic Anomaly
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
