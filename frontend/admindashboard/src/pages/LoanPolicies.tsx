import { useState } from 'react';
import {
  useListInterestPoliciesQuery,
  useCreateInterestPolicyMutation,
} from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { BanknotesIcon, PlusIcon } from '@heroicons/react/24/outline';

export default function LoanPolicies() {
  const { data, isLoading, refetch } = useListInterestPoliciesQuery({ active_only: false });
  const [createPolicy, { isLoading: creating }] = useCreateInterestPolicyMutation();
  const [name, setName] = useState('');
  const [riskTier, setRiskTier] = useState('medium');
  const [baseRate, setBaseRate] = useState('12');
  const [penaltyRate, setPenaltyRate] = useState('2.5');
  const [msg, setMsg] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      await createPolicy({
        name,
        risk_tier: riskTier,
        base_rate: parseFloat(baseRate),
        penalty_rate: parseFloat(penaltyRate),
        grace_period_days: 3,
      }).unwrap();
      setName('');
      setMsg('Policy created');
      refetch();
    } catch (err: any) {
      setMsg(err?.data?.detail || 'Failed to create policy');
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
          <BanknotesIcon className="h-7 w-7 text-sentinel-400" />
          Loan Interest & Penalty Policies
        </h1>
        <p className="text-sm text-gray-400 mt-1">Risk-tier pricing catalog used by the interest engine.</p>
      </div>

      <form onSubmit={handleCreate} className="bg-dashboard-card border border-dashboard-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label className="text-xs text-gray-400">Name</label>
          <input className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs text-gray-400">Risk tier</label>
          <select className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={riskTier} onChange={(e) => setRiskTier(e.target.value)}>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Base rate %</label>
          <input type="number" step="0.1" className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={baseRate} onChange={(e) => setBaseRate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">Penalty rate %</label>
          <input type="number" step="0.1" className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={penaltyRate} onChange={(e) => setPenaltyRate(e.target.value)} />
        </div>
        <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-sentinel-600 text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-sentinel-500 disabled:opacity-50">
          <PlusIcon className="h-4 w-4" />
          Add policy
        </button>
        {msg && <p className="md:col-span-5 text-sm text-gray-300">{msg}</p>}
      </form>

      <div className="bg-dashboard-card border border-dashboard-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dashboard-hover text-gray-400 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Base %</th>
              <th className="px-4 py-3">Penalty %</th>
              <th className="px-4 py-3">Grace days</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {(data?.policies ?? []).map((p) => (
              <tr key={p.id} className="border-t border-dashboard-border text-gray-200">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3 capitalize">{p.risk_tier}</td>
                <td className="px-4 py-3">{p.base_rate}</td>
                <td className="px-4 py-3">{p.penalty_rate}</td>
                <td className="px-4 py-3">{p.grace_period_days}</td>
                <td className="px-4 py-3">{p.active ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
