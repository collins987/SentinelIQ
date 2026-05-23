import { useEffect, useState } from 'react';
import {
  useGetTransactionAlertsQuery,
  useGetGlobalTxnThresholdsQuery,
  useUpdateGlobalTxnThresholdsMutation,
} from '../services/adminGovernanceApi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

export default function TransactionRisk() {
  const { data: alerts, isLoading: al } = useGetTransactionAlertsQuery({ limit: 80 });
  const { data: thresholds, isLoading: tl } = useGetGlobalTxnThresholdsQuery();
  const [updateThresholds, { isLoading: saving }] = useUpdateGlobalTxnThresholdsMutation();
  const [daily, setDaily] = useState('');
  const [weekly, setWeekly] = useState('');
  const [anomaly, setAnomaly] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (thresholds) {
      setDaily(String(thresholds.daily_velocity_limit));
      setWeekly(String(thresholds.weekly_velocity_limit));
      setAnomaly(String(thresholds.anomaly_score_threshold));
    }
  }, [thresholds]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateThresholds({
        daily_velocity_limit: parseFloat(daily),
        weekly_velocity_limit: parseFloat(weekly),
        anomaly_score_threshold: parseFloat(anomaly),
      }).unwrap();
      setMsg('Global thresholds updated');
    } catch (err: any) {
      setMsg(err?.data?.detail || 'Update failed');
    }
  };

  if (al || tl) {
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
          <ShieldExclamationIcon className="h-7 w-7 text-red-400" />
          Transaction Risk Monitor
        </h1>
        <p className="text-sm text-gray-400 mt-1">Anomaly alerts and platform-wide velocity thresholds.</p>
      </div>
      {msg && <p className="text-sm text-gray-300">{msg}</p>}

      <form onSubmit={handleSave} className="bg-dashboard-card border border-dashboard-border rounded-xl p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <label className="text-xs text-gray-400">Daily velocity limit</label>
          <input type="number" className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={daily} onChange={(e) => setDaily(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">Weekly velocity limit</label>
          <input type="number" className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={weekly} onChange={(e) => setWeekly(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-400">Anomaly score threshold</label>
          <input type="number" className="w-full mt-1 px-3 py-2 rounded-lg bg-dashboard-bg border border-dashboard-border text-white text-sm" value={anomaly} onChange={(e) => setAnomaly(e.target.value)} />
        </div>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-sentinel-600 text-white text-sm font-medium hover:bg-sentinel-500 disabled:opacity-50">
          Save thresholds
        </button>
      </form>

      <div className="bg-dashboard-card border border-dashboard-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-dashboard-hover text-gray-400 text-left">
            <tr>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody>
            {(alerts?.alerts ?? []).map((a: Record<string, unknown>) => (
              <tr key={String(a.id)} className="border-t border-dashboard-border text-gray-200">
                <td className="px-4 py-3 capitalize">{String(a.severity)}</td>
                <td className="px-4 py-3">{String(a.alert_type)}</td>
                <td className="px-4 py-3">{String(a.title)}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{String(a.created_at || '').slice(0, 19)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
