/**
 * User Profile Card Component
 * Displays user profile information from the dashboard API
 */

import { UserCircleIcon } from '@heroicons/react/24/outline';
import type { UserProfile } from '../../types/user';

interface UserProfileCardProps {
  profile: UserProfile | undefined;
  isLoading?: boolean;
}

export default function UserProfileCard({ profile, isLoading }: UserProfileCardProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-700 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="card">
        <div className="text-center text-gray-400 py-4">
          Unable to load profile
        </div>
      </div>
    );
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'analyst':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'viewer':
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-gradient-to-br from-sentinel-500 to-sentinel-700 rounded-full flex items-center justify-center">
          <UserCircleIcon className="w-10 h-10 text-white" />
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-white">
            {profile.name}
          </h2>
          <p className="text-gray-400 text-sm">
            {profile.email}
          </p>
          <div className="mt-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeClass(profile.role)}`}>
              {profile.role.charAt(0).toUpperCase() + profile.role.slice(1)}
            </span>
          </div>
        </div>

        {/* User ID */}
        <div className="hidden sm:block text-right">
          <p className="text-xs text-gray-500">User ID</p>
          <p className="text-sm text-gray-400 font-mono truncate max-w-[120px]" title={profile.id}>
            {profile.id.length > 12 ? `${profile.id.slice(0, 12)}...` : profile.id}
          </p>
        </div>
      </div>
    </div>
  );
}
