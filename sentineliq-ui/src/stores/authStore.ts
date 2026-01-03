import { create } from 'zustand'
import { User, AuthState, UserRole } from '../types'

interface AuthStoreState extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      // Demo: create mock user based on email
      const role = email.includes('analyst')
        ? UserRole.ANALYST
        : email.includes('soc')
        ? UserRole.SOC_RESPONDER
        : email.includes('dev')
        ? UserRole.DEVELOPER
        : email.includes('scientist')
        ? UserRole.DATA_SCIENTIST
        : email.includes('compliance')
        ? UserRole.COMPLIANCE
        : UserRole.END_USER

      const user: User = {
        id: `user_${Date.now()}`,
        email,
        name: email.split('@')[0].toUpperCase(),
        role,
        permissions: ['read:transactions', 'write:transactions'],
        created_at: new Date().toISOString(),
      }

      set({ user, isAuthenticated: true, isLoading: false })
    } catch (error) {
      set({ error: 'Login failed', isLoading: false })
      throw error
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false, error: null })
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },
}))
