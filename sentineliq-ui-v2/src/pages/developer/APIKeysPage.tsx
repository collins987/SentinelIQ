import React from 'react'
import { DashboardLayout } from '../../layouts'

export const APIKeysPage: React.FC = () => {
  return (
    <DashboardLayout title="API Management">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">API Keys & Credentials</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Manage your API keys and integrations here.
        </p>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Generate New Key
        </button>
      </div>
    </DashboardLayout>
  )
}
