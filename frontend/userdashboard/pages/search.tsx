import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useUser } from '../src/context/UserContext';
import { getLoans, getTransactions, getAlerts, getSessions, getRiskScores, getProfile } from '../src/services/api';

function simpleMatch(text: string | undefined, q: string) {
  if (!text) return false;
  return text.toLowerCase().includes(q.toLowerCase());
}

function ResultsGroup({ title, items, render }: { title: string; items: any[]; render: (i: any) => JSX.Element }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">{title} ({items.length})</h3>
      <div className="space-y-2">{items.map((it, idx) => <div key={idx}>{render(it)}</div>)}</div>
    </section>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query as { q?: string };
  const { token } = useUser();
  const [loading, setLoading] = useState(false);
  const [loans, setLoans] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!q || !token) return;
    const query = String(q).trim();
    if (!query) return;
    setLoading(true);

    (async () => {
      try {
        // fetch available datasets (best-effort)
        const [loansRes, txRes, alertsRes, sessionsRes, risksRes, profileRes] = await Promise.allSettled([
          getLoans(token),
          getTransactions(token, 100),
          getAlerts(token),
          getSessions(token),
          getRiskScores(token),
          getProfile(token),
        ]);

        const qLower = query.toLowerCase();

        if (loansRes.status === 'fulfilled') {
          const matched = loansRes.value.loans.filter((l: any) => simpleMatch(String(l.id), qLower) || simpleMatch(l.purpose, qLower) || simpleMatch(String(l.principal), qLower));
          setLoans(matched);
        }

        if (txRes.status === 'fulfilled') {
          const matched = txRes.value.transactions?.filter((t: any) => simpleMatch(t.description || t.merchant || t.type, qLower) || simpleMatch(String(t.amount), qLower)) || [];
          setTxs(matched);
        }

        if (alertsRes.status === 'fulfilled') {
          const matched = alertsRes.value.alerts.filter((a: any) => simpleMatch(a.title, qLower) || simpleMatch(a.message, qLower));
          setAlerts(matched);
        }

        if (sessionsRes.status === 'fulfilled') {
          const matched = sessionsRes.value.sessions.filter((s: any) => simpleMatch(s.ip_address, qLower) || simpleMatch(s.user_agent, qLower) || simpleMatch(s.location?.city, qLower));
          setSessions(matched);
        }

        if (risksRes.status === 'fulfilled') {
          const matched = risksRes.value.filter((r: any) => simpleMatch(r.type, qLower) || simpleMatch(String(r.score), qLower));
          setRisks(matched);
        }

        if (profileRes.status === 'fulfilled') setProfile(profileRes.value);
      } catch (err) {
        console.warn('search partial failure', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [q, token]);

  return (
    <ProtectedRoute allowedRoles={["user", "viewer"]}>
      <main className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Search results for "{q}"</h1>
          <div className="text-sm text-slate-500">{loading ? 'Searching…' : 'Results updated'}</div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ResultsGroup title="Loans" items={loans} render={(l) => (
            <div className="rounded-lg border p-3">
              <div className="font-semibold">Loan #{l.id}</div>
              <div className="text-sm text-slate-500">Ksh.{Number(l.principal).toLocaleString()}</div>
            </div>
          )} />

          <ResultsGroup title="Transactions" items={txs} render={(t) => (
            <div className="rounded-lg border p-3">
              <div className="font-semibold">{t.description || t.merchant || t.type}</div>
              <div className="text-sm text-slate-500">Ksh.{Number(t.amount).toLocaleString()}</div>
            </div>
          )} />

          <ResultsGroup title="Alerts" items={alerts} render={(a) => (
            <div className="rounded-lg border p-3">
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm text-slate-500">{a.message}</div>
            </div>
          )} />

          <ResultsGroup title="Sessions" items={sessions} render={(s) => (
            <div className="rounded-lg border p-3">
              <div className="font-semibold">{s.ip_address || s.user_agent}</div>
              <div className="text-sm text-slate-500">Last seen: {s.last_seen_at}</div>
            </div>
          )} />

          <ResultsGroup title="Risk Factors" items={risks} render={(r) => (
            <div className="rounded-lg border p-3">
              <div className="font-semibold">{r.type}</div>
              <div className="text-sm text-slate-500">Score: {r.score}</div>
            </div>
          )} />
        </div>
      </main>
    </ProtectedRoute>
  );
}
