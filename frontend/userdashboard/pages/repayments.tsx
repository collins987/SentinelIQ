import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useUser } from '../src/context/UserContext';
import { getLoans, getLoanRepayments, getLoanSchedule, LoanInfo } from '../src/services/api';

function RepaymentsContent() {
  const { token, isReady, isProfileLoading } = useUser();
  const router = useRouter();
  const didFetchRef = useRef(false);
  const [loans, setLoans] = useState<LoanInfo[]>([]);
  const [selectedLoan, setSelectedLoan] = useState('');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [repayments, setRepayments] = useState<any[]>([]);
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
    getLoans(token)
      .then((d) => {
        setLoans(d.loans || []);
        if (d.loans?.[0]) setSelectedLoan(d.loans[0].id);
      })
      .catch(() => setError('Could not load loans'))
      .finally(() => setLoading(false));
  }, [token, router, isReady, isProfileLoading]);

  useEffect(() => {
    if (!token || !selectedLoan) return;
    Promise.all([getLoanSchedule(selectedLoan, token), getLoanRepayments(selectedLoan, token)])
      .then(([sched, reps]) => {
        setSchedule(sched.schedule || []);
        setRepayments(reps.repayments || []);
      })
      .catch(() => setError('Could not load repayments'));
  }, [token, selectedLoan]);

  if (loading) return <p className="p-8">Loading repayments...</p>;
  if (error) return <p className="p-8">{error}</p>;

  return (
    <div className="min-h-screen bg-sunrise p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink-900">Repayments</h1>
          <Link href="/dashboard" className="text-sm text-ink-600 underline">Back to dashboard</Link>
        </div>

        <select
          className="rounded-xl border border-ink-200 px-3 py-2 text-sm w-full max-w-md"
          value={selectedLoan}
          onChange={(e) => setSelectedLoan(e.target.value)}
        >
          {loans.map((l) => (
            <option key={l.id} value={l.id}>
              {l.purpose || 'Loan'} — Ksh.{Number(l.outstanding).toLocaleString()} ({l.status})
            </option>
          ))}
        </select>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-ink-200 bg-white/80 p-5">
            <h2 className="font-semibold text-ink-900 mb-3">Repayment schedule</h2>
            <div className="space-y-2 text-sm">
              {schedule.map((s) => (
                <div key={s.id} className="flex justify-between border-b border-ink-100 py-2">
                  <span>#{s.installment_number} · {s.due_date}</span>
                  <span>
                    Ksh.{Number(s.expected_amount).toLocaleString()} · <span className="capitalize">{s.status}</span>
                  </span>
                </div>
              ))}
              {schedule.length === 0 && <p className="text-ink-500">No schedule rows yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-ink-200 bg-white/80 p-5">
            <h2 className="font-semibold text-ink-900 mb-3">Payment history</h2>
            <div className="space-y-2 text-sm">
              {repayments.map((r) => (
                <div key={r.id} className="flex justify-between border-b border-ink-100 py-2">
                  <span>Ksh.{Number(r.amount).toLocaleString()}</span>
                  <span className="text-ink-500">
                    {r.verification_status || r.status} {r.is_late ? '· late' : ''}
                  </span>
                </div>
              ))}
              {repayments.length === 0 && <p className="text-ink-500">No repayments yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RepaymentsPage() {
  return (
    <ProtectedRoute>
      <RepaymentsContent />
    </ProtectedRoute>
  );
}
