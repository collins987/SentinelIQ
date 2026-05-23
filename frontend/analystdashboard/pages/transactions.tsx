import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useAnalyst } from '../src/context/AnalystContext';
import { getTransactionAnomalies } from '../src/services/api';

function TransactionsAnalystContent() {
  const { token } = useAnalyst();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    getTransactionAnomalies(token).then((d) => setItems(d.anomalies || []));
  }, [token, router]);

  return (
    <div className="min-h-screen bg-graphite-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Transaction anomalies</h1>
          <a href="/dashboard" className="text-sm text-graphite-400 underline">Back to console</a>
        </div>
        <div className="rounded-xl border border-graphite-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-graphite-800 text-graphite-400 text-left">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Risk</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-t border-graphite-800">
                  <td className="px-4 py-3">{row.user_email}</td>
                  <td className="px-4 py-3 capitalize">{row.type}</td>
                  <td className="px-4 py-3">Ksh.{Number(row.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.risk_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-6 text-graphite-500">No anomalies detected.</p>}
        </div>
      </div>
    </div>
  );
}

export default function AnalystTransactionsPage() {
  return (
    <ProtectedRoute allowedRoles={['analyst', 'admin']}>
      <TransactionsAnalystContent />
    </ProtectedRoute>
  );
}

