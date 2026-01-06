import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthUser, AuthState, UserRole } from '@/types'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: AuthUser | null) => void
  setError: (error: string | null) => void
  hasPermission: (permission: string) => boolean
  hasRole: (role: UserRole) => boolean
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user
        }),

      setError: (error) => set({ error }),

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          // Call your auth API here
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })

          if (!response.ok) throw new Error('Login failed')

          const data = await response.json()
          localStorage.setItem('auth_token', data.token)

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false
          })
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        set({
          user: null,
          isAuthenticated: false,
          error: null
        })
      },

      hasPermission: (permission: string) => {
        const { user } = get()
        return user?.permissions.includes(permission) ?? false
      },

      hasRole: (role: UserRole) => {
        const { user } = get()
        return user?.role === role
      }
    }),
    {
      name: 'auth-storage'
    }
  )
)
