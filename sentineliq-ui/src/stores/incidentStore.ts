import { create } from 'zustand'
import { Transaction, TransactionStatus, RiskLevel, IncidentState } from '@/types'
import apis from '@/services/index'

interface IncidentStore extends IncidentState {
  setIncidents: (incidents: Transaction[]) => void
  setSelectedIncident: (incident: Transaction | null) => void
  setLoading: (loading: boolean) => void
  setFilters: (filters: any) => void
  fetchIncidents: (filters?: Record<string, any>) => Promise<void>
  approveIncident: (id: string, notes?: string) => Promise<void>
  rejectIncident: (id: string, reason: string) => Promise<void>
  requestVerification: (id: string) => Promise<void>
}

export const useIncidentStore = create<IncidentStore>((set, get) => ({
  incidents: [],
  selectedIncident: null,
  isLoading: false,
  filters: {},

  setIncidents: (incidents) => set({ incidents }),

  setSelectedIncident: (incident) => set({ selectedIncident: incident }),

  setLoading: (isLoading) => set({ isLoading }),

  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters
      }
    })),

  fetchIncidents: async (filters) => {
    set({ isLoading: true })
    try {
      const data = await apis.transaction.getAll(filters || get().filters)
      set({ incidents: data, isLoading: false })
    } catch (error) {
      console.error('Failed to fetch incidents:', error)
      set({ isLoading: false })
      throw error
    }
  },

  approveIncident: async (id: string, notes?: string) => {
    try {
      await apis.transaction.approve(id, notes)
      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === id ? { ...inc, status: TransactionStatus.APPROVED } : inc
        )
      }))
    } catch (error) {
      console.error('Failed to approve incident:', error)
      throw error
    }
  },

  rejectIncident: async (id: string, reason: string) => {
    try {
      await apis.transaction.reject(id, reason)
      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === id ? { ...inc, status: TransactionStatus.REJECTED } : inc
        )
      }))
    } catch (error) {
      console.error('Failed to reject incident:', error)
      throw error
    }
  },

  requestVerification: async (id: string) => {
    try {
      await apis.transaction.requestVerification(id)
      set((state) => ({
        incidents: state.incidents.map((inc) =>
          inc.id === id ? { ...inc, status: TransactionStatus.NEEDS_VERIFICATION } : inc
        )
      }))
    } catch (error) {
      console.error('Failed to request verification:', error)
      throw error
    }
  }
}))
