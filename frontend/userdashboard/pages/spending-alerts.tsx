import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useUser } from '../src/context/UserContext';
import { getSpendingThresholds, updateSpendingThresholds } from '../src/services/api';

function SpendingAlertsContent() {
  const { token, isReady, isProfileLoading } = useUser();
  const router = useRouter();
  const didFetchRef = useRef(false);
  const [daily, setDaily] = useState('');
  const [weekly, setWeekly] = useState('');
  const [monthly, setMonthly] = useState('');
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isReady || isProfileLoading) return;
    if (!token) {
      router.push('/');
      return;
    }
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    setLoading(true);
    setError('');
    getSpendingThresholds(token)
      .then((d) => {
        setDaily(d.daily_limit != null ? String(d.daily_limit) : '');
        setWeekly(d.weekly_limit != null ? String(d.weekly_limit) : '');
        setMonthly(d.monthly_limit != null ? String(d.monthly_limit) : '');
        setNotify(d.notify !== false);
      })
      .catch(() => setError('Could not load spending alert settings'))
      .finally(() => setLoading(false));
  }, [token, router, isReady, isProfileLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await updateSpendingThresholds(
        {
          daily_limit: daily ? parseFloat(daily) : undefined,
          weekly_limit: weekly ? parseFloat(weekly) : undefined,
          monthly_limit: monthly ? parseFloat(monthly) : undefined,
          notify,
        },
        token
      );
      setMsg('Spending alert settings saved');
    } catch {
      setMsg('Failed to save settings');
    }
  };

  if (loading) return <p className="p-8">Loading...</p>;
  if (error) return <p className="p-8">{error}</p>;

  return (
    <div className="min-h-screen bg-sunrise p-6">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink-900">Spending alerts</h1>
          <Link href="/dashboard" className="text-sm text-ink-600 underline">Back</Link>
        </div>
        <form onSubmit={handleSave} className="rounded-2xl border border-ink-200 bg-white/80 p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-600">Daily limit (Ksh)</label>
            <input type="number" className="w-full mt-1 rounded-xl border border-ink-200 px-3 py-2 text-sm" value={daily} onChange={(e) => setDaily(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-600">Weekly limit (Ksh)</label>
            <input type="number" className="w-full mt-1 rounded-xl border border-ink-200 px-3 py-2 text-sm" value={weekly} onChange={(e) => setWeekly(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-600">Monthly limit (Ksh)</label>
            <input type="number" className="w-full mt-1 rounded-xl border border-ink-200 px-3 py-2 text-sm" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
            Notify me when limits are exceeded
          </label>
          <button type="submit" className="w-full rounded-xl bg-ink-900 text-white py-2 text-sm font-medium">
            Save settings
          </button>
          {msg && <p className="text-sm text-ink-600">{msg}</p>}
        </form>
      </div>
    </div>
  );
}

export default function SpendingAlertsPage() {
  return (
    <ProtectedRoute>
      <SpendingAlertsContent />
    </ProtectedRoute>
  );
}


