/**
 * User Dashboard Page
 * Main dashboard page for authenticated users (non-admin)
 * Displays profile, risk status, activity, and session information
 */

import { useState } from 'react';
import { useAppSelector } from '../store/hooks';
import { useGetUserDashboardQuery } from '../services/userApi';
import {
  UserProfileCard,
  UserRiskCard,
  UserActivityCard,
  UserSessionCard,
  SupportTicketModal,
} from '../components/user';
import {
  ArrowPathIcon,
  LifebuoyIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

export default function UserDashboard() {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  
  // Get auth state for user info
  const { user } = useAppSelector((state) => state.auth);
  
  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetUserDashboardQuery();

  // Handle refresh
  const handleRefresh = () => {
    refetch();
  };

  // Error display
  if (isError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-gray-400 mb-4">
            {(error as { data?: { detail?: string } })?.data?.detail ||
              'Unable to fetch dashboard data. Please try again.'}
          </p>
          <button onClick={handleRefresh} className="btn-primary">
            <ArrowPathIcon className="w-4 h-4 mr-2 inline" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheckIcon className="w-7 h-7 text-sentinel-400" />
            My Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Your security overview and account activity
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Support Button */}
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-sentinel-600 hover:bg-sentinel-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
          >
            <LifebuoyIcon className="w-4 h-4" />
            Get Support
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-sm text-gray-500">
        Last updated: {new Date().toLocaleTimeString()}
      </div>

      {/* Profile Card - Full Width */}
      <UserProfileCard
        profile={dashboardData?.profile}
        isLoading={isLoading}
      />

      {/* Two Column Layout for Risk and Session */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserRiskCard
          riskScores={dashboardData?.risk_scores}
          isLoading={isLoading}
        />
        <UserSessionCard
          session={dashboardData?.session}
          isLoading={isLoading}
        />
      </div>

      {/* Activity Card - Full Width */}
      <UserActivityCard
        activity={dashboardData?.activity}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setIsSupportModalOpen(true)}
            className="p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-sentinel-500/50 transition-colors text-left"
          >
            <LifebuoyIcon className="w-6 h-6 text-sentinel-400 mb-2" />
            <p className="text-sm font-medium text-white">Contact Support</p>
            <p className="text-xs text-gray-400">Get help with your account</p>
          </button>

          <button
            onClick={handleRefresh}
            className="p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700 hover:border-blue-500/50 transition-colors text-left"
          >
            <ArrowPathIcon className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-sm font-medium text-white">Refresh Data</p>
            <p className="text-xs text-gray-400">Update your dashboard</p>
          </button>

          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-left opacity-50 cursor-not-allowed">
            <ShieldCheckIcon className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-sm font-medium text-white">Security Settings</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>

          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 text-left opacity-50 cursor-not-allowed">
            <ShieldCheckIcon className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-sm font-medium text-white">Change Password</p>
            <p className="text-xs text-gray-400">Coming soon</p>
          </div>
        </div>
      </div>

      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        userEmail={user?.email || dashboardData?.profile?.email}
      />
    </div>
  );
}
