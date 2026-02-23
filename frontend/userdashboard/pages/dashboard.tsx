import { useEffect, useState } from 'react';
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

// New fintech components
import RiskBreakdownCard from '../src/components/RiskBreakdownCard';
import LoansCard from '../src/components/LoansCard';
import SessionsCard from '../src/components/SessionsCard';
import MFASetupCard from '../src/components/MFASetupCard';
import SecurityAlertsCard from '../src/components/SecurityAlertsCard';
import IncidentReportForm from '../src/components/IncidentReportForm';
import CoreObjectivesGraphs from '../src/components/CoreObjectivesGraphs';

export default function DashboardPage() {
  const { user, token, logout } = useUser();
  const router = useRouter();
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
    if (!token) {
      router.push('/');
      return;
    }
    setLoading(true);
    axios.get(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'}/user/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
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
  }, [token, router]);

  if (!token) return null;

  // Dashboard summary cards
  const summaryCards = [
    {
      label: 'Active Sessions',
      value: session?.active_sessions ?? 0,
      icon: '🟢',
      color: '#22c55e',
    },
    {
      label: 'Failed Logins (24h)',
      value: activity?.failed_logins_24h ?? 0,
      icon: '🔒',
      color: '#ef4444',
    },
    {
      label: 'Risk Score',
      value: riskScores.length > 0 ? riskScores[0].score : 0,
      icon: '⚠️',
      color: riskScores.length > 0 && riskScores[0].score > 70 ? '#ef4444' : riskScores.length > 0 && riskScores[0].score > 40 ? '#f59e42' : '#22c55e',
    },
    {
      label: 'Unread Alerts',
      value: alertsSummary?.unread ?? 0,
      icon: '🔔',
      color: (alertsSummary?.unread ?? 0) > 0 ? '#ef4444' : '#22c55e',
    },
    {
      label: 'Active Loans',
      value: loansSummary?.active_loans ?? 0,
      icon: '💰',
      color: '#8b5cf6',
    },
    {
      label: 'Trust Level',
      value: (trustLevel || 'unknown').replace('_', ' '),
      icon: '🛡️',
      color: trustLevel === 'trusted' ? '#22c55e' : trustLevel === 'under_review' ? '#f59e42' : '#ef4444',
    },
  ];

  // Section rendering based on nav selection
  const renderSection = () => {
    switch (selectedNav) {
      case 'Sessions':
        return <SessionsCard />;
      case 'Security':
        return (
          <>
            <MFASetupCard />
            <SecurityAlertsCard />
            <IncidentReportForm />
          </>
        );
      case 'Loans':
        return <LoansCard />;
      case 'Risk':
        return (
          <>
            {riskBreakdown && (
              <RiskBreakdownCard
                breakdown={riskBreakdown}
                overallScore={riskScores.length > 0 ? riskScores[0].score : 0}
                trustLevel={trustLevel}
              />
            )}
            <RiskScoreCard riskScores={riskScores} />
          </>
        );
      case 'Support':
        return (
          <>
            <IncidentReportForm />
            <ContactAdminForm />
          </>
        );
      default: // Dashboard (overview)
        return (
          <>
            <KPIBar stats={summaryCards} />

            {/* Alerts banner — editorial inline notice */}
            {(alertsSummary?.unread ?? 0) > 0 && (
              <div className="alert-banner-editorial">
                <span className="alert-banner-icon">!</span>
                <span className="alert-banner-text">
                  You have <strong>{alertsSummary.unread}</strong> unread security alert{alertsSummary.unread !== 1 ? 's' : ''}
                </span>
                <button className="alert-banner-btn" onClick={() => setSelectedNav('Security')}>
                  View Alerts →
                </button>
              </div>
            )}

            {/* Core Objectives Circular Graphs */}
            <CoreObjectivesGraphs
              profile={profile}
              riskBreakdown={riskBreakdown}
              loansSummary={loansSummary}
              alertsSummary={alertsSummary}
              session={session}
              activity={activity}
            />

            <div className="content-grid">
              <div className="content-column">
                {profile && <ProfileCard user={profile} />}
                {riskBreakdown && (
                  <RiskBreakdownCard
                    breakdown={riskBreakdown}
                    overallScore={riskScores.length > 0 ? riskScores[0].score : 0}
                    trustLevel={trustLevel}
                  />
                )}
                <SuggestionsList riskScores={riskScores} />
                <MFASetupCard />
                <ContactAdminForm />
              </div>
              <div className="content-column">
                <RiskScoreCard riskScores={riskScores} />
                <LoansCard />
                <SecurityAlertsCard />
                {activity && session && <UserActivityCard activity={activity} session={session} />}
                <SessionsCard />
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="dashboard-layout">
      <SideNav onSelect={setSelectedNav} selected={selectedNav} />
      <main className="dashboard-container">
        <DashboardHeader user={profile} onLogout={logout} />

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <div className="loading-text">Loading your dashboard...</div>
          </div>
        ) : error ? (
          <div className="error-container">{error}</div>
        ) : (
          <>
            {/* Welcome Banner — Editorial Style */}
            <div className="welcome-banner">
              <h1>Welcome back,<br /><em>{profile?.name?.split(' ')[0] || 'there'}.</em></h1>
              <div className="welcome-meta">
                <span>🕒 {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                <div className="meta-divider" style={{ width: 1, height: 14, background: 'var(--color-border)', display: 'inline-block' }}></div>
                <span>🛡️ {riskScores.length} risk factor{riskScores.length !== 1 ? 's' : ''} tracked</span>
                <div className="meta-divider" style={{ width: 1, height: 14, background: 'var(--color-border)', display: 'inline-block' }}></div>
                <span>🟢 {session?.active_sessions ?? 0} active session{(session?.active_sessions ?? 0) !== 1 ? 's' : ''}</span>
                {trustLevel !== 'unknown' && (
                  <>
                    <div className="meta-divider" style={{ width: 1, height: 14, background: 'var(--color-border)', display: 'inline-block' }}></div>
                    <span>🛡️ Trust: {trustLevel.replace('_', ' ')}</span>
                  </>
                )}
              </div>
            </div>

            {renderSection()}
          </>
        )}
      </main>
    </div>
  );
}
