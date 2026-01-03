import React from 'react'
import { AuthLayout } from '../layouts'

export const UnauthorizedPage: React.FC = () => (
  <AuthLayout>
    <div className="text-center">
      <h2 className="text-3xl font-bold text-red-600 mb-2">Access Denied</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        You don't have permission to access this page.
      </p>
      <a href="/login" className="text-blue-600 hover:underline text-sm font-medium">
        Back to Login
      </a>
    </div>
  </AuthLayout>
)
