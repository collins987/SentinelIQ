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
  admin: ['*'],
  risk_analyst: [
    'view:dashboard', 'view:events', 'view:users', 'view:analytics',
    'action:label_shadow', 'action:resolve_events', 'view:link_analysis',
    'view:fraud_rings', 'view:cohorts'
  ],
  soc_responder: [
    'view:dashboard', 'view:events', 'view:alerts', 'view:link_analysis',
    'action:acknowledge_alerts', 'action:block_user', 'view:audit'
  ],
  compliance_officer: [
    'view:dashboard', 'view:audit', 'view:reports', 'action:export_audit',
    'view:users', 'view:events'
  ],
  data_scientist: [
    'view:dashboard', 'view:analytics', 'view:ml_models', 'view:shadow_mode',
    'action:train_models', 'view:cohorts', 'view:trends'
  ],
  developer: [
    'view:dashboard', 'view:api_docs', 'view:webhooks', 'view:integrations',
    'action:manage_webhooks', 'view:rules'
  ],
  end_user: [
    'view:own_activity', 'view:own_devices', 'action:report_issue'
  ],
};

// Demo users for each role
const DEMO_USERS: Record<UserRole, User> = {
  admin: {
    id: 'admin-001', email: 'admin@sentineliq.com', username: 'Admin User',
    role: 'admin', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-01-01T00:00:00Z', mfa_enabled: true,
  },
  risk_analyst: {
    id: 'analyst-001', email: 'analyst@sentineliq.com', username: 'Risk Analyst',
    role: 'risk_analyst', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-01-15T00:00:00Z', mfa_enabled: false,
  },
  soc_responder: {
    id: 'soc-001', email: 'soc@sentineliq.com', username: 'SOC Responder',
    role: 'soc_responder', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-02-01T00:00:00Z', mfa_enabled: true,
  },
  compliance_officer: {
    id: 'compliance-001', email: 'compliance@sentineliq.com', username: 'Compliance Officer',
    role: 'compliance_officer', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-02-15T00:00:00Z', mfa_enabled: true,
  },
  data_scientist: {
    id: 'ds-001', email: 'datascience@sentineliq.com', username: 'Data Scientist',
    role: 'data_scientist', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-03-01T00:00:00Z', mfa_enabled: false,
  },
  developer: {
    id: 'dev-001', email: 'developer@sentineliq.com', username: 'Developer',
    role: 'developer', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-03-15T00:00:00Z', mfa_enabled: false,
  },
  end_user: {
    id: 'user-001', email: 'user@example.com', username: 'End User',
    role: 'end_user', org_id: 'org-001', is_active: true, email_verified: true,
    created_at: '2024-04-01T00:00:00Z', mfa_enabled: false,
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
        return user.role === 'admin' || true; // Simplified for demo
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

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },
}))
