import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User, AuthState, UserRole } from '../types'
import { api } from '../lib/api'

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
    email_verified: boolean;
  };
}

interface AuthStoreState extends AuthState {
  token: string | null;
  refreshToken: string | null;
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  refreshUser: () => Promise<void>
}

/**
 * Transform backend user response to frontend User type
 */
function transformUser(backendUser: LoginResponse['user']): User {
  const roleMap: Record<string, UserRole> = {
    admin: UserRole.ADMIN,
    analyst: UserRole.ANALYST,
    soc_responder: UserRole.SOC_RESPONDER,
    data_scientist: UserRole.DATA_SCIENTIST,
    developer: UserRole.DEVELOPER,
    compliance: UserRole.COMPLIANCE,
    viewer: UserRole.END_USER,
    enduser: UserRole.END_USER,
  };

  return {
    id: backendUser.id,
    email: backendUser.email,
    name: `${backendUser.first_name} ${backendUser.last_name}`.trim(),
    username: backendUser.email.split('@')[0],
    role: roleMap[backendUser.role.toLowerCase()] || UserRole.END_USER,
    permissions: [], // Will be fetched separately if needed
    status: backendUser.is_active ? 'active' : 'inactive',
    created_at: new Date().toISOString(),
  };
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          // Call the real backend login endpoint
          const response = await api.post<LoginResponse>('/auth/login', {
            email,
            password,
          });

          // Store tokens
          localStorage.setItem('auth_token', response.access_token);
          if (response.refresh_token) {
            localStorage.setItem('refresh_token', response.refresh_token);
          }

          const user = transformUser(response.user);

          set({
            user,
            token: response.access_token,
            refreshToken: response.refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        // Clear tokens
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');

        // Call logout endpoint (fire and forget)
        api.post('/auth/logout').catch(() => {
          // Ignore errors on logout
        });

        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },

      refreshUser: async () => {
        const { token } = get();
        if (!token) {
          set({ user: null, isAuthenticated: false });
          return;
        }

        try {
          const response = await api.get<LoginResponse['user']>('/api/v1/users/me');
          const user = transformUser(response);
          set({ user, isAuthenticated: true });
        } catch (error) {
          // Token might be expired, clear auth state
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
