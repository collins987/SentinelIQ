import type { ServiceHealth, HealthHistoryPoint } from '../../services/dashboardApi';
import CircularGauge from './CircularGauge';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid rgba(251,146,60,0.2)',
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

export default function KafkaDetail({ data, history }: Props) {
  const lagMax = 500;
  const partHealth = (data.partition_count ?? 0) > 0
    ? Math.round((((data.partition_count ?? 0) - (data.under_replicated_partitions ?? 0)) / (data.partition_count ?? 1)) * 100)
    : 100;

  const chartData = history.map((p) => ({
    time: fmtTime(p.timestamp),
    lag: p.consumer_lag ?? 0,
    throughput: p.message_throughput_sec ?? 0,
    producers: p.active_producers ?? 0,
    consumers: p.active_consumers ?? 0,
  }));

  const collecting = (
    <div className="flex items-center justify-center h-full text-gray-500 text-sm">
      <div className="flex flex-col items-center gap-2">
        <div className="h-5 w-5 border-2 border-orange-500/30 border-t-orange-400 rounded-full animate-spin" />
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
            <CircularGauge value={data.consumer_lag ?? 0} max={lagMax} label="Consumer Lag" unit="" thresholds={{ green: 20, yellow: 50 }} />
            <CircularGauge value={partHealth} max={100} label="Partition Health" thresholds={{ green: 95, yellow: 80 }} invert />
            <CircularGauge value={(data.active_producers ?? 0) + (data.active_consumers ?? 0)} max={10} label="Active Clients" unit="" thresholds={{ green: 60, yellow: 30 }} invert />
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-5">Key Indicators</h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Producers', value: String(data.active_producers ?? 0), color: 'text-orange-400', bg: 'bg-orange-500/5 border-orange-500/10' },
              { label: 'Consumers', value: String(data.active_consumers ?? 0), color: 'text-cyan-400', bg: 'bg-cyan-500/5 border-cyan-500/10' },
              { label: 'Partitions', value: String(data.partition_count ?? '-'), color: 'text-purple-400', bg: 'bg-purple-500/5 border-purple-500/10' },
              { label: 'Throughput', value: data.message_throughput_sec != null ? `${data.message_throughput_sec} msg/s` : '-', color: 'text-blue-400', bg: 'bg-blue-500/5 border-blue-500/10' },
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
        {/* Consumer Lag Trend */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Consumer Lag Trend</h4>
          <div className="h-56">
            {chartData.length < 2 ? collecting : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="kafkaLagGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="lag" stroke="#fb923c" fill="url(#kafkaLagGrad)" strokeWidth={2} name="Consumer Lag" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Throughput Trend */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Message Throughput</h4>
          <div className="h-56">
            {chartData.length < 2 ? collecting : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="kafkaThrGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={40} unit="/s" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="throughput" stroke="#38bdf8" fill="url(#kafkaThrGrad)" strokeWidth={2} name="Messages/sec" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Producers vs Consumers — full width */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-5">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Active Clients Over Time</h4>
        <div className="h-56">
          {chartData.length < 2 ? collecting : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                <Bar dataKey="producers" fill="#fb923c" radius={[4, 4, 0, 0]} name="Producers" />
                <Bar dataKey="consumers" fill="#22d3ee" radius={[4, 4, 0, 0]} name="Consumers" />
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
            ['Consumer Lag', data.consumer_lag ?? '-'],
            ['Partition Count', data.partition_count ?? '-'],
            ['Under-replicated', data.under_replicated_partitions ?? '-'],
            ['Active Producers', data.active_producers ?? 0],
            ['Active Consumers', data.active_consumers ?? 0],
            ['Throughput', data.message_throughput_sec != null ? `${data.message_throughput_sec} msg/s` : '-'],
            ['Broker Uptime', data.broker_uptime ? `${Math.floor(data.broker_uptime / 3600)}h` : '-'],
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
