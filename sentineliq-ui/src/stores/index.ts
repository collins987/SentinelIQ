import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type {
  BackgroundJob,
  SystemEvent,
  Notification,
  ServiceHealth,
  DashboardMetrics,
  SystemStatus,
} from '@/types';

// ============================================
// Dashboard Store
// ============================================

interface DashboardState {
  metrics: DashboardMetrics | null;
  isLoading: boolean;
  lastUpdated: string | null;
  setMetrics: (metrics: DashboardMetrics) => void;
  setLoading: (loading: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    (set) => ({
      metrics: null,
      isLoading: true,
      lastUpdated: null,
      setMetrics: (metrics) =>
        set({ metrics, lastUpdated: new Date().toISOString(), isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'dashboard-store' }
  )
);

// ============================================
// Jobs Store
// ============================================

interface JobsState {
  jobs: BackgroundJob[];
  selectedJob: BackgroundJob | null;
  filter: {
    status: string | null;
    queue: string | null;
    search: string;
  };
  setJobs: (jobs: BackgroundJob[]) => void;
  addJob: (job: BackgroundJob) => void;
  updateJob: (id: string, updates: Partial<BackgroundJob>) => void;
  removeJob: (id: string) => void;
  selectJob: (job: BackgroundJob | null) => void;
  setFilter: (filter: Partial<JobsState['filter']>) => void;
}

export const useJobsStore = create<JobsState>()(
  devtools(
    subscribeWithSelector((set) => ({
      jobs: [],
      selectedJob: null,
      filter: { status: null, queue: null, search: '' },
      setJobs: (jobs) => set({ jobs }),
      addJob: (job) => set((state) => ({ jobs: [job, ...state.jobs] })),
      updateJob: (id, updates) =>
        set((state) => ({
          jobs: state.jobs.map((j) => (j.id === id ? { ...j, ...updates } : j)),
        })),
      removeJob: (id) =>
        set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) })),
      selectJob: (selectedJob) => set({ selectedJob }),
      setFilter: (filter) =>
        set((state) => ({ filter: { ...state.filter, ...filter } })),
    })),
    { name: 'jobs-store' }
  )
);

// ============================================
// Events Store
// ============================================

interface EventsState {
  events: SystemEvent[];
  unreadCount: number;
  maxEvents: number;
  addEvent: (event: SystemEvent) => void;
  setEvents: (events: SystemEvent[]) => void;
  clearEvents: () => void;
  markAllRead: () => void;
}

export const useEventsStore = create<EventsState>()(
  devtools(
    (set) => ({
      events: [],
      unreadCount: 0,
      maxEvents: 100,
      addEvent: (event) =>
        set((state) => ({
          events: [event, ...state.events].slice(0, state.maxEvents),
          unreadCount: state.unreadCount + 1,
        })),
      setEvents: (events) => set({ events }),
      clearEvents: () => set({ events: [], unreadCount: 0 }),
      markAllRead: () => set({ unreadCount: 0 }),
    }),
    { name: 'events-store' }
  )
);

// ============================================
// Notifications Store
// ============================================

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>()(
  devtools(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications],
          unreadCount: notification.read ? state.unreadCount : state.unreadCount + 1,
        })),
      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        })),
      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
          unreadCount: 0,
        })),
      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
      clearAll: () => set({ notifications: [], unreadCount: 0 }),
    }),
    { name: 'notifications-store' }
  )
);

// ============================================
// System Health Store
// ============================================

interface SystemHealthState {
  services: ServiceHealth[];
  overallStatus: SystemStatus;
  lastCheck: string | null;
  setServices: (services: ServiceHealth[]) => void;
  updateService: (name: string, updates: Partial<ServiceHealth>) => void;
}

export const useSystemHealthStore = create<SystemHealthState>()(
  devtools(
    (set) => ({
      services: [],
      overallStatus: 'unknown',
      lastCheck: null,
      setServices: (services) => {
        const hasError = services.some((s) => s.status === 'critical');
        const hasWarning = services.some((s) => s.status === 'degraded');
        const overallStatus: SystemStatus = hasError
          ? 'critical'
          : hasWarning
          ? 'degraded'
          : 'healthy';
        set({ services, overallStatus, lastCheck: new Date().toISOString() });
      },
      updateService: (name, updates) =>
        set((state) => ({
          services: state.services.map((s) =>
            s.name === name ? { ...s, ...updates } : s
          ),
        })),
    }),
    { name: 'system-health-store' }
  )
);

// ============================================
// UI Store
// ============================================

interface UIState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleCommandPalette: () => void;
  setTheme: (theme: UIState['theme']) => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarCollapsed: false,
      commandPaletteOpen: false,
      theme: 'dark',
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ui-store' }
  )
);
