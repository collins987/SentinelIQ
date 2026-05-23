import type { ServiceHealth, HealthHistoryPoint } from '../../services/dashboardApi';
import CircularGauge from './CircularGauge';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(239,68,68,0.2)',
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

export default function RedisDetail({ data, history }: Props) {
  const memPercent = data.memory_peak_mb
    ? Math.round(((data.memory_mb ?? 0) / data.memory_peak_mb) * 100)
    : 0;

  const chartData = history.map((p) => ({
    time: fmtTime(p.timestamp),
    memory: p.memory_mb ?? 0,
    hitRate: p.cache_hit_rate ?? 0,
    clients: p.connected_clients ?? 0,
    latency: p.latency_ms ?? 0,
  }));

  const collecting = (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 border-2 border-red-500/30 border-t-red-400 rounded-full animate-spin" />
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
            <CircularGauge value={data.cache_hit_rate ?? 0} max={100} label="Cache Hit Rate" thresholds={{ green: 95, yellow: 80 }} invert />
            <CircularGauge value={memPercent} max={100} label="Memory Usage" thresholds={{ green: 70, yellow: 85 }} />
            <CircularGauge value={data.mem_fragmentation_ratio ?? 1} max={3} label="Fragmentation" unit="x" thresholds={{ green: 50, yellow: 75 }} />
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Key Indicators</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Latency', value: `${data.latency_ms ?? '-'}ms`, color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
              { label: 'Clients', value: String(data.connected_clients ?? 0), color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/10' },
              { label: 'Evicted Keys', value: String(data.evicted_keys ?? 0), color: (data.evicted_keys ?? 0) > 0 ? 'text-yellow-400' : 'text-green-400', bg: (data.evicted_keys ?? 0) > 0 ? 'bg-yellow-500/5 border-yellow-500/10' : 'bg-green-500/5 border-green-500/10' },
              { label: 'Uptime', value: data.uptime_seconds ? `${Math.floor(data.uptime_seconds / 3600)}h ${Math.floor((data.uptime_seconds % 3600) / 60)}m` : '-', color: 'text-cyan-400', bg: 'bg-cyan-500/5 border-cyan-500/10' },
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
        {/* Memory Trend */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Memory Usage Trend</h4>
          <div className="h-56">
            {chartData.length < 2 ? collecting : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="redisMemGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} unit="MB" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="memory" stroke="#f87171" fill="url(#redisMemGrad)" strokeWidth={2} name="Memory (MB)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Cache Hit Rate Trend */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Cache Hit Rate Trend</h4>
          <div className="h-56">
            {chartData.length < 2 ? collecting : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="redisHitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} unit="%" domain={[0, 100]} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="hitRate" stroke="#22c55e" fill="url(#redisHitGrad)" strokeWidth={2} name="Hit Rate %" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Key Distribution — full width */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Key Distribution</h4>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{
              name: 'Keys',
              total: data.total_keys ?? 0,
              expired: data.expired_keys ?? 0,
              evicted: data.evicted_keys ?? 0,
            }]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
              <Bar dataKey="total" fill="#38bdf8" radius={[0, 4, 4, 0]} name="Total" />
              <Bar dataKey="expired" fill="#eab308" radius={[0, 4, 4, 0]} name="Expired" />
              <Bar dataKey="evicted" fill="#ef4444" radius={[0, 4, 4, 0]} name="Evicted" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Metrics Table ── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Metrics</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {[
            ['Status', data.status],
            ['Latency', `${data.latency_ms ?? '-'} ms`],
            ['Memory Used', `${data.memory_mb ?? '-'} MB`],
            ['Peak Memory', `${data.memory_peak_mb ?? '-'} MB`],
            ['Cache Hit Rate', `${data.cache_hit_rate ?? '-'}%`],
            ['Connected Clients', data.connected_clients ?? '-'],
            ['Blocked Clients', data.blocked_clients ?? 0],
            ['Evicted Keys', data.evicted_keys ?? 0],
            ['Total Keys', data.total_keys ?? '-'],
            ['Expired Keys', data.expired_keys ?? '-'],
            ['Fragmentation Ratio', data.mem_fragmentation_ratio ?? '-'],
            ['Uptime', data.uptime_seconds ? `${Math.floor(data.uptime_seconds / 3600)}h ${Math.floor((data.uptime_seconds % 3600) / 60)}m` : '-'],
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
