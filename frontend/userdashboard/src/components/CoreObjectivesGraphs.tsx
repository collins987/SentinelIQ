import { useMemo } from 'react';
import dynamic from 'next/dynamic';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

function getScoreColor(score: number): string {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  if (score >= 20) return 'Poor';
  return 'Critical';
}

interface CoreObjectivesGraphsProps {
  profile: {
    mfa_enabled?: boolean;
    email_verified?: boolean;
    trust_level?: string;
    phone?: string;
    phone_verified?: boolean;
  } | null;
  riskBreakdown: {
    identity?: number;
    behavior?: number;
    financial?: number;
    compliance?: number;
  } | null;
  loansSummary: {
    total_loans?: number;
    active_loans?: number;
    total_outstanding?: number;
    next_due_date?: string | null;
  } | null;
  alertsSummary: {
    unread?: number;
  } | null;
  session: {
    active_sessions?: number;
  } | null;
  activity: {
    failed_logins_24h?: number;
    recent_actions?: any[];
  } | null;
}

export default function CoreObjectivesGraphs({
  profile,
  riskBreakdown,
  loansSummary,
  alertsSummary,
  session,
  activity,
}: CoreObjectivesGraphsProps) {
  const norm = (v: number) => Math.min(100, Math.max(0, Math.round((v / 1000) * 100)));

  const identityRiskPct = norm(riskBreakdown?.identity ?? 0);
  const mfaBonus = profile?.mfa_enabled ? 20 : 0;
  const emailBonus = profile?.email_verified ? 10 : 0;
  const phoneBonus = profile?.phone_verified ? 5 : 0;
  const identityBase = 50;
  const identityScore = Math.min(100, Math.max(0,
    identityBase - identityRiskPct + mfaBonus + emailBonus + phoneBonus
  ));

  const financialRiskPct = norm(riskBreakdown?.financial ?? 0);
  const activeLoans = loansSummary?.active_loans ?? 0;
  const outstanding = loansSummary?.total_outstanding ?? 0;
  let financialScore = 100 - financialRiskPct;
  if (outstanding > 10000) financialScore = Math.max(0, financialScore - 20);
  else if (outstanding > 5000) financialScore = Math.max(0, financialScore - 12);
  else if (outstanding > 1000) financialScore = Math.max(0, financialScore - 5);
  if (activeLoans > 3) financialScore = Math.max(0, financialScore - 10);
  if (financialRiskPct === 0 && activeLoans === 0 && outstanding === 0) financialScore = 65;
  financialScore = Math.min(100, Math.max(0, Math.round(financialScore)));

  const behaviorRiskPct = norm(riskBreakdown?.behavior ?? 0);
  const complianceRiskPct = norm(riskBreakdown?.compliance ?? 0);
  const failedLogins = activity?.failed_logins_24h ?? 0;
  const unreadAlerts = alertsSummary?.unread ?? 0;
  const combinedRiskPct = Math.round(behaviorRiskPct * 0.5 + complianceRiskPct * 0.5);
  let behaviorScore = 100 - combinedRiskPct;
  if (failedLogins > 5) behaviorScore -= 25;
  else if (failedLogins > 2) behaviorScore -= 12;
  else if (failedLogins > 0) behaviorScore -= 5;
  if (unreadAlerts > 5) behaviorScore -= 15;
  else if (unreadAlerts > 2) behaviorScore -= 8;
  if (combinedRiskPct === 0 && failedLogins === 0 && unreadAlerts === 0) behaviorScore = 70;
  behaviorScore = Math.min(100, Math.max(0, Math.round(behaviorScore)));

  const identityOption = useMemo(
    () => ({
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          splitNumber: 5,
          radius: '92%',
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.25, '#fecaca'],
                [0.5, '#fdba74'],
                [0.75, '#93c5fd'],
                [1, '#6ee7b7'],
              ],
            },
          },
          pointer: { itemStyle: { color: getScoreColor(identityScore) } },
          axisTick: { distance: -20, length: 5, lineStyle: { color: '#94a3b8', width: 1 } },
          splitLine: { distance: -20, length: 14, lineStyle: { color: '#64748b', width: 2 } },
          axisLabel: { distance: -2, color: '#64748b', fontSize: 10 },
          detail: {
            valueAnimation: true,
            fontSize: 24,
            fontWeight: 700,
            offsetCenter: [0, '52%'],
            color: '#0f172a',
            formatter: '{value}%',
          },
          data: [{ value: identityScore }],
        },
      ],
    }),
    [identityScore]
  );

  const financialOption = useMemo(
    () => ({
      tooltip: { trigger: 'item' },
      legend: {
        bottom: 0,
        textStyle: { color: '#475569', fontSize: 11 },
        itemWidth: 9,
        itemHeight: 9,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['50%', '45%'],
          avoidLabelOverlap: false,
          label: { show: false },
          itemStyle: { borderRadius: 8, borderColor: '#ffffff', borderWidth: 2 },
          data: [
            { value: Math.max(0, 100 - financialRiskPct), name: 'Stability', itemStyle: { color: '#10b981' } },
            { value: financialRiskPct, name: 'Financial Risk', itemStyle: { color: '#f59e0b' } },
            { value: Math.min(100, activeLoans * 10), name: 'Loan Load', itemStyle: { color: '#3b82f6' } },
          ],
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          top: '36%',
          style: {
            text: `${financialScore}%`,
            fill: '#0f172a',
            fontWeight: 700,
            fontSize: 22,
          },
        },
        {
          type: 'text',
          left: 'center',
          top: '49%',
          style: {
            text: 'Health',
            fill: '#64748b',
            fontSize: 11,
          },
        },
      ],
    }),
    [financialRiskPct, financialScore, activeLoans]
  );

  const behaviorOption = useMemo(
    () => ({
      grid: { left: 36, right: 12, top: 24, bottom: 26 },
      xAxis: {
        type: 'category',
        data: ['Behavior', 'Compliance', 'Failed logins', 'Unread alerts'],
        axisLabel: { color: '#64748b', fontSize: 10 },
        axisLine: { lineStyle: { color: '#cbd5e1' } },
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#e2e8f0' } },
      },
      series: [
        {
          data: [behaviorRiskPct, complianceRiskPct, Math.min(100, failedLogins * 10), Math.min(100, unreadAlerts * 12)],
          type: 'bar',
          barWidth: 24,
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: (params: { dataIndex: number }) => ['#3b82f6', '#6366f1', '#f97316', '#ef4444'][params.dataIndex],
          },
        },
      ],
    }),
    [behaviorRiskPct, complianceRiskPct, failedLogins, unreadAlerts]
  );

  const scoreCards = [
    { title: 'Identity & Security', value: identityScore },
    { title: 'Financial Health', value: financialScore },
    { title: 'Behavior & Compliance', value: behaviorScore },
  ];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900">Core Monitoring Objectives</h2>
          <p className="mt-1 text-sm text-slate-500">Three live objectives powered by account, risk, and behavior telemetry</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Live</span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
        {scoreCards.map((item) => (
          <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.title}</div>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-2xl font-semibold tracking-tight text-slate-900">{item.value}</span>
              <span className="pb-1 text-xs font-semibold" style={{ color: getScoreColor(item.value) }}>
                {getScoreLabel(item.value)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="px-2 pt-2 text-sm font-semibold text-slate-800">Identity & Security</div>
          <ReactECharts option={identityOption} style={{ height: 250 }} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="px-2 pt-2 text-sm font-semibold text-slate-800">Financial Health</div>
          <ReactECharts option={financialOption} style={{ height: 250 }} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <div className="px-2 pt-2 text-sm font-semibold text-slate-800">Behavior & Compliance</div>
          <ReactECharts option={behaviorOption} style={{ height: 250 }} />
        </div>
      </div>
    </section>
  );
}
