// ============================================================================
// Enhanced Auth Store with Full User Management
// ============================================================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';
import api from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  hasPermission: (permission: string) => boolean;
  canAccessRoute: (route: string) => boolean;
}

// Role-based permissions
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.ANALYST]: [
    'view:dashboard', 'view:events', 'view:users', 'view:analytics',
    'action:label_shadow', 'action:resolve_events', 'view:link_analysis',
    'view:fraud_rings', 'view:cohorts'
  ],
  [UserRole.SOC_RESPONDER]: [
    'view:dashboard', 'view:events', 'view:alerts', 'view:link_analysis',
    'action:acknowledge_alerts', 'action:block_user', 'view:audit'
  ],
  [UserRole.COMPLIANCE]: [
    'view:dashboard', 'view:audit', 'view:reports', 'action:export_audit',
    'view:users', 'view:events'
  ],
  [UserRole.DATA_SCIENTIST]: [
    'view:dashboard', 'view:analytics', 'view:ml_models', 'view:shadow_mode',
    'action:train_models', 'view:cohorts', 'view:trends'
  ],
  [UserRole.DEVELOPER]: [
    'view:dashboard', 'view:api_docs', 'view:webhooks', 'view:integrations',
    'action:manage_webhooks', 'view:rules'
  ],
  [UserRole.END_USER]: [
    'view:own_activity', 'view:own_devices', 'action:report_issue'
  ],
};

// Demo users for each role
export const DEMO_USERS: Record<UserRole, User> = {
  [UserRole.ADMIN]: {
    id: 'admin-001', 
    email: 'admin@sentineliq.com', 
    username: 'admin_user',
    name: 'Admin User',
    role: UserRole.ADMIN, 
    permissions: ROLE_PERMISSIONS[UserRole.ADMIN],
    created_at: '2024-01-01T00:00:00Z',
  },
  [UserRole.ANALYST]: {
    id: 'analyst-001', 
    email: 'analyst@sentineliq.com', 
    username: 'risk_analyst',
    name: 'Risk Analyst',
    role: UserRole.ANALYST, 
    permissions: ROLE_PERMISSIONS[UserRole.ANALYST],
    created_at: '2024-01-15T00:00:00Z',
  },
  [UserRole.SOC_RESPONDER]: {
    id: 'soc-001', 
    email: 'soc@sentineliq.com', 
    username: 'soc_responder',
    name: 'SOC Responder',
    role: UserRole.SOC_RESPONDER, 
    permissions: ROLE_PERMISSIONS[UserRole.SOC_RESPONDER],
    created_at: '2024-02-01T00:00:00Z',
  },
  [UserRole.COMPLIANCE]: {
    id: 'compliance-001', 
    email: 'compliance@sentineliq.com', 
    username: 'compliance_officer',
    name: 'Compliance Officer',
    role: UserRole.COMPLIANCE, 
    permissions: ROLE_PERMISSIONS[UserRole.COMPLIANCE],
    created_at: '2024-02-15T00:00:00Z',
  },
  [UserRole.DATA_SCIENTIST]: {
    id: 'ds-001', 
    email: 'datascience@sentineliq.com', 
    username: 'data_scientist',
    name: 'Data Scientist',
    role: UserRole.DATA_SCIENTIST, 
    permissions: ROLE_PERMISSIONS[UserRole.DATA_SCIENTIST],
    created_at: '2024-03-01T00:00:00Z',
  },
  [UserRole.DEVELOPER]: {
    id: 'dev-001', 
    email: 'developer@sentineliq.com', 
    username: 'developer_user',
    name: 'Developer',
    role: UserRole.DEVELOPER, 
    permissions: ROLE_PERMISSIONS[UserRole.DEVELOPER],
    created_at: '2024-03-15T00:00:00Z',
  },
  [UserRole.END_USER]: {
    id: 'user-001', 
    email: 'user@example.com', 
    username: 'end_user',
    name: 'End User',
    role: UserRole.END_USER, 
    permissions: ROLE_PERMISSIONS[UserRole.END_USER],
    created_at: '2024-04-01T00:00:00Z',
  },
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.login(email, password);
          api.setToken(response.access_token);
          set({
            user: response.user,
            token: response.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      loginAsRole: (role: UserRole) => {
        const demoUser = DEMO_USERS[role];
        const demoToken = `demo-token-${role}-${Date.now()}`;
        api.setToken(demoToken);
        set({
          user: demoUser,
          token: demoToken,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),

      hasPermission: (permission: string) => {
        const { user } = get();
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[user.role] || [];
        return permissions.includes('*') || permissions.includes(permission);
      },

      canAccessRoute: (route: string) => {
        const { user } = get();
        if (!user) return false;
        return user.role === UserRole.ADMIN || true; // Simplified for demo
      },
    }),
    {
      name: 'sentineliq-auth',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
