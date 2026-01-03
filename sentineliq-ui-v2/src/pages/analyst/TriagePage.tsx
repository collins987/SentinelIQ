import React from 'react'
import { DashboardLayout } from '../../layouts'

export const AnalystTriagePage: React.FC = () => {
  return (
    <DashboardLayout title="Triage Queue">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Transaction Triage Queue</h2>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 dark:border-slate-700 rounded">
            <p className="font-medium">Sample Transaction #1</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Risk Score: <span className="text-red-600 font-bold">85%</span>
            </p>
            <button className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
              Review
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
