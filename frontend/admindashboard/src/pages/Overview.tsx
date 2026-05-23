import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import {
  useGetSystemHealthQuery,
  useGetUserStatsQuery,
  useGetRiskSummaryQuery,
  useGetEventsQuery,
} from '../services/dashboardApi';
import StatsCard from '../components/dashboard/StatsCard';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EChartPanel from '../components/charts/EChartPanel';
import RealtimeLineChart from '../components/charts/RealtimeLineChart';
import {
  UsersIcon,
  UserGroupIcon,
  ShieldExclamationIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function Overview() {
  const { selectedTimeRange } = useAppSelector((state) => state.dashboard);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  
  // Fetch all dashboard data - skip if not authenticated
  const { data: health, isLoading: healthLoading, error: healthError } = useGetSystemHealthQuery(undefined, { skip: !isAuthenticated });
  const { data: userStats, isLoading: statsLoading } = useGetUserStatsQuery(undefined, { skip: !isAuthenticated });
  const { data: riskSummary, isLoading: riskLoading } = useGetRiskSummaryQuery(selectedTimeRange, { skip: !isAuthenticated });
  const { data: events, isLoading: eventsLoading } = useGetEventsQuery({ limit: 10 }, { skip: !isAuthenticated });
  
  const isLoading = healthLoading || statsLoading || riskLoading || eventsLoading;
  
  const loginTrendOption = useMemo(() => {
    const series = (userStats?.login_trend ?? []).map((item) => item.logins);
    const labels = (userStats?.login_trend ?? []).map((item) => item.date.slice(5));
    return {
      grid: { left: 28, right: 16, top: 34, bottom: 22 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1f2937' } },
      },
      series: [
        {
          type: 'line',
          smooth: true,
          data: series,
          lineStyle: { color: '#38bdf8', width: 2 },
          areaStyle: { color: 'rgba(56, 189, 248, 0.18)' },
          showSymbol: false,
        },
      ],
    };
  }, [userStats]);

  const riskDonutOption = useMemo(() => {
    const dist = riskSummary?.risk_distribution ?? { low: 0, medium: 0, high: 0 };
    return {
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      series: [
        {
          type: 'pie',
          radius: ['55%', '80%'],
          avoidLabelOverlap: true,
          label: { show: false },
          data: [
            { value: dist.low, name: 'Low', itemStyle: { color: '#22c55e' } },
            { value: dist.medium, name: 'Medium', itemStyle: { color: '#f59e0b' } },
            { value: dist.high, name: 'High', itemStyle: { color: '#ef4444' } },
          ],
        },
      ],
    };
  }, [riskSummary]);

  const roleStackOption = useMemo(() => {
    const roles = Object.keys(userStats?.by_role ?? {});
    const values = Object.values(userStats?.by_role ?? {});
    return {
      grid: { left: 24, right: 12, top: 30, bottom: 24 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: roles,
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1f2937' } },
      },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: '#6366f1',
          },
        },
      ],
    };
  }, [userStats]);

  const severityOption = useMemo(() => {
    const counts = (events?.events ?? []).reduce(
      (acc, evt) => {
        acc[evt.severity] = (acc[evt.severity] || 0) + 1;
        return acc;
      },
      { info: 0, warning: 0, high: 0, critical: 0 } as Record<string, number>
    );
    return {
      grid: { left: 24, right: 12, top: 30, bottom: 24 },
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: ['info', 'warning', 'high', 'critical'],
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#94a3b8', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1f2937' } },
      },
      series: [
        {
          type: 'bar',
          data: [counts.info, counts.warning, counts.high, counts.critical],
          itemStyle: {
            color: (params: { dataIndex: number }) =>
              ['#38bdf8', '#f59e0b', '#f97316', '#ef4444'][params.dataIndex],
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    };
  }, [events]);

  const healthPercent = Math.round(health?.overall_health_percent ?? 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl border border-dashboard-border bg-gradient-to-r from-slate-900/70 via-slate-900/60 to-slate-900/70 p-6 shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-sentinel-300">Admin Intelligence Hub</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">Enterprise Risk Observatory</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">
              Live monitoring for system health, fraud posture, and operational throughput.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 px-5 py-4 text-right">
            <p className="text-xs text-slate-400">System Health</p>
            <p className="text-3xl font-semibold text-emerald-300">{healthPercent}%</p>
            <p className="text-xs text-slate-500">{health?.status ?? 'unknown'} - {selectedTimeRange}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Total Users"
          value={userStats?.total_users ?? 0}
          change="+12%"
          changeType="increase"
          icon={UsersIcon}
        />
        <StatsCard
          title="Active Sessions"
          value={userStats?.active_sessions ?? 0}
          subtitle="Currently online"
          icon={UserGroupIcon}
        />
        <StatsCard
          title="Risk Events"
          value={riskSummary?.summary.flagged ?? 0}
          change="-5%"
          changeType="decrease"
          icon={ShieldExclamationIcon}
        />
        <StatsCard
          title="Active Today"
          value={userStats?.active_today ?? 0}
          subtitle="Logged in today"
          icon={ClockIcon}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EChartPanel
            title="Login Momentum"
            subtitle="Daily logins across the last 7 days"
            option={loginTrendOption}
            height={260}
          />
        </div>
        <EChartPanel
          title="Risk Distribution"
          subtitle="Portfolio severity mix"
          option={riskDonutOption}
          height={260}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <EChartPanel
          title="Role Adoption"
          subtitle="Current user composition"
          option={roleStackOption}
          height={240}
        />
        <EChartPanel
          title="Event Severity"
          subtitle="Last 100 events snapshot"
          option={severityOption}
          height={240}
        />
        <RealtimeLineChart title="Realtime API Load" subtitle="Updated every 5s" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card h-full">
            <div className="card-header">
              <h3 className="card-title">Live Activity Feed</h3>
              <span className="text-xs text-gray-400">Last updated {new Date().toLocaleTimeString()}</span>
            </div>
            <div className="space-y-3">
              {(events?.events ?? []).slice(0, 6).map((event) => (
                <div key={event.id} className="flex items-start justify-between rounded-xl border border-dashboard-border bg-slate-900/60 p-4">
                  <div>
                    <p className="text-sm font-medium text-white">{event.action}</p>
                    <p className="text-xs text-slate-400">{event.message}</p>
                  </div>
                  <div className="text-xs text-slate-400">
                    {event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : 'now'}
                  </div>
                </div>
              ))}
              {(!events || events.events.length === 0) && (
                <div className="rounded-xl border border-dashed border-dashboard-border p-6 text-center text-sm text-slate-400">
                  No events recorded for the selected time range.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="card h-full">
          <div className="card-header">
            <h3 className="card-title">Service Health</h3>
          </div>
          <div className="space-y-4">
            {['database', 'redis', 'kafka', 'vault'].map((service) => {
              const entry = health?.services?.[service as keyof NonNullable<typeof health>['services']];
              return (
                <div key={service} className="rounded-xl border border-dashboard-border bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-white capitalize">{service}</p>
                    <span className="text-xs text-slate-400">{entry?.status ?? 'unknown'}</span>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-sentinel-500"
                      style={{ width: `${entry?.latency_ms ? Math.max(10, 100 - entry.latency_ms / 10) : 65}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {healthError && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
                {String(healthError)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
