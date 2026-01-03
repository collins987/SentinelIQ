export enum UserRole {
  ANALYST = 'analyst',
  END_USER = 'enduser',
  SOC_RESPONDER = 'soc_responder',
  DATA_SCIENTIST = 'data_scientist',
  DEVELOPER = 'developer',
  COMPLIANCE = 'compliance',
}

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  permissions: string[]
  created_at: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
