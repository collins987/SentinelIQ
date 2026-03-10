/**
 * User Session Card Component
 * Displays session information including last login, IP, device info
 */

import {
  ComputerDesktopIcon,
  GlobeAltIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { SessionInfo } from '../../types/user';

interface UserSessionCardProps {
  session: SessionInfo | undefined;
  isLoading?: boolean;
}

export default function UserSessionCard({ session, isLoading }: UserSessionCardProps) {
  if (isLoading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const parseDeviceInfo = (deviceInfo: unknown) => {
    if (!deviceInfo) return 'Unknown device';
    // If it's an object (e.g. from backend JSON), stringify or extract user_agent
    let info: string;
    if (typeof deviceInfo === 'object') {
      const obj = deviceInfo as Record<string, unknown>;
      info = (obj.user_agent || obj.device || obj.browser || JSON.stringify(deviceInfo)) as string;
    } else {
      info = String(deviceInfo);
    }
    if (!info) return 'Unknown device';
    // Simplify user agent string
    if (info.includes('Chrome')) return 'Chrome Browser';
    if (info.includes('Firefox')) return 'Firefox Browser';
    if (info.includes('Safari')) return 'Safari Browser';
    if (info.includes('Edge')) return 'Edge Browser';
    return info.length > 30 ? `${info.slice(0, 30)}...` : info;
  };

  const SessionItem = ({
    icon: Icon,
    label,
    value,
    subValue,
  }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    subValue?: string;
  }) => (
    <div className="p-3 rounded-lg bg-gray-800/50">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-sentinel-400" />
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-sm font-medium text-white truncate" title={String(value)}>
        {value}
      </p>
      {subValue && (
        <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>
      )}
    </div>
  );

  return (
    <div className="card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <ComputerDesktopIcon className="w-5 h-5 text-sentinel-400" />
          Session Information
        </h3>
      </div>

      {/* Session Details Grid */}
      <div className="grid grid-cols-2 gap-3">
        <SessionItem
          icon={ClockIcon}
          label="Last Login"
          value={formatDateTime(session?.last_login_at ?? null)}
        />
        <SessionItem
          icon={GlobeAltIcon}
          label="Last IP Address"
          value={session?.last_login_ip || 'Unknown'}
        />
        <SessionItem
          icon={ComputerDesktopIcon}
          label="Last Device"
          value={parseDeviceInfo(session?.last_device_info ?? null)}
        />
        <SessionItem
          icon={UserGroupIcon}
          label="Active Sessions"
          value={session?.active_sessions ?? 0}
          subValue="In last 24 hours"
        />
      </div>

      {/* Security Note */}
      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <p className="text-xs text-blue-400">
          <strong>Tip:</strong> If you notice any suspicious session activity, 
          please contact your administrator immediately.
        </p>
      </div>
    </div>
  );
}
