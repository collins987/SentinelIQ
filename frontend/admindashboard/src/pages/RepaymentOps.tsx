import { useEffect, useState } from 'react';
import {
  useGetOverdueRepaymentsQuery,
  useVerifyRepaymentMutation,
  useFreezeLoanRepaymentsMutation,
} from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ClockIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '../store/hooks';

export default function RepaymentOps() {
  const { token } = useAppSelector((s) => s.auth);
  const { data, isLoading, refetch } = useGetOverdueRepaymentsQuery({ limit: 100 });
  const [verifyRepayment] = useVerifyRepaymentMutation();
  const [freezeLoan] = useFreezeLoanRepaymentsMutation();
  const [pending, setPending] = useState<Array<Record<string, unknown>>>([]);
  const [msg, setMsg] = useState('');

  const loadPending = async () => {
    if (!token) return;
    const res = await fetch('/api/v1/admin/repayments/pending?limit=50', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.detail || 'Failed to load pending repayments');
    }
    setPending(data.items || []);
  };

  useEffect(() => {
    loadPending();
  }, [token]);

  const handleVerify = async (repaymentId: string, approve: boolean) => {
    try {
      await verifyRepayment({ repaymentId, approve }).unwrap();
      setMsg(approve ? 'Repayment approved' : 'Repayment rejected');
      refetch();
      loadPending();
    } catch (err: any) {
      setMsg(err?.data?.detail || 'Verification failed');
    }
  };

  const handleFreeze = async (loanId: string, freeze: boolean) => {
    try {
      await freezeLoan({ loan_id: loanId, freeze, reason: 'Admin repayment ops' }).unwrap();
      setMsg(freeze ? 'Repayments frozen' : 'Repayments unfrozen');
      refetch();
    } catch (err: any) {
      setMsg(err?.data?.detail || 'Freeze action failed');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
          <ClockIcon className="h-7 w-7 text-amber-400" />
          Repayment Operations
        </h1>
        <p className="text-sm text-gray-400 mt-1">Overdue queue, verification, and loan freeze controls.</p>
      </div>
      {msg && <p className="text-sm text-gray-300">{msg}</p>}

      <section className="bg-dashboard-card border border-dashboard-border rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Pending verification</h2>
        <div className="space-y-2">
          {pending.length === 0 && <p className="text-gray-500 text-sm">No pending repayments.</p>}
          {pending.map((p) => (
            <div key={String(p.repayment_id)} className="flex flex-wrap items-center justify-between gap-2 border border-dashboard-border rounded-lg p-3">
              <div className="text-sm text-gray-300">
                <span className="text-white font-medium">{String(p.user_email)}</span> — Ksh.{Number(p.amount).toLocaleString()}
                {p.payment_reference ? ` · ref ${String(p.payment_reference)}` : ''}
              </div>
              <div className="flex gap-2">
                <button type="button" className="px-3 py-1 rounded bg-emerald-600 text-white text-xs" onClick={() => handleVerify(String(p.repayment_id), true)}>Approve</button>
                <button type="button" className="px-3 py-1 rounded bg-red-600 text-white text-xs" onClick={() => handleVerify(String(p.repayment_id), false)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-dashboard-card border border-dashboard-border rounded-xl overflow-hidden">
        <h2 className="text-sm font-semibold text-white p-4 border-b border-dashboard-border">Overdue repayments</h2>
        <table className="w-full text-sm">
          <thead className="bg-dashboard-hover text-gray-400 text-left">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Loan</th>
              <th className="px-4 py-3">Outstanding</th>
              <th className="px-4 py-3">Days overdue</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((row: Record<string, unknown>) => (
              <tr key={String(row.loan_id)} className="border-t border-dashboard-border text-gray-200">
                <td className="px-4 py-3">{String(row.user_email || row.user_id)}</td>
                <td className="px-4 py-3 font-mono text-xs">{String(row.loan_id).slice(0, 12)}…</td>
                <td className="px-4 py-3">Ksh.{Number(row.outstanding).toLocaleString()}</td>
                <td className="px-4 py-3">{String(row.days_overdue)}</td>
                <td className="px-4 py-3">
                  <button type="button" className="text-xs text-amber-400 hover:underline mr-3" onClick={() => handleFreeze(String(row.loan_id), true)}>Freeze</button>
                  <button type="button" className="text-xs text-emerald-400 hover:underline" onClick={() => handleFreeze(String(row.loan_id), false)}>Unfreeze</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
