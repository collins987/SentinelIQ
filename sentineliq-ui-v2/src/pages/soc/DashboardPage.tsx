import React from 'react'
import { DashboardLayout } from '../../layouts'

export const SOCDashboardPage: React.FC = () => {
  return (
    <DashboardLayout title="Security Operations Center">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Real-Time Alert Dashboard</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-red-50 dark:bg-red-900 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-300">Critical Alerts</p>
            <p className="text-3xl font-bold text-red-600">12</p>
          </div>
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-300">High Priority</p>
            <p className="text-3xl font-bold text-yellow-600">28</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900 rounded">
            <p className="text-sm text-gray-600 dark:text-gray-300">System Health</p>
            <p className="text-3xl font-bold text-green-600">98%</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
