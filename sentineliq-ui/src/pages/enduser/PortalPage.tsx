import React, { useState } from 'react'
import { PortalLayout } from '@/layouts'
import { Card, Badge } from '@tremor/react'
import { UserSession } from '@/types'
import { mockUserSessions } from '@/mockData'

export const EndUserPortalPage: React.FC = () => {
  const [sessions, setSessions] = useState<UserSession[]>(mockUserSessions)
  const [showPanicConfirm, setShowPanicConfirm] = useState(false)

  const handleRevokeSession = (sessionId: string) => {
    setSessions(sessions.filter((s) => s.sessionId !== sessionId))
  }

  const handlePanicMode = () => {
    console.log('PANIC MODE ACTIVATED')
    // This would call the backend API to:
    // 1. Revoke all tokens
    // 2. Freeze all transfers
    // 3. Log out all devices except current
    setShowPanicConfirm(false)
  }

  return (
    <PortalLayout>
      <div className="space-y-8">
        {/* Panic Button - Floating */}
        <div className="relative">
          <button
            onClick={() => setShowPanicConfirm(true)}
            className="fixed bottom-8 right-8 w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 shadow-2xl flex items-center justify-center panic-button-pulse z-50"
            title="Emergency: Lock your account and all devices"
          >
            <div className="text-white text-3xl">🛡️</div>
          </button>

          {showPanicConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="max-w-md">
                <h3 className="text-2xl font-bold text-red-600 mb-4">Are you sure?</h3>
                <p className="mb-4 text-gray-600 dark:text-gray-400">
                  Panic Mode will immediately:
                </p>
                <ul className="space-y-2 mb-6 text-sm list-disc list-inside">
                  <li>Revoke all active tokens</li>
                  <li>Freeze all transfers</li>
                  <li>Log out all devices except this one</li>
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={handlePanicMode}
                    className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
                  >
                    YES, LOCK MY ACCOUNT
                  </button>
                  <button
                    onClick={() => setShowPanicConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-white rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Security Center</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor your account security and manage trusted devices
          </p>
        </div>

        {/* Trust Score Widget */}
        <Card>
          <div className="text-center py-8">
            <div className="mb-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">Your Security Score</p>
              <div className="text-6xl font-bold text-green-600 mb-2">95</div>
              <p className="text-xl text-green-600">Excellent</p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center justify-center gap-2">
                <span>✓ 2FA Enabled</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span>✓ No Recent Alerts</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span>✓ All Devices Secure</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Active Sessions */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Active Sessions</h2>
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.sessionId}>
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-semibold">{session.device}</p>
                      {session.isActive ? (
                        <Badge text="Active Now" color="green" />
                      ) : (
                        <Badge text="Inactive" color="gray" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {session.location} • {session.ipAddress}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Last activity: {new Date(session.lastActivity).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokeSession(session.sessionId)}
                    className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Revoke
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <div>
          <h2 className="text-2xl font-bold mb-4">"Was This You?" Feed</h2>
          <Card>
            <div className="space-y-4">
              <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <p className="font-semibold">Password Changed</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">2 days ago from iPhone 13</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded">
                    ✓ Yes
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                    ✗ No
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-start pb-4 border-b border-gray-200 dark:border-slate-700">
                <div>
                  <p className="font-semibold">Large Transfer ($5,000)</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">5 days ago to PayPal from MacBook</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 rounded">
                    ✓ Yes
                  </button>
                  <button className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded">
                    ✗ No
                  </button>
                </div>
              </div>

              <div className="text-center text-sm text-gray-500">No more recent activities</div>
            </div>
          </Card>
        </div>
      </div>
    </PortalLayout>
  )
}
