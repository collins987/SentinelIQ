import React, { useEffect, useState } from 'react'
import { AuthLayout } from '../../layouts'
import { TriageQueue } from '../../components/analyst/TriageQueue'
import { TransactionDetails } from '../../components/analyst/TransactionDetails'
import { useIncidentStore } from '../../stores/incidentStore'
import { mockTransactions } from '../../mockData'
import { Card } from '@tremor/react'

export const AnalystTriagePage: React.FC = () => {
  const {
    incidents,
    selectedIncident,
    isLoading,
    setIncidents,
    setSelectedIncident,
    approveIncident,
    rejectIncident,
    requestVerification
  } = useIncidentStore()

  const [stats, setStats] = useState({
    pending: 0,
    highRisk: 0,
    criticalRisk: 0
  })

  useEffect(() => {
    // Load mock data
    setIncidents(mockTransactions)
  }, [])

  useEffect(() => {
    // Calculate stats
    setStats({
      pending: incidents.filter((t) => t.status === 'pending').length,
      highRisk: incidents.filter((t) => t.riskLevel === 'high').length,
      criticalRisk: incidents.filter((t) => t.riskLevel === 'critical').length
    })
  }, [incidents])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Fraud Analyst Workbench</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and triage flagged transactions in real-time
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Pending Review</p>
              <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">High Risk</p>
              <p className="text-3xl font-bold text-orange-600">{stats.highRisk}</p>
            </div>
          </Card>
          <Card>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Critical</p>
              <p className="text-3xl font-bold text-red-600">{stats.criticalRisk}</p>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-1">
            <TriageQueue
              transactions={incidents}
              selectedId={selectedIncident?.id}
              onSelect={setSelectedIncident}
              isLoading={isLoading}
            />
          </div>
          <div className="col-span-2">
            <TransactionDetails
              transaction={selectedIncident || null}
              onApprove={(notes) => {
                if (selectedIncident) {
                  approveIncident(selectedIncident.id, notes)
                  setSelectedIncident(null)
                }
              }}
              onReject={(reason) => {
                if (selectedIncident) {
                  rejectIncident(selectedIncident.id, reason)
                  setSelectedIncident(null)
                }
              }}
              onRequestVerification={() => {
                if (selectedIncident) {
                  requestVerification(selectedIncident.id)
                }
              }}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
