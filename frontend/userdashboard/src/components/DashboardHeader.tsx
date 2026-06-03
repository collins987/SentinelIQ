import { useRouter } from 'next/router';
import { useUser } from '../context/UserContext';

export default function DashboardHeader({ user, onLogout, onSearch }: { user: any; onLogout: () => void; onSearch?: (q: string) => void }) {
  const router = useRouter();
  const { token } = useUser();
  const initials = user?.name
    ? user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className="h-10 w-10 rounded-xl object-cover" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Welcome back, {user?.name || 'User'}</h1>
            <p className="text-sm text-slate-500">Manage lending, risk, and account security in one place</p>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2">
          <button type="button" aria-label="Notifications" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-500 hover:text-slate-800">
            🔔
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">{initials}</div>
          <button
            onClick={onLogout}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
