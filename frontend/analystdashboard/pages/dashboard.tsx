import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAnalyst } from '../src/context/AnalystContext';
import {
  getAlerts, getHighRiskUsers, getRiskInsights, listInvestigations,
  inspectUser, createInvestigation, getInvestigation,
  updateInvestigation, addNote, addRecommendation, search as apiSearch,
  getOrganizationDetail,
  AlertFeedResponse, HighRiskUsersResponse, RiskInsights, InvestigationDetail,
  SearchResult, OrgDetail,
} from '../src/services/api';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, RadialBarChart, RadialBar,
  CartesianGrid,
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════
   NAV TYPES
   ═══════════════════════════════════════════════════════════════ */
type NavSection = 'overview' | 'alerts' | 'investigations' | 'insights' | 'search' | 'inspect' | 'org-inspect';

/* ═══════════════════════════════════════════════════════════════
   SVG CIRCULAR GAUGE — Professional SOC Threat Level Meter
   ═══════════════════════════════════════════════════════════════ */
function ThreatGauge({
  value,
  max = 100,
  label,
  size = 160,
}: {
  value: number;
  max?: number;
  label: string;
  size?: number;
}) {
  const pct = Math.min(value / max, 1);
  const r = (size - 24) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const range = endAngle - startAngle;
  const stroke = 14;

  const describeArc = (start: number, end: number) => {
    const s = (start * Math.PI) / 180;
    const e = (end * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const color =
    pct >= 0.8 ? '#dc2626' : pct >= 0.6 ? '#f97316' : pct >= 0.3 ? '#eab308' : '#10b981';

  return (
    <div className="gauge-component">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Background track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="#1e293b"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* Active arc */}
        {pct > 0 && (
          <path
            d={describeArc(startAngle, startAngle + range * pct)}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            filter={`url(#glow-${label})`}
            style={{ transition: 'all 1s cubic-bezier(.4,0,.2,1)' }}
          />
        )}
        {/* Tick marks */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const angle = ((startAngle + range * t) * Math.PI) / 180;
          const inner = r - 20;
          const outer = r - 12;
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(angle)}
              y1={cy + inner * Math.sin(angle)}
              x2={cx + outer * Math.cos(angle)}
              y2={cy + outer * Math.sin(angle)}
              stroke="#475569"
              strokeWidth="1.5"
            />
          );
        })}
        {/* Numeric value */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fill={color}
          fontSize="30"
          fontWeight="800"
          fontFamily="var(--font-mono)"
        >
          {value}
        </text>
        {/* Label */}
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fill="#64748b"
          fontSize="9"
          fontWeight="700"
          letterSpacing="1.2"
        >
          {label.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Animated Counter
   ═══════════════════════════════════════════════════════════════ */
function AnimCounter({ val, dur = 1000 }: { val: number; dur?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setDisplay(Math.floor(p * val));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [val, dur]);
  return <>{display}</>;
}

/* ═══════════════════════════════════════════════════════════════
   Live UTC Clock
   ═══════════════════════════════════════════════════════════════ */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="header-clock">
      <span className="clock-date">
        {now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </span>
      <span className="clock-time">
        {now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN DASHBOARD COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export default function AnalystDashboard() {
  const { user, token, logout } = useAnalyst();
  const router = useRouter();

  const [nav, setNav] = useState<NavSection>('overview');
  const [loading, setLoading] = useState(true);

  // Data stores
  const [alerts, setAlerts] = useState<AlertFeedResponse | null>(null);
  const [highRiskUsers, setHighRiskUsers] = useState<HighRiskUsersResponse | null>(null);
  const [insights, setInsights] = useState<RiskInsights | null>(null);
  const [investigations, setInvestigations] = useState<any>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [caseDetail, setCaseDetail] = useState<InvestigationDetail | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [orgUserSearch, setOrgUserSearch] = useState('');
  const [orgFilterRole, setOrgFilterRole] = useState('');
  const [orgFilterStatus, setOrgFilterStatus] = useState('');
  const [orgFilterRisk, setOrgFilterRisk] = useState('');
  const [orgFilterTrust, setOrgFilterTrust] = useState('');

  // Filters
  const [alertSeverity, setAlertSeverity] = useState('');
  const [invStatus, setInvStatus] = useState('');
  const [invSeverity, setInvSeverity] = useState('');

  // Modals
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCase, setNewCase] = useState({ user_id: '', severity: 'medium', reason: '' });
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ note: '', note_type: 'observation' });
  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm] = useState({ action: 'monitor', justification: '' });
  const [actionMsg, setActionMsg] = useState('');

  // Auth guard
  useEffect(() => {
    if (!token) router.push('/');
  }, [token, router]);

  // Data loader
  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (nav === 'overview') {
        const [a, u, ins] = await Promise.all([
          getAlerts(token, { limit: 50 }),
          getHighRiskUsers(token, { risk: 50, limit: 20 }),
          getRiskInsights(token),
        ]);
        setAlerts(a);
        setHighRiskUsers(u);
        setInsights(ins);
        const inv = await listInvestigations(token, { page_size: 50 });
        setInvestigations(inv);
      } else if (nav === 'alerts') {
        const [a, u] = await Promise.all([
          getAlerts(token, { severity: alertSeverity || undefined, limit: 50 }),
          getHighRiskUsers(token, { risk: 50, limit: 20 }),
        ]);
        setAlerts(a);
        setHighRiskUsers(u);
      } else if (nav === 'investigations') {
        const inv = await listInvestigations(token, {
          status: invStatus || undefined,
          severity: invSeverity || undefined,
          page_size: 50,
        });
        setInvestigations(inv);
      } else if (nav === 'insights') {
        const ins = await getRiskInsights(token);
        setInsights(ins);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, nav, alertSeverity, invStatus, invSeverity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh for live sections
  useEffect(() => {
    if (nav !== 'overview' && nav !== 'alerts') return;
    const id = setInterval(loadData, 30000);
    return () => clearInterval(id);
  }, [nav, loadData]);

  /* ─── Event Handlers ─── */
  const handleInspect = async (userId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      setInspectData(await inspectUser(token, userId));
      setNav('inspect');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCase = async (caseId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      setCaseDetail(await getInvestigation(token, caseId));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCase = async () => {
    if (!token || !newCase.user_id || !newCase.reason) return;
    try {
      await createInvestigation(token, newCase);
      setShowNewCase(false);
      setNewCase({ user_id: '', severity: 'medium', reason: '' });
      flash('Investigation opened successfully');
      loadData();
    } catch (err: any) {
      flash(err?.response?.data?.detail || 'Failed to create investigation', true);
    }
  };

  const handleAddNote = async () => {
    if (!token || !caseDetail || !noteForm.note) return;
    try {
      await addNote(token, caseDetail.investigation.id, noteForm);
      setShowNoteForm(false);
      setNoteForm({ note: '', note_type: 'observation' });
      setCaseDetail(await getInvestigation(token, caseDetail.investigation.id));
      flash('Note added');
    } catch (err: any) {
      flash(err?.response?.data?.detail || 'Failed', true);
    }
  };

  const handleRecommend = async () => {
    if (!token || !caseDetail || !recForm.justification) return;
    try {
      await addRecommendation(token, caseDetail.investigation.id, recForm);
      setShowRecForm(false);
      setRecForm({ action: 'monitor', justification: '' });
      setCaseDetail(await getInvestigation(token, caseDetail.investigation.id));
      flash('Recommendation submitted');
    } catch (err: any) {
      flash(err?.response?.data?.detail || 'Failed', true);
    }
  };

  const handleUpdateStatus = async (status: string, summary?: string) => {
    if (!token || !caseDetail) return;
    try {
      await updateInvestigation(token, caseDetail.investigation.id, {
        status,
        summary: summary || undefined,
      });
      setCaseDetail(await getInvestigation(token, caseDetail.investigation.id));
      flash(`Investigation ${status}`);
    } catch (err: any) {
      flash(err?.response?.data?.detail || 'Failed to update', true);
    }
  };

  const handleInspectOrg = async (orgId: string) => {
    if (!token) return;
    setLoading(true);
    try {
      setOrgDetail(await getOrganizationDetail(token, orgId));
      setOrgUserSearch('');
      setOrgFilterRole('');
      setOrgFilterStatus('');
      setOrgFilterRisk('');
      setOrgFilterTrust('');
      setNav('org-inspect');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (!token || q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchResults((await apiSearch(token, q)).results);
    } catch (err) {
      console.error(err);
    }
  };

  const flash = (msg: string, isError = false) => {
    setActionMsg((isError ? '⚠ ' : '✓ ') + msg);
    setTimeout(() => setActionMsg(''), 4000);
  };

  /* ─── Helpers ─── */
  const rl = (s: number) =>
    s >= 80 ? 'critical' : s >= 60 ? 'high' : s >= 30 ? 'medium' : 'low';

  const timeAgo = (ts: string) => {
    if (!ts) return '—';
    // Treat naive ISO timestamps (no Z or offset) as UTC
    const normalized = (!ts.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(ts) && !/[+-]\d{4}$/.test(ts)) ? ts + 'Z' : ts;
    const d = Date.now() - new Date(normalized).getTime();
    const m = Math.floor(d / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  /* ─── Chart Theming ─── */
  const TT = {
    contentStyle: {
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: 8,
      color: '#e2e8f0',
      fontSize: 12,
      boxShadow: '0 8px 24px rgba(0,0,0,.4)',
    },
  };
  const SEV_COLORS = ['#10b981', '#eab308', '#f97316', '#dc2626'];
  const STATUS_COLORS = ['#3b82f6', '#eab308', '#f97316', '#6b7280'];

  if (!token) return null;

  /* ─── Computed Values ─── */
  const totalAlerts = alerts?.total || 0;
  const critAlerts = alerts?.alerts.filter((a) => a.severity === 'critical').length || 0;
  const totalHR = highRiskUsers?.total || 0;
  const avgRisk = insights?.avg_risk_score || 0;
  const openInv = insights?.open_investigations || 0;
  const pendingRec = insights?.pending_recommendations || 0;

  const sevRadial = insights
    ? [
        { name: 'Critical', value: insights.risk_distribution.critical, fill: '#dc2626' },
        { name: 'High', value: insights.risk_distribution.high, fill: '#f97316' },
        { name: 'Medium', value: insights.risk_distribution.medium, fill: '#eab308' },
        { name: 'Low', value: insights.risk_distribution.low, fill: '#10b981' },
      ]
    : [];

  const statusData = investigations
    ? [
        { name: 'Open', value: investigations.investigations?.filter((i: any) => i.status === 'open').length || 0 },
        { name: 'Monitoring', value: investigations.investigations?.filter((i: any) => i.status === 'monitoring').length || 0 },
        { name: 'Escalated', value: investigations.investigations?.filter((i: any) => i.status === 'escalated').length || 0 },
        { name: 'Closed', value: investigations.investigations?.filter((i: any) => i.status === 'closed').length || 0 },
      ]
    : [];

  /* ─── Nav Config ─── */
  const navItems: { id: NavSection; label: string; icon: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
    { id: 'alerts', label: 'Alerts Feed', icon: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 01-3.46 0', badge: totalAlerts },
    { id: 'investigations', label: 'Investigations', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', badge: openInv },
    { id: 'insights', label: 'Risk Intelligence', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'search', label: 'Search', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
  ];

  const switchNav = (n: NavSection) => {
    setNav(n);
    setCaseDetail(null);
    if (n !== 'inspect') setInspectData(null);
    if (n !== 'org-inspect') setOrgDetail(null);
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="soc-layout">
      {/* ═══════ SIDEBAR ═══════ */}
      <aside className="soc-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-wrap">
            <img src="/sentineliq-icon.jpeg" alt="SentinelIQ" className="brand-icon-img" />
            <div className="brand-pulse" />
          </div>
          <div className="brand-text">
            <span className="brand-name">SentinelIQ</span>
            <span className="brand-sub">ANALYST CONSOLE</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">OPERATIONS</div>
          {navItems.slice(0, 3).map((n) => (
            <div
              key={n.id}
              className={`sidebar-item${nav === n.id ? ' active' : ''}`}
              onClick={() => switchNav(n.id)}
            >
              <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {n.icon.split(' M').map((d, i) => (
                  <path key={i} d={i === 0 ? d : 'M' + d} />
                ))}
              </svg>
              <span>{n.label}</span>
              {(n.badge ?? 0) > 0 && <span className="sidebar-badge">{n.badge}</span>}
            </div>
          ))}

          <div className="sidebar-section">INTELLIGENCE</div>
          {navItems.slice(3).map((n) => (
            <div
              key={n.id}
              className={`sidebar-item${nav === n.id ? ' active' : ''}`}
              onClick={() => switchNav(n.id)}
            >
              <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {n.icon.split(' M').map((d, i) => (
                  <path key={i} d={i === 0 ? d : 'M' + d} />
                ))}
              </svg>
              <span>{n.label}</span>
            </div>
          ))}

          {inspectData && (
            <>
              <div className="sidebar-section">ACTIVE</div>
              <div
                className={`sidebar-item${nav === 'inspect' ? ' active' : ''}`}
                onClick={() => {
                  setNav('inspect');
                  setCaseDetail(null);
                }}
              >
                <svg className="sidebar-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span>User: {inspectData.user?.first_name}</span>
              </div>
            </>
          )}
        </nav>

        {/* System Health */}
        <div className="sidebar-system-status">
          <div className="system-status-header">
            <span className="system-dot online" />
            System Online
          </div>
          <div className="system-status-row">
            <span>API</span>
            <span className="sys-ok">Operational</span>
          </div>
          <div className="system-status-row">
            <span>Monitoring</span>
            <span className="sys-ok">Active</span>
          </div>
          <div className="system-status-row">
            <span>Threat Feed</span>
            <span className="sys-ok">Live</span>
          </div>
        </div>

        {/* Profile */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {(user?.first_name || user?.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-profile-info">
            <div className="sidebar-profile-name">{user?.first_name || user?.name || 'Analyst'}</div>
            <div className="sidebar-profile-role">{user?.role || 'analyst'}</div>
          </div>
          <button className="sidebar-logout" onClick={logout} title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ═══════ MAIN AREA ═══════ */}
      <div className="soc-main">
        {/* Header Bar */}
        <header className="soc-header">
          <div className="header-left">
            <div className="header-title">
              {nav === 'overview' && 'Threat Overview'}
              {nav === 'alerts' && 'Alerts Feed'}
              {nav === 'investigations' &&
                (caseDetail ? `Case ${caseDetail.investigation.id.slice(0, 8)}` : 'Investigations')}
              {nav === 'insights' && 'Risk Intelligence'}
              {nav === 'search' && 'Global Search'}
              {nav === 'inspect' && 'User Inspection'}
              {nav === 'org-inspect' && 'Organization Detail'}
            </div>
          </div>
          <div className="header-spacer" />
          <LiveClock />
          <div className="header-threat-level">
            <span className={`threat-indicator ${rl(avgRisk)}`} />
            <span className="threat-text">
              THREAT: <strong>{rl(avgRisk).toUpperCase()}</strong>
            </span>
          </div>
          <div className="header-status">
            <span className="header-status-dot" />
            LIVE
          </div>
        </header>

        {/* Toast Notifications */}
        <AnimatePresence>
          {actionMsg && (
            <motion.div
              className={`toast-bar ${actionMsg.startsWith('⚠') ? 'error' : 'success'}`}
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
            >
              {actionMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className="soc-content">
          {loading ? (
            <div className="loading-container">
              <div className="loading-ring"><div /><div /><div /><div /></div>
              <div className="loading-text">Aggregating intelligence data…</div>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={nav + (caseDetail ? '-case' : '')}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {/* ════════════════════════════════════════════════════════════
                    OVERVIEW — SOC Command Center
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'overview' && (
                  <>
                    {/* KPI Strip */}
                    <div className="kpi-row kpi-row-6">
                      {[
                        { label: 'Active Alerts', value: totalAlerts, level: totalAlerts > 10 ? 'critical' : 'cyan' },
                        { label: 'Critical', value: critAlerts, level: 'critical' },
                        { label: 'High Risk Users', value: totalHR, level: totalHR > 5 ? 'high' : 'medium' },
                        { label: 'Open Cases', value: openInv, level: 'info' },
                        { label: 'Pending Actions', value: pendingRec, level: pendingRec > 0 ? 'high' : 'low' },
                        { label: 'Avg Risk Score', value: avgRisk, level: rl(avgRisk) },
                      ].map((k, i) => (
                        <motion.div
                          key={i}
                          className={`kpi-card kpi-glow-${k.level}`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                        >
                          <span className="kpi-label">{k.label}</span>
                          <span className={`kpi-value ${k.level}`}>
                            <AnimCounter val={k.value} />
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* Gauge Row — 4 circular gauges */}
                    <div className="gauge-row">
                      <motion.div className="soc-card gauge-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                        <div className="soc-card-header"><span className="soc-card-title">Overall Risk Level</span></div>
                        <div className="soc-card-body gauge-center"><ThreatGauge value={avgRisk} label="Risk Score" size={180} /></div>
                      </motion.div>
                      <motion.div className="soc-card gauge-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
                        <div className="soc-card-header"><span className="soc-card-title">Alert Pressure</span></div>
                        <div className="soc-card-body gauge-center"><ThreatGauge value={Math.min(totalAlerts * 5, 100)} label="Alert Load" size={180} /></div>
                      </motion.div>
                      <motion.div className="soc-card gauge-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 }}>
                        <div className="soc-card-header"><span className="soc-card-title">Case Backlog</span></div>
                        <div className="soc-card-body gauge-center"><ThreatGauge value={Math.min(openInv * 10, 100)} label="Active Cases" size={180} /></div>
                      </motion.div>
                      <motion.div className="soc-card gauge-card" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45 }}>
                        <div className="soc-card-header"><span className="soc-card-title">Threat Index</span></div>
                        <div className="soc-card-body gauge-center">
                          <ThreatGauge
                            value={Math.min(Math.round(avgRisk * 0.6 + critAlerts * 10 + totalHR * 2), 100)}
                            label="Composite"
                            size={180}
                          />
                        </div>
                      </motion.div>
                    </div>

                    {/* Charts Row */}
                    <div className="soc-grid soc-grid-3" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Risk Distribution</span></div>
                        <div className="soc-card-body">
                          <div className="chart-wrapper" style={{ height: 220 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Low', value: insights?.risk_distribution.low || 0 },
                                    { name: 'Medium', value: insights?.risk_distribution.medium || 0 },
                                    { name: 'High', value: insights?.risk_distribution.high || 0 },
                                    { name: 'Critical', value: insights?.risk_distribution.critical || 0 },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={45}
                                  outerRadius={75}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {SEV_COLORS.map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip {...TT} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Case Status</span></div>
                        <div className="soc-card-body">
                          <div className="chart-wrapper" style={{ height: 220 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value" stroke="none">
                                  {STATUS_COLORS.map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip {...TT} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Severity Monitor</span></div>
                        <div className="soc-card-body">
                          <div className="chart-wrapper" style={{ height: 220 }}>
                            <ResponsiveContainer>
                              <RadialBarChart innerRadius="20%" outerRadius="90%" data={sevRadial} startAngle={180} endAngle={-180} barSize={10}>
                                <RadialBar background={{ fill: '#1e293b' }} dataKey="value" cornerRadius={6} />
                                <Tooltip {...TT} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                              </RadialBarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Alerts + Watchlist */}
                    <div className="soc-grid soc-grid-sidebar" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header">
                          <span className="soc-card-title">Recent Alerts</span>
                          <button className="btn btn-ghost btn-sm" onClick={() => switchNav('alerts')}>View All →</button>
                        </div>
                        <div className="alert-feed">
                          {(alerts?.alerts || []).slice(0, 8).map((a) => (
                            <div key={a.id} className="alert-item" onClick={() => a.user_id && handleInspect(a.user_id)}>
                              <div className={`alert-severity-dot ${a.severity}`} />
                              <div className="alert-content">
                                <div className="alert-title">{a.title}</div>
                                <div className="alert-message">{a.message}</div>
                                <div className="alert-meta">
                                  <span>{a.alert_type.replace(/_/g, ' ')}</span>
                                  <span>{timeAgo(a.timestamp)}</span>
                                </div>
                              </div>
                              {a.risk_score != null && (
                                <span className={`alert-risk-badge ${rl(a.risk_score)}`}>{a.risk_score}</span>
                              )}
                            </div>
                          ))}
                          {(!alerts || alerts.alerts.length === 0) && (
                            <div className="empty-state">
                              <div className="empty-state-icon">✓</div>
                              <div className="empty-state-text">All clear — no active alerts</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Watchlist</span></div>
                        <div className="soc-card-body" style={{ padding: 0 }}>
                          {(highRiskUsers?.users || []).slice(0, 10).map((u) => (
                            <div key={u.id} className="alert-item" onClick={() => handleInspect(u.id)}>
                              <div className={`alert-severity-dot ${rl(u.risk_score)}`} />
                              <div className="alert-content">
                                <div className="alert-title">{u.first_name} {u.last_name}</div>
                                <div className="alert-meta"><span>{u.email}</span></div>
                              </div>
                              <span className={`alert-risk-badge ${rl(u.risk_score)}`}>{u.risk_score}</span>
                            </div>
                          ))}
                          {(!highRiskUsers || highRiskUsers.users.length === 0) && (
                            <div className="empty-state"><div className="empty-state-text">No users on watchlist</div></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                    ALERTS FEED
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'alerts' && (
                  <>
                    <div className="kpi-row">
                      <div className="kpi-card"><span className="kpi-label">Total Alerts</span><span className={`kpi-value ${totalAlerts > 10 ? 'critical' : 'cyan'}`}><AnimCounter val={totalAlerts} /></span></div>
                      <div className="kpi-card"><span className="kpi-label">High Risk Users</span><span className={`kpi-value ${totalHR > 5 ? 'high' : 'medium'}`}><AnimCounter val={totalHR} /></span></div>
                      <div className="kpi-card"><span className="kpi-label">Critical Alerts</span><span className="kpi-value critical"><AnimCounter val={critAlerts} /></span></div>
                      <div className="kpi-card"><span className="kpi-label">Alert Sources</span><span className="kpi-value info">{alerts ? Object.keys(alerts.categories).length : 0}</span></div>
                    </div>

                    <div className="soc-grid soc-grid-sidebar" style={{ marginBottom: 24 }}>
                      <div className="soc-card">
                        <div className="soc-card-header">
                          <span className="soc-card-title">Active Alerts</span>
                          <div className="filter-bar">
                            <select value={alertSeverity} onChange={(e) => setAlertSeverity(e.target.value)}>
                              <option value="">All Severity</option>
                              <option value="critical">Critical</option>
                              <option value="high">High</option>
                              <option value="medium">Medium</option>
                              <option value="low">Low</option>
                            </select>
                          </div>
                        </div>
                        <div className="alert-feed alert-feed-tall">
                          {(alerts?.alerts || []).map((a) => (
                            <div key={a.id} className="alert-item" onClick={() => a.user_id && handleInspect(a.user_id)}>
                              <div className={`alert-severity-dot ${a.severity}`} />
                              <div className="alert-content">
                                <div className="alert-title">{a.title}</div>
                                <div className="alert-message">{a.message}</div>
                                <div className="alert-meta">
                                  <span>{a.alert_type.replace(/_/g, ' ')}</span>
                                  <span>{timeAgo(a.timestamp)}</span>
                                  {a.user_email && <span>{a.user_email}</span>}
                                </div>
                              </div>
                              {a.risk_score != null && (
                                <span className={`alert-risk-badge ${rl(a.risk_score)}`}>{a.risk_score}</span>
                              )}
                            </div>
                          ))}
                          {(!alerts || alerts.alerts.length === 0) && (
                            <div className="empty-state"><div className="empty-state-icon">✓</div><div className="empty-state-text">No active alerts</div></div>
                          )}
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">High Risk Users</span></div>
                        <div className="soc-card-body" style={{ padding: 0 }}>
                          {(highRiskUsers?.users || []).map((u) => (
                            <div key={u.id} className="alert-item" onClick={() => handleInspect(u.id)}>
                              <div className={`alert-severity-dot ${rl(u.risk_score)}`} />
                              <div className="alert-content">
                                <div className="alert-title">{u.first_name} {u.last_name}</div>
                                <div className="alert-message">{u.email}</div>
                                <div className="alert-meta">
                                  <span>Trust: {u.trust_level}</span>
                                  <span>{u.status}</span>
                                </div>
                              </div>
                              <span className={`alert-risk-badge ${rl(u.risk_score)}`}>{u.risk_score}</span>
                            </div>
                          ))}
                          {(!highRiskUsers || highRiskUsers.users.length === 0) && (
                            <div className="empty-state"><div className="empty-state-icon">✓</div><div className="empty-state-text">No high-risk users</div></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {alerts && Object.keys(alerts.categories).length > 0 && (
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Alert Categories</span></div>
                        <div className="soc-card-body">
                          <div className="category-chips">
                            {Object.entries(alerts.categories).map(([c, n]) => (
                              <div key={c} className="category-chip">
                                <span className="chip-label">{c.replace(/_/g, ' ')}</span>
                                <span className="chip-count">{n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                    INVESTIGATIONS — List
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'investigations' && !caseDetail && (
                  <>
                    <div className="section-toolbar">
                      <div className="filter-bar">
                        <select value={invStatus} onChange={(e) => setInvStatus(e.target.value)}>
                          <option value="">All Status</option>
                          <option value="open">Open</option>
                          <option value="monitoring">Monitoring</option>
                          <option value="escalated">Escalated</option>
                          <option value="closed">Closed</option>
                        </select>
                        <select value={invSeverity} onChange={(e) => setInvSeverity(e.target.value)}>
                          <option value="">All Severity</option>
                          <option value="critical">Critical</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                      </div>
                      <button className="btn btn-primary" onClick={() => setShowNewCase(true)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Investigation
                      </button>
                    </div>

                    <div className="soc-card">
                      <div className="soc-card-body" style={{ padding: 0, overflow: 'auto' }}>
                        <table className="inv-table">
                          <thead>
                            <tr>
                              <th>Case ID</th>
                              <th>Subject</th>
                              <th>Risk</th>
                              <th>Severity</th>
                              <th>Status</th>
                              <th>Reason</th>
                              <th>Notes</th>
                              <th>Created</th>
                            </tr>
                          </thead>
                          <tbody>
                            {investigations?.investigations?.length > 0 ? (
                              investigations.investigations.map((inv: any) => (
                                <tr key={inv.id} onClick={() => handleOpenCase(inv.id)}>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{inv.id.slice(0, 8)}...</td>
                                  <td>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.subject_name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{inv.subject_email}</div>
                                  </td>
                                  <td><span className={`badge badge-${rl(inv.subject_risk_score)}`}>{inv.subject_risk_score}</span></td>
                                  <td><span className={`badge badge-${inv.severity}`}>{inv.severity}</span></td>
                                  <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                                  <td style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inv.reason}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.notes_count}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{timeAgo(inv.created_at)}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={8}>
                                  <div className="empty-state"><div className="empty-state-icon">📋</div><div className="empty-state-text">No investigations found</div></div>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════ Case Detail ════════════ */}
                {nav === 'investigations' && caseDetail && (
                  <>
                    <button className="btn btn-ghost" onClick={() => setCaseDetail(null)} style={{ marginBottom: 16 }}>
                      ← Back to Investigations
                    </button>

                    <div className="inspect-header">
                      <div className="inspect-avatar" style={{ background: 'var(--accent-blue)' }}>
                        {caseDetail.subject?.first_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="inspect-name">{caseDetail.subject?.first_name} {caseDetail.subject?.last_name}</div>
                        <div className="inspect-email">{caseDetail.subject?.email} · Risk: {caseDetail.risk_context?.risk_score || 0}</div>
                      </div>
                      <div className="inspect-badges">
                        <span className={`badge badge-${caseDetail.investigation.severity}`}>{caseDetail.investigation.severity}</span>
                        <span className={`badge badge-${caseDetail.investigation.status}`}>{caseDetail.investigation.status}</span>
                      </div>
                    </div>

                    <div className="soc-grid soc-grid-2" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Case Details</span></div>
                        <div className="soc-card-body">
                          <div className="stat-list">
                            <div className="stat-row"><span className="stat-label">Case ID</span><span className="stat-value">{caseDetail.investigation.id.slice(0, 12)}...</span></div>
                            <div className="stat-row"><span className="stat-label">Opened</span><span className="stat-value">{timeAgo(caseDetail.investigation.created_at)}</span></div>
                            <div className="stat-row"><span className="stat-label">Analyst</span><span className="stat-value">{caseDetail.analyst?.first_name} {caseDetail.analyst?.last_name}</span></div>
                            <div className="stat-row"><span className="stat-label">Trust Level</span><span className="stat-value">{caseDetail.risk_context?.trust_level || '—'}</span></div>
                          </div>
                          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Reason:</strong> {caseDetail.investigation.reason}
                          </div>
                          {caseDetail.investigation.summary && (
                            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>Summary:</strong> {caseDetail.investigation.summary}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Actions</span></div>
                        <div className="soc-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {caseDetail.investigation.status !== 'closed' && (
                            <>
                              <button className="btn btn-primary btn-sm" onClick={() => setShowNoteForm(true)}>Add Note</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setShowRecForm(true)}>Recommend Action</button>
                              <button className="btn btn-secondary btn-sm" onClick={() => handleUpdateStatus('monitoring')}>Set Monitoring</button>
                              <button className="btn btn-secondary btn-sm" style={{ borderColor: 'var(--severity-high)', color: 'var(--severity-high)' }} onClick={() => handleUpdateStatus('escalated')}>Escalate</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { const s = prompt('Enter closing summary:'); if (s) handleUpdateStatus('closed', s); }}>Close Case</button>
                            </>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => handleInspect(caseDetail.investigation.user_id)}>Inspect User →</button>
                        </div>
                      </div>
                    </div>

                    {caseDetail.risk_context?.risk_breakdown && (
                      <div className="soc-card" style={{ marginBottom: 20 }}>
                        <div className="soc-card-header"><span className="soc-card-title">Risk Breakdown</span></div>
                        <div className="soc-card-body">
                          <div className="risk-breakdown">
                            {Object.entries(caseDetail.risk_context.risk_breakdown).map(([d, v]: [string, any]) => {
                              const n = Number(v) || 0;
                              return (
                                <div key={d} className="risk-dimension">
                                  <span className="risk-dimension-label">{d}</span>
                                  <div className="risk-dimension-bar"><div className={`risk-dimension-fill ${rl(n)}`} style={{ width: `${n}%` }} /></div>
                                  <span className="risk-dimension-value">{n}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    <div className="soc-card" style={{ marginBottom: 20 }}>
                      <div className="soc-card-header"><span className="soc-card-title">Investigation Notes ({caseDetail.notes.length})</span></div>
                      <div className="soc-card-body">
                        {caseDetail.notes.length > 0 ? (
                          <div className="note-thread">
                            {caseDetail.notes.map((n: any) => (
                              <div key={n.id} className="note-item">
                                <div className="note-header">
                                  <span className="note-author">{n.analyst_name}</span>
                                  <span className={`note-type ${n.note_type}`}>{n.note_type}</span>
                                  <span className="note-time">{timeAgo(n.created_at)}</span>
                                </div>
                                <div className="note-body">{n.note}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="empty-state"><div className="empty-state-text">No notes yet</div></div>
                        )}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="soc-card">
                      <div className="soc-card-header"><span className="soc-card-title">Recommendations ({caseDetail.recommendations.length})</span></div>
                      <div className="soc-card-body" style={{ padding: 0 }}>
                        {caseDetail.recommendations.length > 0 ? (
                          <table className="inv-table">
                            <thead><tr><th>Action</th><th>Analyst</th><th>Status</th><th>Justification</th><th>Submitted</th></tr></thead>
                            <tbody>
                              {caseDetail.recommendations.map((r: any) => (
                                <tr key={r.id} style={{ cursor: 'default' }}>
                                  <td><span className="badge badge-info" style={{ textTransform: 'capitalize' }}>{r.action.replace(/_/g, ' ')}</span></td>
                                  <td>{r.analyst_name}</td>
                                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                                  <td style={{ maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.justification}</td>
                                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{timeAgo(r.created_at)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="empty-state"><div className="empty-state-text">No recommendations yet</div></div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                    RISK INSIGHTS
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'insights' && insights && (
                  <>
                    <div className="kpi-row">
                      <div className="kpi-card"><span className="kpi-label">Avg Risk Score</span><span className={`kpi-value ${rl(insights.avg_risk_score)}`}><AnimCounter val={insights.avg_risk_score} /></span></div>
                      <div className="kpi-card"><span className="kpi-label">High Risk Users</span><span className="kpi-value critical"><AnimCounter val={insights.high_risk_users_count} /></span></div>
                      <div className="kpi-card"><span className="kpi-label">Open Investigations</span><span className="kpi-value info"><AnimCounter val={insights.open_investigations} /></span></div>
                      <div className="kpi-card"><span className="kpi-label">Pending Actions</span><span className="kpi-value medium"><AnimCounter val={insights.pending_recommendations} /></span></div>
                    </div>

                    <div className="soc-grid soc-grid-2" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Risk Distribution</span></div>
                        <div className="soc-card-body">
                          <div className="chart-wrapper" style={{ height: 260 }}>
                            <ResponsiveContainer>
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Low', value: insights.risk_distribution.low },
                                    { name: 'Medium', value: insights.risk_distribution.medium },
                                    { name: 'High', value: insights.risk_distribution.high },
                                    { name: 'Critical', value: insights.risk_distribution.critical },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={55}
                                  outerRadius={85}
                                  paddingAngle={4}
                                  dataKey="value"
                                  stroke="none"
                                >
                                  {SEV_COLORS.map((c, i) => (
                                    <Cell key={i} fill={c} />
                                  ))}
                                </Pie>
                                <Tooltip {...TT} />
                                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Top Risk Organizations</span></div>
                        <div className="soc-card-body">
                          {insights.top_risk_orgs.length > 0 ? (
                            <div className="chart-wrapper" style={{ height: 260 }}>
                              <ResponsiveContainer>
                                <BarChart data={insights.top_risk_orgs.slice(0, 6)} layout="vertical">
                                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                  <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} />
                                  <YAxis type="category" dataKey="org_name" width={100} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                  <Tooltip {...TT} />
                                  <Bar dataKey="avg_risk_score" fill="#f97316" radius={[0, 4, 4, 0]} />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No organization data</div></div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="soc-grid soc-grid-2">
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Investigation Severity</span></div>
                        <div className="soc-card-body">
                          <div className="risk-breakdown">
                            {['critical', 'high', 'medium', 'low'].map((s) => {
                              const total = Math.max(
                                Object.values(insights.severity_breakdown).reduce((a: number, b: any) => a + Number(b), 0) as number,
                                1
                              );
                              return (
                                <div key={s} className="risk-dimension">
                                  <span className="risk-dimension-label">{s}</span>
                                  <div className="risk-dimension-bar">
                                    <div
                                      className={`risk-dimension-fill ${s}`}
                                      style={{ width: `${Math.min(((insights.severity_breakdown[s] || 0) / total) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="risk-dimension-value">{insights.severity_breakdown[s] || 0}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Recent Risk Decisions</span></div>
                        <div className="soc-card-body" style={{ padding: 0 }}>
                          {insights.recent_patterns.length > 0 ? (
                            insights.recent_patterns.map((p: any, i: number) => (
                              <div key={i} className="alert-item" style={{ cursor: 'default' }}>
                                <div className={`alert-severity-dot ${p.risk_level}`} />
                                <div className="alert-content">
                                  <div className="alert-title">{p.event_type}</div>
                                  <div className="alert-message">Decision: {p.decision} · Level: {p.risk_level}</div>
                                  <div className="alert-meta">
                                    <span>{timeAgo(p.timestamp)}</span>
                                    {p.rules_triggered?.length > 0 && <span>{p.rules_triggered.length} rules</span>}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No recent decisions</div></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                    SEARCH
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'search' && (
                  <>
                    <div className="soc-card search-box-card">
                      <div className="soc-card-body">
                        <div className="search-input-wrap">
                          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                          </svg>
                          <input
                            className="search-input"
                            placeholder="Search users, investigations, organizations..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                          />
                          {searchQuery && (
                            <button className="search-clear" onClick={() => { setSearchQuery(''); setSearchResults([]); }}>✕</button>
                          )}
                        </div>
                      </div>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="soc-card" style={{ marginTop: 16 }}>
                        <div className="soc-card-header"><span className="soc-card-title">Results ({searchResults.length})</span></div>
                        <div className="soc-card-body" style={{ padding: 0 }}>
                          {searchResults.map((r) => (
                            <div
                              key={r.id}
                              className="alert-item"
                              onClick={() => {
                                if (r.result_type === 'user') handleInspect(r.id);
                                else if (r.result_type === 'investigation') { switchNav('investigations'); handleOpenCase(r.id); }
                                else if (r.result_type === 'organization') handleInspectOrg(r.id);
                              }}
                            >
                              <div className={`result-type-dot ${r.result_type}`} />
                              <div className="alert-content">
                                <div className="alert-title">{r.title}</div>
                                <div className="alert-message">{r.subtitle}</div>
                                <div className="alert-meta">
                                  <span style={{ textTransform: 'capitalize' }}>{r.result_type}</span>
                                  {r.status && <span>{r.status}</span>}
                                </div>
                              </div>
                              {r.risk_score != null && (
                                <span className={`alert-risk-badge ${rl(r.risk_score)}`}>{r.risk_score}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                    USER INSPECTION
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'inspect' && inspectData && (
                  <>
                    <div className="inspect-header">
                      <div className="inspect-avatar">{inspectData.user?.first_name?.charAt(0) || '?'}</div>
                      <div>
                        <div className="inspect-name">{inspectData.user?.first_name} {inspectData.user?.last_name}</div>
                        <div className="inspect-email">{inspectData.user?.email} · {inspectData.user?.role} · org: {inspectData.user?.org_id || '—'}</div>
                      </div>
                      <div className="inspect-badges">
                        <span className={`badge badge-${rl(inspectData.risk?.risk_score || 0)}`}>Risk: {inspectData.risk?.risk_score || 0}</span>
                        <span className={`badge badge-${inspectData.user?.is_active ? 'low' : 'critical'}`}>
                          {inspectData.user?.is_active ? 'Active' : 'Disabled'}
                        </span>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setNewCase({ user_id: inspectData.user.id, severity: rl(inspectData.risk?.risk_score || 0), reason: '' });
                            setShowNewCase(true);
                          }}
                        >
                          Open Investigation
                        </button>
                      </div>
                    </div>

                    {/* Gauge + KPI strip */}
                    <div className="inspect-gauge-row">
                      <div className="soc-card gauge-card">
                        <div className="soc-card-body gauge-center">
                          <ThreatGauge value={inspectData.risk?.risk_score || 0} label="Risk Score" size={160} />
                        </div>
                      </div>
                      <div className="kpi-card"><span className="kpi-label">Trust Level</span><span className="kpi-value cyan">{(inspectData.risk?.trust_level || 'unknown').replace('_', ' ')}</span></div>
                      <div className="kpi-card"><span className="kpi-label">Sessions</span><span className="kpi-value info">{inspectData.sessions?.length || 0}</span></div>
                      <div className="kpi-card"><span className="kpi-label">Open Cases</span><span className="kpi-value purple">{inspectData.investigations?.filter((i: any) => i.status !== 'closed').length || 0}</span></div>
                      <div className="kpi-card"><span className="kpi-label">Devices</span><span className="kpi-value medium">{inspectData.devices?.length || 0}</span></div>
                    </div>

                    <div className="soc-grid soc-grid-2" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Risk Breakdown</span></div>
                        <div className="soc-card-body">
                          <div className="risk-breakdown">
                            {inspectData.risk?.risk_breakdown &&
                              Object.entries(inspectData.risk.risk_breakdown).map(([d, v]: [string, any]) => {
                                const n = Number(v) || 0;
                                return (
                                  <div key={d} className="risk-dimension">
                                    <span className="risk-dimension-label">{d}</span>
                                    <div className="risk-dimension-bar"><div className={`risk-dimension-fill ${rl(n)}`} style={{ width: `${n}%` }} /></div>
                                    <span className="risk-dimension-value">{n}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">User Profile</span></div>
                        <div className="soc-card-body">
                          <div className="stat-list">
                            {([
                              ['ID', (inspectData.user?.id?.slice(0, 16) || '') + '...'],
                              ['Status', inspectData.user?.status],
                              ['MFA', inspectData.user?.mfa_enabled ? 'Enabled' : 'Disabled'],
                              ['Email Verified', inspectData.user?.email_verified ? 'Yes' : 'No'],
                              ['Phone', (inspectData.user?.phone || '—') + (inspectData.user?.phone_verified ? ' ✓' : '')],
                              ['Last Login', inspectData.user?.last_login_at ? timeAgo(inspectData.user.last_login_at) : '—'],
                              ['Last IP', inspectData.user?.last_login_ip || '—'],
                              ['Created', inspectData.user?.created_at ? timeAgo(inspectData.user.created_at) : '—'],
                            ] as [string, string][]).map(([l, v]) => (
                              <div key={l} className="stat-row"><span className="stat-label">{l}</span><span className="stat-value">{v}</span></div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Activity + Login History */}
                    <div className="soc-grid soc-grid-2" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Activity Timeline ({inspectData.activity_timeline?.length || 0})</span></div>
                        <div className="soc-card-body" style={{ maxHeight: 360, overflowY: 'auto' }}>
                          {inspectData.activity_timeline?.length > 0 ? (
                            <div className="timeline">
                              {inspectData.activity_timeline.slice(0, 20).map((e: any) => (
                                <div key={e.id} className={`timeline-item ${e.severity}`}>
                                  <div className="timeline-action">{e.action}</div>
                                  {e.detail && <div className="timeline-detail">{e.detail}</div>}
                                  <div className="timeline-time">{timeAgo(e.timestamp)}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No activity recorded</div></div>
                          )}
                        </div>
                      </div>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Login History ({inspectData.login_history?.length || 0})</span></div>
                        <div className="soc-card-body" style={{ padding: 0, maxHeight: 360, overflowY: 'auto' }}>
                          {inspectData.login_history?.length > 0 ? (
                            inspectData.login_history.slice(0, 30).map((l: any) => (
                              <div key={l.id} className="alert-item" style={{ cursor: 'default' }}>
                                <div className={`alert-severity-dot ${l.success ? 'low' : 'critical'}`} />
                                <div className="alert-content">
                                  <div className="alert-title">{l.success ? 'Login Success' : 'Login Failed'}</div>
                                  <div className="alert-meta"><span>{l.ip_address || '—'}</span><span>{timeAgo(l.timestamp)}</span></div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No login data</div></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Devices + Loans */}
                    <div className="soc-grid soc-grid-2" style={{ marginBottom: 20 }}>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Devices ({inspectData.devices?.length || 0})</span></div>
                        <div className="soc-card-body" style={{ padding: 0, maxHeight: 280, overflowY: 'auto' }}>
                          {inspectData.devices?.length > 0 ? (
                            inspectData.devices.map((d: any) => (
                              <div key={d.id} className="alert-item" style={{ cursor: 'default' }}>
                                <div className={`alert-severity-dot ${d.is_trusted ? 'low' : 'medium'}`} />
                                <div className="alert-content">
                                  <div className="alert-title" style={{ fontSize: 12 }}>{d.user_agent?.substring(0, 60) || 'Unknown Device'}</div>
                                  <div className="alert-meta"><span>{d.timezone || '—'}</span><span>{d.usage_count} uses</span><span>{d.is_trusted ? 'Trusted' : 'Untrusted'}</span></div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No device data</div></div>
                          )}
                        </div>
                      </div>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Loans ({inspectData.loans?.length || 0})</span></div>
                        <div className="soc-card-body" style={{ padding: 0, maxHeight: 280, overflowY: 'auto' }}>
                          {inspectData.loans?.length > 0 ? (
                            inspectData.loans.map((l: any) => (
                              <div key={l.id} className="alert-item" style={{ cursor: 'default' }}>
                                <div className={`alert-severity-dot ${l.status === 'defaulted' ? 'critical' : l.status === 'active' ? 'low' : 'medium'}`} />
                                <div className="alert-content">
                                  <div className="alert-title">${l.principal?.toLocaleString()} · {l.status}</div>
                                  <div className="alert-meta"><span>Outstanding: ${l.outstanding?.toLocaleString()}</span><span>Rate: {l.interest_rate}%</span></div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No loans</div></div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Previous Investigations + Security Alerts */}
                    <div className="soc-grid soc-grid-2">
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Previous Investigations ({inspectData.investigations?.length || 0})</span></div>
                        <div className="soc-card-body" style={{ padding: 0 }}>
                          {inspectData.investigations?.length > 0 ? (
                            inspectData.investigations.map((inv: any) => (
                              <div key={inv.id} className="alert-item" onClick={() => { handleOpenCase(inv.id); switchNav('investigations'); }}>
                                <div className={`alert-severity-dot ${inv.severity}`} />
                                <div className="alert-content">
                                  <div className="alert-title">{inv.id.slice(0, 8)}... · {inv.status}</div>
                                  <div className="alert-message">{inv.reason?.substring(0, 80)}</div>
                                  <div className="alert-meta"><span>{inv.severity}</span><span>{timeAgo(inv.created_at)}</span></div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No prior investigations</div></div>
                          )}
                        </div>
                      </div>
                      <div className="soc-card">
                        <div className="soc-card-header"><span className="soc-card-title">Security Alerts ({inspectData.alerts?.length || 0})</span></div>
                        <div className="soc-card-body" style={{ padding: 0 }}>
                          {inspectData.alerts?.length > 0 ? (
                            inspectData.alerts.map((a: any) => (
                              <div key={a.id} className="alert-item" style={{ cursor: 'default' }}>
                                <div className={`alert-severity-dot ${a.severity}`} />
                                <div className="alert-content">
                                  <div className="alert-title">{a.title}</div>
                                  <div className="alert-message">{a.message}</div>
                                  <div className="alert-meta"><span>{a.alert_type}</span><span>{timeAgo(a.created_at)}</span><span>{a.is_read ? 'Read' : 'Unread'}</span></div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="empty-state"><div className="empty-state-text">No security alerts</div></div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* ════════════════════════════════════════════════════════════
                    ORGANIZATION INSPECTION
                    ════════════════════════════════════════════════════════════ */}
                {nav === 'org-inspect' && orgDetail && (() => {
                  // Client-side filter logic for org users
                  const q = orgUserSearch.toLowerCase();
                  const filtered = orgDetail.users.filter((u) => {
                    if (q && !(`${u.first_name} ${u.last_name}`.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))) return false;
                    if (orgFilterRole && u.role !== orgFilterRole) return false;
                    if (orgFilterStatus === 'active' && !u.is_active) return false;
                    if (orgFilterStatus === 'disabled' && u.is_active) return false;
                    if (orgFilterRisk === 'critical' && u.risk_score < 80) return false;
                    if (orgFilterRisk === 'high' && (u.risk_score < 60 || u.risk_score >= 80)) return false;
                    if (orgFilterRisk === 'medium' && (u.risk_score < 30 || u.risk_score >= 60)) return false;
                    if (orgFilterRisk === 'low' && u.risk_score >= 30) return false;
                    if (orgFilterTrust && (u.trust_level || 'unknown') !== orgFilterTrust) return false;
                    return true;
                  });

                  // Collect unique values for filter dropdowns
                  const roles = Array.from(new Set(orgDetail.users.map(u => u.role).filter(Boolean)));
                  const trusts = Array.from(new Set(orgDetail.users.map(u => u.trust_level || 'unknown')));

                  return (
                  <>
                    {/* Header */}
                    <div className="inspect-header">
                      <div className="inspect-avatar" style={{ background: '#3b82f6' }}>
                        {orgDetail.organization.name?.charAt(0)?.toUpperCase() || 'O'}
                      </div>
                      <div>
                        <div className="inspect-name">{orgDetail.organization.name}</div>
                        <div className="inspect-email">Organization · ID: {orgDetail.organization.id}</div>
                      </div>
                      <div className="inspect-badges">
                        <span className={`badge badge-${rl(orgDetail.stats.avg_risk_score)}`}>
                          Avg Risk: {orgDetail.stats.avg_risk_score}
                        </span>
                        <span className="badge badge-info">
                          {orgDetail.stats.total_users} Members
                        </span>
                      </div>
                    </div>

                    {/* KPI strip */}
                    <div className="inspect-gauge-row">
                      <div className="soc-card gauge-card">
                        <div className="soc-card-body gauge-center">
                          <ThreatGauge value={orgDetail.stats.avg_risk_score} label="Avg Risk" size={160} />
                        </div>
                      </div>
                      <div className="kpi-card">
                        <span className="kpi-label">Total Users</span>
                        <span className="kpi-value info">{orgDetail.stats.total_users}</span>
                      </div>
                      <div className="kpi-card">
                        <span className="kpi-label">Active Users</span>
                        <span className="kpi-value cyan">{orgDetail.stats.active_users}</span>
                      </div>
                      <div className="kpi-card">
                        <span className="kpi-label">High Risk</span>
                        <span className="kpi-value" style={{ color: orgDetail.stats.high_risk_users > 0 ? '#dc2626' : '#10b981' }}>
                          {orgDetail.stats.high_risk_users}
                        </span>
                      </div>
                      <div className="kpi-card">
                        <span className="kpi-label">Open Cases</span>
                        <span className="kpi-value purple">{orgDetail.stats.open_investigations}</span>
                      </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="soc-card" style={{ marginTop: 16 }}>
                      <div className="soc-card-body" style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                          {/* Search input */}
                          <div style={{ position: 'relative', flex: '1 1 260px', minWidth: 200 }}>
                            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#64748b' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="11" cy="11" r="8" />
                              <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                              style={{ width: '100%', padding: '8px 12px 8px 34px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#e2e8f0', fontSize: 13, outline: 'none' }}
                              placeholder="Search users by name or email..."
                              value={orgUserSearch}
                              onChange={(e) => setOrgUserSearch(e.target.value)}
                            />
                          </div>

                          {/* Role filter */}
                          <select
                            value={orgFilterRole}
                            onChange={(e) => setOrgFilterRole(e.target.value)}
                            style={{ padding: '8px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}
                          >
                            <option value="">All Roles</option>
                            {roles.map(r => <option key={r} value={r} style={{ textTransform: 'capitalize' }}>{r}</option>)}
                          </select>

                          {/* Status filter */}
                          <select
                            value={orgFilterStatus}
                            onChange={(e) => setOrgFilterStatus(e.target.value)}
                            style={{ padding: '8px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}
                          >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="disabled">Disabled</option>
                          </select>

                          {/* Risk filter */}
                          <select
                            value={orgFilterRisk}
                            onChange={(e) => setOrgFilterRisk(e.target.value)}
                            style={{ padding: '8px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}
                          >
                            <option value="">All Risk Levels</option>
                            <option value="critical">Critical (80+)</option>
                            <option value="high">High (60-79)</option>
                            <option value="medium">Medium (30-59)</option>
                            <option value="low">Low (&lt;30)</option>
                          </select>

                          {/* Trust filter */}
                          <select
                            value={orgFilterTrust}
                            onChange={(e) => setOrgFilterTrust(e.target.value)}
                            style={{ padding: '8px 10px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 6, color: '#94a3b8', fontSize: 12 }}
                          >
                            <option value="">All Trust Levels</option>
                            {trusts.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</option>)}
                          </select>

                          {/* Result count */}
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 'auto' }}>
                            Showing {filtered.length} of {orgDetail.users.length} users
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Users table */}
                    <div className="soc-card" style={{ marginTop: 8 }}>
                      <div className="soc-card-header">
                        <span className="soc-card-title">Organization Members</span>
                      </div>
                      <div className="soc-card-body" style={{ padding: 0 }}>
                        <table className="soc-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #1e293b' }}>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>User</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Role</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Risk</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Status</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Trust</th>
                              <th style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Last Login</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.length > 0 ? (
                              filtered.map((u) => (
                                <tr
                                  key={u.id}
                                  style={{ borderTop: '1px solid #1e293b', cursor: 'pointer', transition: 'background 0.15s' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(59,130,246,0.06)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  onClick={() => handleInspect(u.id)}
                                >
                                  <td style={{ padding: '10px 14px' }}>
                                    <div>
                                      <div style={{ color: '#60a5fa', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                        {u.first_name} {u.last_name}
                                      </div>
                                      <div style={{ color: '#64748b', fontSize: 11 }}>{u.email}</div>
                                    </div>
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' }}>{u.role}</td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <span className={`alert-risk-badge ${rl(u.risk_score)}`}>{u.risk_score}</span>
                                  </td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <span className={`badge badge-${u.is_active ? 'low' : 'critical'}`} style={{ fontSize: 11 }}>
                                      {u.status || (u.is_active ? 'active' : 'disabled')}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' }}>
                                    {(u.trust_level || 'unknown').replace('_', ' ')}
                                  </td>
                                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#64748b' }}>
                                    {u.last_login_at ? timeAgo(u.last_login_at) : '—'}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                                  {orgUserSearch || orgFilterRole || orgFilterStatus || orgFilterRisk || orgFilterTrust
                                    ? 'No users match your search criteria'
                                    : 'No users found in this organization'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                  );
                })()}

              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          MODALS
          ════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNewCase && (
          <motion.div className="modal-backdrop" onClick={() => setShowNewCase(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}>
              <div className="modal-header"><h3>Open New Investigation</h3><button className="modal-close" onClick={() => setShowNewCase(false)}>×</button></div>
              <div className="modal-body">
                <div className="soc-form">
                  <div className="form-group"><label>Subject User ID</label><input value={newCase.user_id} onChange={(e) => setNewCase({ ...newCase, user_id: e.target.value })} placeholder="User ID" /></div>
                  <div className="form-group"><label>Severity</label>
                    <select value={newCase.severity} onChange={(e) => setNewCase({ ...newCase, severity: e.target.value })}>
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Reason</label><textarea value={newCase.reason} onChange={(e) => setNewCase({ ...newCase, reason: e.target.value })} placeholder="Describe the reason for opening this investigation..." rows={4} /></div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowNewCase(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreateCase} disabled={!newCase.user_id || !newCase.reason}>Open Case</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNoteForm && (
          <motion.div className="modal-backdrop" onClick={() => setShowNoteForm(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}>
              <div className="modal-header"><h3>Add Investigation Note</h3><button className="modal-close" onClick={() => setShowNoteForm(false)}>×</button></div>
              <div className="modal-body">
                <div className="soc-form">
                  <div className="form-group"><label>Note Type</label>
                    <select value={noteForm.note_type} onChange={(e) => setNoteForm({ ...noteForm, note_type: e.target.value })}>
                      <option value="observation">Observation</option><option value="evidence">Evidence</option><option value="conclusion">Conclusion</option><option value="escalation">Escalation</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Note</label><textarea value={noteForm.note} onChange={(e) => setNoteForm({ ...noteForm, note: e.target.value })} placeholder="Enter your analyst note..." rows={5} /></div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowNoteForm(false)}>Cancel</button><button className="btn btn-primary" onClick={handleAddNote} disabled={!noteForm.note}>Add Note</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRecForm && (
          <motion.div className="modal-backdrop" onClick={() => setShowRecForm(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal-content" onClick={(e) => e.stopPropagation()} initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }} transition={{ type: 'spring', damping: 25 }}>
              <div className="modal-header"><h3>Recommend Enforcement Action</h3><button className="modal-close" onClick={() => setShowRecForm(false)}>×</button></div>
              <div className="modal-body">
                <div className="soc-form">
                  <div className="form-group"><label>Recommended Action</label>
                    <select value={recForm.action} onChange={(e) => setRecForm({ ...recForm, action: e.target.value })}>
                      <option value="monitor">Monitor</option><option value="restrict">Restrict Account</option><option value="lock">Lock Account</option>
                      <option value="step_up_auth">Step-Up Authentication</option><option value="freeze_loan">Freeze Loan</option><option value="escalate">Escalate to Admin</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Justification</label><textarea value={recForm.justification} onChange={(e) => setRecForm({ ...recForm, justification: e.target.value })} placeholder="Provide justification for this recommendation..." rows={5} /></div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowRecForm(false)}>Cancel</button><button className="btn btn-primary" onClick={handleRecommend} disabled={!recForm.justification}>Submit Recommendation</button></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
