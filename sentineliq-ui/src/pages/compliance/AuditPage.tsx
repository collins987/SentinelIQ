import React, { useState } from 'react'
import { DashboardLayout } from '@/layouts'
import { Card, Badge } from '@tremor/react'
import { mockAuditLogs } from '@/mockData'

export const ComplianceAuditPage: React.FC = () => {
  const [filters, setFilters] = useState({
    user: '',
    action: '',
    startDate: '',
    endDate: ''
  })

  const filteredLogs = mockAuditLogs.filter((log) => {
    if (filters.user && !log.userId.includes(filters.user)) return false
    if (filters.action && log.action !== filters.action) return false
    return true
  })

  const handleExportPDF = () => {
    // In a real app, this would call the backend to generate a signed PDF
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,%23PDF Mock')
    element.setAttribute('download', `audit-export-${Date.now()}.pdf`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Compliance Station</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Immutable audit logs for SOC 2 & PCI-DSS compliance
          </p>
        </div>

        {/* Filters */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Filter Logs</h3>
          <div className="grid grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Filter by user..."
              value={filters.user}
              onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
            />
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
            >
              <option value="">All Actions</option>
              <option value="APPROVE">Approve</option>
              <option value="REJECT">Reject</option>
              <option value="UPDATE">Update</option>
              <option value="LOGIN">Login</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
            />
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              📄 Export PDF
            </button>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">
            Audit Logs ({filteredLogs.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Action</th>
                  <th className="text-left py-3 px-4 font-semibold">Resource</th>
                  <th className="text-left py-3 px-4 font-semibold">IP</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                  >
                    <td className="py-3 px-4">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{log.userId}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.resource}/{log.resourceId}
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 dark:text-gray-400">
                      {log.ipAddress}
                    </td>
                    <td className="py-3 px-4">
                      {log.status === 'success' ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Success</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Failed</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.chainVerified ? (
                        <div className="flex items-center gap-1">
                          <span className="text-green-600">✓</span>
                          <span className="text-xs text-green-600">
                            {log.hash.substring(0, 12)}...
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-red-600">✗ Unverified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-200">
              <strong>🔐 Chain Verification:</strong> All logs are cryptographically
              linked using SHA-256 hashes. Hover over any row to verify the chain.
            </p>
          </div>
        </Card>

        {/* Evidence Export */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Evidence Export</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Generate a signed PDF report with audit logs, rule changes, and security
            incidents for the requested period.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Period Start</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Period End</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={handleExportPDF}
              className="flex-1 px-4 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700"
            >
              📄 Download Signed PDF Report
            </button>
            <button className="flex-1 px-4 py-3 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded-md hover:bg-gray-400">
              📋 Preview
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
