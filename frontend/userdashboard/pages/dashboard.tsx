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

// Fix: wrap logic in a function component
export default function DashboardPage() {


  const { user, token, logout } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [riskScores, setRiskScores] = useState<any[]>([]);
  const [activity, setActivity] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
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
      label: 'Recent Actions',
      value: activity?.recent_actions?.length ?? 0,
      icon: '📋',
      color: '#2563eb',
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f8fa' }}>
      <div style={{ margin: '32px 0 32px 32px' }}>
        <SideNav onSelect={setSelectedNav} selected={selectedNav} />
      </div>
      <main className="dashboard-container" style={{ flex: 1, paddingLeft: 0, paddingRight: 0, maxWidth: 1200 }}>
        <DashboardHeader user={profile} onLogout={logout} />
        {loading ? (
          <div className="card">Loading...</div>
        ) : error ? (
          <div className="card" style={{ color: 'red' }}>{error}</div>
        ) : (
          <>
            <KPIBar stats={summaryCards} />
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 24,
              marginBottom: 32,
            }}>
              <div>
                {profile && <ProfileCard user={profile} />}
                <SuggestionsList riskScores={riskScores} />
                <ContactAdminForm />
              </div>
              <div>
                <RiskScoreCard riskScores={riskScores} />
                {activity && session && <UserActivityCard activity={activity} session={session} />}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
