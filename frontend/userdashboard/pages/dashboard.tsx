import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useUser } from '../src/context/UserContext';

import axios from 'axios';

import UserActivityCard from '../src/components/UserActivityCard';
import ProfileCard from '../src/components/ProfileCard';
import RiskScoreCard from '../src/components/RiskScoreCard';
import ContactAdminForm from '../src/components/ContactAdminForm';
import DashboardHeader from '../src/components/DashboardHeader';
import KPIBar from '../src/components/KPIBar';
import SideNav from '../src/components/SideNav';
import SuggestionsList from '../src/components/SuggestionsList';
import RiskBreakdownCard from '../src/components/RiskBreakdownCard';
import LoansCard from '../src/components/LoansCard';
import SessionsCard from '../src/components/SessionsCard';
import MFASetupCard from '../src/components/MFASetupCard';
import SecurityAlertsCard from '../src/components/SecurityAlertsCard';
import IncidentReportForm from '../src/components/IncidentReportForm';
import PhoneVerificationCard from '../src/components/PhoneVerificationCard';
import CoreObjectivesGraphs from '../src/components/CoreObjectivesGraphs';
import AccountCompletionTracker from '../src/components/AccountCompletionTracker';
import QuickActions from '../src/components/QuickActions';
import LoanDueReminder from '../src/components/LoanDueReminder';
import ProtectedRoute from '../src/components/ProtectedRoute';

const API_ROOT =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, '') ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:8000';

function DashboardPageContent() {
  const { user, token, logout, isReady, isProfileLoading } = useUser();
  const router = useRouter();
  const didFetchRef = useRef(false);
  const [profile, setProfile] = useState<any>(null);
  const [riskScores, setRiskScores] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [riskBreakdown, setRiskBreakdown] = useState<any>(null);
  const [trustLevel, setTrustLevel] = useState<string>('unknown');
  const [loansSummary, setLoansSummary] = useState<any>(null);
  const [alertsSummary, setAlertsSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedNav, setSelectedNav] = useState('Dashboard');

  useEffect(() => {
    if (!isReady) return;
    didFetchRef.current = false;
  }, [token, user, isReady]);

  useEffect(() => {
    if (!isReady || isProfileLoading) return;
    if (!token) {
      router.push('/');
      return;
    }
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    setLoading(true);
    axios
      .get(`${API_ROOT}/user/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setProfile(res.data.profile);
        setRiskScores(res.data.risk_scores);
        setActivity(res.data.activity);
        setSession(res.data.session);
        setRiskBreakdown(res.data.risk_breakdown || null);
        setTrustLevel(res.data.trust_level || 'unknown');
        setLoansSummary(res.data.loans_summary || null);
        setAlertsSummary(res.data.alerts_summary || null);
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load dashboard data');
        setLoading(false);
      });
  }, [token, router, isReady, isProfileLoading]);

  const summaryCards = [
    { label: 'Active Sessions', value: session?.active_sessions ?? 0, icon: '◉', color: '#111111' },
    { label: 'Failed Logins (24h)', value: activity?.failed_logins_24h ?? 0, icon: '⌁', color: '#111111' },
    {
      label: 'Risk Score',
      value: riskScores.length > 0 ? riskScores[0].score : 0,
      icon: '◈',
      color: '#111111',
    },
    { label: 'Unread Alerts', value: alertsSummary?.unread ?? 0, icon: '◌', color: '#111111' },
    { label: 'Active Loans', value: loansSummary?.active_loans ?? 0, icon: '◇', color: '#111111' },
    { label: 'Trust Level', value: (trustLevel || 'unknown').replace('_', ' '), icon: '◍', color: '#111111' },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = profile?.first_name || profile?.name?.split(' ')[0] || 'there';

  const renderSection = () => {
    switch (selectedNav) {
      case 'Sessions':
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SessionsCard />
            {activity && session && <UserActivityCard activity={activity} session={session} />}
          </div>
        );
      case 'Security':
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {profile && <ProfileCard user={profile} />}
            <AccountCompletionTracker profile={profile} onNavigate={setSelectedNav} />
            <PhoneVerificationCard />
            <MFASetupCard />
            <SecurityAlertsCard />
            <IncidentReportForm />
          </div>
        );
      case 'Loans':
        return (
          <div className="space-y-4">
            <LoanDueReminder loansSummary={loansSummary} onNavigate={setSelectedNav} />
            <LoansCard />
          </div>
        );
      case 'Risk':
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <CoreObjectivesGraphs
              profile={profile}
              riskBreakdown={riskBreakdown}
              loansSummary={loansSummary}
              alertsSummary={alertsSummary}
              session={session}
              activity={activity}
            />
            {riskBreakdown && (
              <RiskBreakdownCard
                breakdown={riskBreakdown}
                riskScore={riskScores.length > 0 ? riskScores[0].score : 0}
                trustLevel={trustLevel}
              />
            )}
            <RiskScoreCard riskScores={riskScores} />
            <SuggestionsList riskScores={riskScores} />
          </div>
        );
      case 'Support':
        return (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <IncidentReportForm />
            <ContactAdminForm />
          </div>
        );
      default:
        return (
          <div className="space-y-4">
            <KPIBar stats={summaryCards} />

            {(alertsSummary?.unread ?? 0) > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                <span className="text-sm text-rose-700">
                  You have <strong>{alertsSummary.unread}</strong> unread security alert{alertsSummary.unread !== 1 ? 's' : ''}
                </span>
                <button className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700" onClick={() => setSelectedNav('Security')}>
                  View Alerts
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 2xl:grid-cols-3">
              <div className="space-y-4 2xl:col-span-2">
                <CoreObjectivesGraphs
                  profile={profile}
                  riskBreakdown={riskBreakdown}
                  loansSummary={loansSummary}
                  alertsSummary={alertsSummary}
                  session={session}
                  activity={activity}
                />
              </div>
              <div className="space-y-4">
                <QuickActions
                  profile={profile}
                  loansSummary={loansSummary}
                  alertsSummary={alertsSummary}
                  onNavigate={setSelectedNav}
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <SideNav onSelect={setSelectedNav} selected={selectedNav} onLogout={logout} />
      <main className="flex-1 p-3 md:p-5 lg:p-6">
        <DashboardHeader
          user={profile}
          onLogout={logout}
          onSearch={(q: string) => {
            router.push(`/search?q=${encodeURIComponent(q)}`);
          }}
        />

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">Loading your dashboard...</div>
          </div>
        ) : error ? (
          <div className="error-container">{error}</div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900">{greeting}, {firstName}.</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{riskScores.length} risk factor{riskScores.length !== 1 ? 's' : ''}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{session?.active_sessions ?? 0} active session{(session?.active_sessions ?? 0) !== 1 ? 's' : ''}</span>
                {trustLevel !== 'unknown' && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1">Trust: {trustLevel.replace('_', ' ')}</span>
                )}
              </div>
            </div>

            {renderSection()}
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute allowedRoles={['viewer', 'user']}>
      <DashboardPageContent />
    </ProtectedRoute>
  );
}
