import React from 'react'
import { DashboardLayout } from '../../layouts'

export const EndUserPortalPage: React.FC = () => {
  return (
    <DashboardLayout title="Security Portal">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Your Account Security</h2>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded">
            <p className="font-medium text-green-900 dark:text-green-100">
              ✓ Account Status: Secure
            </p>
            <p className="text-sm text-green-700 dark:text-green-300">
              No suspicious activity detected.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
