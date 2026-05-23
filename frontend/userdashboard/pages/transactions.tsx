import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useUser } from '../src/context/UserContext';
import { getTransactions } from '../src/services/api';

function TransactionsContent() {
  const { token, isReady, isProfileLoading } = useUser();
  const router = useRouter();
  const didFetchRef = useRef(false);
  const [items, setItems] = useState<any[]>([]);
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
    getTransactions(token)
      .then((d) => setItems(d.transactions || []))
      .catch(() => setError('Could not load transactions'))
      .finally(() => setLoading(false));
  }, [token, router, isReady, isProfileLoading]);

  if (loading) return <p className="p-8">Loading transactions...</p>;
  if (error) return <p className="p-8">{error}</p>;

  return (
    <div className="min-h-screen bg-sunrise p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink-900">Transactions</h1>
          <Link href="/dashboard" className="text-sm text-ink-600 underline">Back to dashboard</Link>
        </div>
        <div className="rounded-2xl border border-ink-200 bg-white/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-left text-ink-600">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-t border-ink-100">
                  <td className="px-4 py-3 capitalize">{t.type}</td>
                  <td className="px-4 py-3">Ksh.{Number(t.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{t.risk_score}</td>
                  <td className="px-4 py-3">{t.status}</td>
                  <td className="px-4 py-3 text-ink-500">{(t.created_at || '').slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-6 text-ink-500">No transactions recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <ProtectedRoute>
      <TransactionsContent />
    </ProtectedRoute>
  );
}
