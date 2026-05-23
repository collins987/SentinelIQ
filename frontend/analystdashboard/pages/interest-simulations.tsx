import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '../src/components/ProtectedRoute';
import { useAnalyst } from '../src/context/AnalystContext';
import { getInterestSimulation } from '../src/services/api';
import { listInvestigations } from '../src/services/api';

function InterestSimContent() {
  const { token } = useAnalyst();
  const router = useRouter();
  const [loanId, setLoanId] = useState('');
  const [sim, setSim] = useState<any>(null);
  const [loans, setLoans] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      router.push('/');
      return;
    }
    listInvestigations(token, { page_size: 5 }).then(() => {
      setLoans([]);
    });
  }, [token, router]);

  const runSim = async () => {
    if (!token || !loanId) return;
    try {
      const data = await getInterestSimulation(token, loanId);
      setSim(data);
    } catch {
      setSim(null);
    }
  };

  return (
    <div className="min-h-screen bg-graphite-900 text-white p-6">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold">Interest simulation</h1>
          <a href="/dashboard" className="text-sm text-graphite-400 underline">Back</a>
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg bg-graphite-800 border border-graphite-700 px-3 py-2 text-sm"
            placeholder="Loan ID"
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
          />
          <button type="button" onClick={runSim} className="px-4 py-2 rounded-lg bg-cyan-600 text-sm font-medium">
            Simulate
          </button>
        </div>
        {sim && (
          <div className="rounded-xl border border-graphite-700 p-5 space-y-2 text-sm">
            <p>Policy: {sim.policy_name} ({sim.risk_tier})</p>
            <p>Base rate: {sim.base_rate}% · Penalty: {sim.penalty_rate}%</p>
            <p>Outstanding: Ksh.{Number(sim.outstanding).toLocaleString()}</p>
            <p>Projected monthly interest: Ksh.{Number(sim.projected_monthly_interest).toLocaleString()}</p>
            <p>Penalty if overdue: Ksh.{Number(sim.projected_penalty_if_overdue).toLocaleString()}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InterestSimPage() {
  return (
    <ProtectedRoute allowedRoles={['analyst', 'admin']}>
      <InterestSimContent />
    </ProtectedRoute>
  );
}
