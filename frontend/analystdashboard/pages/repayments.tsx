import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useAnalyst } from '../src/context/AnalystContext';
import { getOverdueRepayments } from '../src/services/api';

function RepaymentsAnalystContent() {
  const { token } = useAnalyst();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    getOverdueRepayments(token).then((d) => setItems(d.items || []));
  }, [token, router]);

  return (
    <div className="min-h-screen bg-graphite-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Overdue repayments</h1>
          <a href="/dashboard" className="text-sm text-graphite-400 underline">Back to console</a>
        </div>
        <div className="rounded-xl border border-graphite-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-graphite-800 text-graphite-400 text-left">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Loan</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Days overdue</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.loan_id} className="border-t border-graphite-800">
                  <td className="px-4 py-3">{row.user_email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{String(row.loan_id).slice(0, 12)}</td>
                  <td className="px-4 py-3">Ksh.{Number(row.outstanding).toLocaleString()}</td>
                  <td className="px-4 py-3">{row.days_overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-6 text-graphite-500">No overdue loans in queue.</p>}
        </div>
      </div>
    </div>
  );
}

export default function AnalystRepaymentsPage() {
  return (
    <ProtectedRoute allowedRoles={['analyst', 'admin']}>
      <RepaymentsAnalystContent />
    </ProtectedRoute>
  );
}


