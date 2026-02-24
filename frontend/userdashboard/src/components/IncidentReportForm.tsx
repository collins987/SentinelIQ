import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { reportIncident } from '../services/api';

export default function IncidentReportForm() {
  const { token } = useUser();
  const [category, setCategory] = useState('unauthorized_access');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const categories = [
    { value: 'unauthorized_access', label: 'Unauthorized Access' },
    { value: 'suspicious_activity', label: 'Suspicious Activity' },
    { value: 'data_breach', label: 'Data Breach' },
    { value: 'phishing', label: 'Phishing Attempt' },
    { value: 'account_compromise', label: 'Account Compromise' },
    { value: 'fraud', label: 'Fraud / Scam' },
    { value: 'other', label: 'Other' },
  ];

  const severities = [
    { value: 'low', label: 'Low', desc: 'Minor concern, no immediate impact' },
    { value: 'medium', label: 'Medium', desc: 'Moderate concern, possible impact' },
    { value: 'high', label: 'High', desc: 'Serious concern, likely impact' },
    { value: 'critical', label: 'Critical', desc: 'Urgent, immediate action needed' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setStatus('loading');
    try {
      const res = await reportIncident({ incident_type: category, description }, token);
      setMsg(res.message || 'Incident reported successfully. Reference: ' + res.incident_id);
      setStatus('success');
      setDescription('');
    } catch (err: any) {
      setMsg(err?.response?.data?.detail || 'Failed to submit report');
      setStatus('error');
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>🚨</span>
        <h2 style={{ marginBottom: 0 }}>Report Security Incident</h2>
      </div>

      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        If you notice any suspicious activity, unauthorized access, or security concerns on your account,
        please report it immediately. Our security team will investigate promptly.
      </div>

      {msg && (
        <div className={status === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 16 }}>
          {msg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Category */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Incident Category
          </label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border)', background: 'var(--color-bg)',
              fontSize: 13, color: 'var(--color-text)', outline: 'none',
            }}
          >
            {categories.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Severity */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Severity Level
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {severities.map(s => {
              const isSelected = severity === s.value;
              const colors: Record<string, string> = {
                low: 'var(--color-success)',
                medium: 'var(--color-warning)',
                high: 'var(--color-warning)',
                critical: 'var(--color-danger)',
              };
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setSeverity(s.value)}
                  style={{
                    padding: '8px 6px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                    border: `2px solid ${isSelected ? colors[s.value] : 'var(--color-border)'}`,
                    background: isSelected ? `${colors[s.value]}15` : 'var(--color-bg)',
                    color: isSelected ? colors[s.value] : 'var(--color-text-muted)',
                    fontSize: 11, fontWeight: isSelected ? 700 : 500,
                    textAlign: 'center', transition: 'all 0.15s',
                  }}
                  title={s.desc}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe what happened in as much detail as possible. Include dates, times, and any evidence you have..."
            required
            minLength={20}
            className="contact-textarea"
            style={{ minHeight: 100, resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%' }}
          disabled={status === 'loading' || description.length < 20}
        >
          {status === 'loading' ? 'Submitting Report...' : 'Submit Incident Report'}
        </button>
      </form>
    </div>
  );
}
