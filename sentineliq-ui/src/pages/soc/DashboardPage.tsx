import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/layouts'
import { Card } from '@tremor/react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { mockSystemMetrics, mockAlerts } from '@/mockData'
import { SystemMetrics } from '@/types'

export const SOCDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>(mockSystemMetrics)
  const [realtimeData, setRealtimeData] = useState<SystemMetrics[]>([mockSystemMetrics])

  // Simulate real-time metrics updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        riskEngineLatency: prev.riskEngineLatency + (Math.random() - 0.5) * 50,
        errorRate: Math.max(0, prev.errorRate + (Math.random() - 0.6) * 0.01),
        activeBlockRate: prev.activeBlockRate + Math.floor((Math.random() - 0.5) * 8),
        timestamp: new Date().toISOString()
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  const getMetricColor = (metric: string, value: number) => {
    if (metric === 'errorRate') {
      if (value > 1) return 'text-red-600'
      if (value > 0.5) return 'text-yellow-600'
      return 'text-green-600'
    }
    if (metric === 'riskEngineLatency') {
      if (value > 500) return 'text-red-600'
      if (value > 300) return 'text-yellow-600'
      return 'text-green-600'
    }
    return 'text-blue-600'
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">SOC War Room</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time system health and attack monitoring
          </p>
        </div>

        {/* System Health Vitals - Grid */}
        <div className="grid grid-cols-4 gap-4">
          <Card
            className={`${
              metrics.riskEngineLatency > 300
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                : 'border-green-500 bg-green-50 dark:bg-green-950'
            }`}
          >
            <p className="text-gray-600 dark:text-gray-400 text-sm">Risk Engine Latency</p>
            <p className={`text-3xl font-bold ${getMetricColor('riskEngineLatency', metrics.riskEngineLatency)}`}>
              {Math.round(metrics.riskEngineLatency)}ms
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.riskEngineLatency > 300 ? '⚠️ Alert: High latency' : '✓ Normal'}
            </p>
          </Card>

          <Card
            className={`${
              metrics.errorRate > 1
                ? 'border-red-500 bg-red-50 dark:bg-red-950'
                : metrics.errorRate > 0.5
                ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                : 'border-green-500 bg-green-50 dark:bg-green-950'
            }`}
          >
            <p className="text-gray-600 dark:text-gray-400 text-sm">Error Rate</p>
            <p className={`text-3xl font-bold ${getMetricColor('errorRate', metrics.errorRate)}`}>
              {metrics.errorRate.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.errorRate > 1 ? '🚨 Alert: Critical!' : '✓ Normal'}
            </p>
          </Card>

          <Card>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active Block Rate</p>
            <p className="text-3xl font-bold text-orange-600">
              {metrics.activeBlockRate}/min
            </p>
            <p className="text-xs text-gray-500 mt-1">Transactions blocked per minute</p>
          </Card>

          <Card>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Queue Depth</p>
            <p className="text-3xl font-bold text-blue-600">{metrics.queueDepth}</p>
            <p className="text-xs text-gray-500 mt-1">Pending transactions</p>
          </Card>
        </div>

        {/* Live Attack Map Simulation */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Live Attack Map</h3>
          <div className="bg-gray-900 rounded-lg p-6 h-80 relative overflow-hidden">
            {/* Simulated map with attack indicators */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 to-red-900/20"></div>
            
            {/* Attack indicators */}
            <div className="absolute top-20 left-20 w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500"></div>
            <span className="absolute top-16 left-24 text-red-400 text-sm font-semibold">Moscow Region</span>
            <span className="absolute top-20 left-24 text-red-300 text-xs">1,200 failed logins</span>

            <div className="absolute top-40 left-1/2 w-3 h-3 bg-yellow-500 rounded-full shadow-lg shadow-yellow-500"></div>
            <span className="absolute top-36 left-1/2 text-yellow-400 text-sm font-semibold">Singapore</span>

            <div className="absolute bottom-20 right-20 w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="absolute bottom-16 right-20 text-green-400 text-sm">San Francisco</span>

            <p className="absolute bottom-4 left-4 text-gray-400 text-xs">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <h3 className="text-lg font-semibold mb-4">Recent Critical Alerts</h3>
          <div className="space-y-3">
            {mockAlerts.slice(0, 3).map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical'
                    ? 'border-l-red-500 bg-red-50 dark:bg-red-950'
                    : alert.severity === 'high'
                    ? 'border-l-orange-500 bg-orange-50 dark:bg-orange-950'
                    : 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold">{alert.message}</p>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {alert.affectedUsers && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Affecting {alert.affectedUsers} users
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
