import React from 'react'
import { DashboardLayout } from '../../layouts'

export const AuditPage: React.FC = () => {
  return (
    <DashboardLayout title="Compliance & Audit">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Audit Logs</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          View compliance reports and audit trails.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <th className="text-left py-2 px-2">Action</th>
                <th className="text-left py-2 px-2">User</th>
                <th className="text-left py-2 px-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                <td className="py-2 px-2">System Check Passed</td>
                <td className="py-2 px-2">system</td>
                <td className="py-2 px-2">2026-01-03 18:00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
