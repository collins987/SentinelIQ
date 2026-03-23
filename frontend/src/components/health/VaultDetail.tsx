import type { ServiceHealth, HealthHistoryPoint } from '../../services/dashboardApi';
import CircularGauge from './CircularGauge';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { LockClosedIcon, LockOpenIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(168,85,247,0.2)',
  borderRadius: '12px',
  color: '#fff',
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
};

function fmtTime(ts: string) {
  const d = new Date(ts.endsWith('Z') ? ts : ts + 'Z');
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface Props {
  data: ServiceHealth;
  history: HealthHistoryPoint[];
}

export default function VaultDetail({ data, history }: Props) {
  const ttlMax = 3600;
  const ttlVal = Math.max(data.token_ttl ?? 0, 0);

  const chartData = history.map((p) => ({
    time: fmtTime(p.timestamp),
    ttl: Math.max(p.token_ttl ?? 0, 0),
  }));

  const sealed = data.seal_status === true;
  const mountsList = data.mounts_enabled ?? [];

  const collecting = (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        <span>Collecting data points...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Top: Gauges + KPI Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Health Gauges</h4>
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            <CircularGauge value={ttlVal} max={ttlMax} label="Token TTL" unit="s" thresholds={{ green: 50, yellow: 15 }} invert />
            {/* Seal Status Visual */}
            <div className="flex flex-col items-center">
              <div className={clsx(
                'w-[120px] h-[120px] rounded-full flex items-center justify-center transition-all',
                sealed
                  ? 'bg-red-500/10 ring-2 ring-red-500/30 shadow-lg shadow-red-500/10'
                  : 'bg-green-500/10 ring-2 ring-green-500/30 shadow-lg shadow-green-500/10',
              )}>
                {sealed
                  ? <LockClosedIcon className="h-12 w-12 text-red-400" />
                  : <LockOpenIcon className="h-12 w-12 text-green-400" />
                }
              </div>
              <span className={clsx('text-xs mt-2 font-semibold', sealed ? 'text-red-400' : 'text-green-400')}>
                {sealed ? 'SEALED' : 'UNSEALED'}
              </span>
              <span className="text-xs text-gray-500">Seal Status</span>
            </div>
            <CircularGauge value={mountsList.length} max={Math.max(mountsList.length, 10)} label="Secret Mounts" unit="" thresholds={{ green: 50, yellow: 20 }} invert />
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Key Indicators</h4>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: 'Token TTL', value: ttlVal > 0 ? `${Math.floor(ttlVal / 60)}m ${ttlVal % 60}s` : 'Expired', color: ttlVal < 300 ? 'text-yellow-400' : 'text-green-400', bg: ttlVal < 300 ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-green-500/5 border-green-500/10' },
              { label: 'Lease Count', value: String(data.lease_count ?? '-'), color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/10' },
              { label: 'Mounts', value: String(mountsList.length), color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-xl border p-4 flex items-center justify-between ${kpi.bg}`}>
                <span className="text-sm text-gray-400">{kpi.label}</span>
                <span className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Token TTL Trend ── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Token TTL Trend</h4>
        <div className="h-56">
          {chartData.length < 2 ? collecting : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="vaultTtlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} unit="s" />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="ttl" stroke="#a78bfa" fill="url(#vaultTtlGrad)" strokeWidth={2} name="Token TTL (s)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Mounts Grid ── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Enabled Secret Mounts</h4>
        {mountsList.length === 0 ? (
          <p className="text-gray-500 text-sm">No mounts available</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {mountsList.map((mount) => (
              <div key={mount} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-purple-500/20 transition-colors">
                <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                <span className="text-sm text-gray-200 font-mono">{mount}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Metrics Table ── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {[
            ['Status', data.status],
            ['Seal Status', sealed ? 'Sealed' : 'Unsealed'],
            ['Token TTL', ttlVal > 0 ? `${Math.floor(ttlVal / 60)}m ${ttlVal % 60}s` : 'Expired'],
            ['Lease Count', data.lease_count ?? '-'],
            ['Mounts Enabled', mountsList.length],
            ['Server Time', data.server_time ? new Date(data.server_time * 1000).toLocaleString() : '-'],
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between py-2.5 border-b border-white/[0.04] text-sm">
              <span className="text-gray-500">{k}</span>
              <span className="text-gray-200 font-medium tabular-nums">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
