import type { ServiceHealth, HealthHistoryPoint } from '../../services/dashboardApi';
import CircularGauge from './CircularGauge';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { formatNumber } from '../../utils/helpers';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(59,130,246,0.2)',
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

export default function DatabaseDetail({ data, history }: Props) {
  const connPercent = data.connections_max
    ? Math.round(((data.connections_active ?? 0) / data.connections_max) * 100)
    : 0;

  const chartData = history.map((p) => ({
    time: fmtTime(p.timestamp),
    latency: p.latency_ms ?? 0,
    commits: p.xact_commit ?? 0,
    rollbacks: p.xact_rollback ?? 0,
    pool: p.pool_usage_percent ?? 0,
    connections: p.connections_active ?? 0,
  }));

  const collecting = (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
        <span>Collecting data points...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Top: Gauges + KPI Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gauges */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Health Gauges</h4>
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            <CircularGauge value={data.pool_usage_percent ?? 0} max={100} label="Pool Usage" thresholds={{ green: 60, yellow: 80 }} />
            <CircularGauge value={data.cache_hit_ratio ?? 0} max={100} label="Cache Hit Ratio" thresholds={{ green: 95, yellow: 80 }} invert />
            <CircularGauge value={connPercent} max={100} label="Conn. Saturation" thresholds={{ green: 50, yellow: 75 }} />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Key Indicators</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Latency', value: `${data.latency_ms ?? '-'}ms`, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
              { label: 'DB Size', value: `${data.db_size_mb ?? '-'} MB`, color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/10' },
              { label: 'Deadlocks', value: String(data.deadlocks ?? 0), color: (data.deadlocks ?? 0) > 0 ? 'text-red-400' : 'text-green-400', bg: (data.deadlocks ?? 0) > 0 ? 'bg-red-500/5 border-red-500/10' : 'bg-green-500/5 border-green-500/10' },
              { label: 'Slow Queries', value: String(data.slow_queries ?? 0), color: (data.slow_queries ?? 0) > 0 ? 'text-yellow-400' : 'text-green-400', bg: (data.slow_queries ?? 0) > 0 ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-green-500/5 border-green-500/10' },
            ].map((kpi) => (
              <div key={kpi.label} className={`rounded-xl border p-4 text-center ${kpi.bg}`}>
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Trend */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Latency Trend</h4>
          <div className="h-56">
            {chartData.length < 2 ? collecting : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dbLatGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} unit="ms" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="latency" stroke="#38bdf8" fill="url(#dbLatGrad)" strokeWidth={2} name="Latency (ms)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Connections + Pool Trend */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Connections & Pool Usage</h4>
          <div className="h-56">
            {chartData.length < 2 ? collecting : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dbConnGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                  <Area type="monotone" dataKey="connections" stroke="#a78bfa" fill="url(#dbConnGrad)" strokeWidth={2} name="Active Conn." dot={false} />
                  <Area type="monotone" dataKey="pool" stroke="#22c55e" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Pool %" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Commits vs Rollbacks — full width */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Transactions — Commits vs Rollbacks</h4>
        <div className="h-56">
          {chartData.length < 2 ? collecting : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={50} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="commits" fill="#22c55e" radius={[4, 4, 0, 0]} name="Commits" />
                <Bar dataKey="rollbacks" fill="#ef4444" radius={[4, 4, 0, 0]} name="Rollbacks" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Metrics Table ── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {[
            ['Status', data.status],
            ['Latency', `${data.latency_ms ?? '-'} ms`],
            ['Active Connections', `${data.connections_active ?? '-'} / ${data.connections_max ?? '-'}`],
            ['Pool Size', data.pool_size],
            ['Pool Checked Out', data.pool_checked_out],
            ['Pool Overflow', data.pool_overflow],
            ['Pool Usage', `${data.pool_usage_percent ?? '-'}%`],
            ['Cache Hit Ratio', `${data.cache_hit_ratio ?? '-'}%`],
            ['Commits', formatNumber(data.xact_commit ?? 0)],
            ['Rollbacks', formatNumber(data.xact_rollback ?? 0)],
            ['Deadlocks', data.deadlocks ?? 0],
            ['Slow Queries', data.slow_queries ?? 0],
            ['Database Size', `${data.db_size_mb ?? '-'} MB`],
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
