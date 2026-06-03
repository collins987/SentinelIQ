import React, { useEffect, useRef, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getLoans, applyForLoan, repayLoan, LoanInfo } from '../services/api';

export default function LoansCard() {
  const { token } = useUser();
  const [loans, setLoans] = useState<LoanInfo[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApply, setShowApply] = useState(false);
  const [applyAmount, setApplyAmount] = useState('');
  const [applyTerm, setApplyTerm] = useState('12');
  const [applyPurpose, setApplyPurpose] = useState('');
  const [applyStatus, setApplyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [applyMsg, setApplyMsg] = useState('');
  const [repayLoanId, setRepayLoanId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('mpesa');
  const [repayReference, setRepayReference] = useState('');
  const [repayStatus, setRepayStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [repayMsg, setRepayMsg] = useState('');
  const didFetchRef = useRef(false);

  const fetchLoans = async () => {
    if (!token) return;
    try {
      const data = await getLoans(token);
      setLoans(data.loans);
      setTotalOutstanding(data.total_outstanding);
      setLoading(false);
    } catch {
      setError('Could not load loans');
      setLoading(false);
    }
  };

  useEffect(() => {
    didFetchRef.current = false;
    setLoading(true);
    setError('');
  }, [token]);

  useEffect(() => {
    if (!token || didFetchRef.current) return;
    didFetchRef.current = true;
    fetchLoans();
  }, [token]);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setApplyStatus('loading');
    try {
      const res = await applyForLoan({
        amount: parseFloat(applyAmount),
        term_months: parseInt(applyTerm),
        purpose: applyPurpose || undefined,
      }, token);
      setApplyMsg(res.message);
      setApplyStatus('success');
      setShowApply(false);
      setApplyAmount('');
      fetchLoans();
    } catch (err: any) {
      setApplyMsg(err?.response?.data?.detail || 'Application failed');
      setApplyStatus('error');
    }
  };

  const handleRepay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !repayLoanId) return;
    setRepayStatus('loading');
    try {
      const res = await repayLoan(
        repayLoanId,
        {
          amount: parseFloat(repayAmount),
          payment_method: repayMethod,
          payment_reference: repayReference || undefined,
        },
        token
      );
      setRepayMsg(res.message);
      setRepayStatus('success');
      setRepayLoanId(null);
      setRepayAmount('');
      setRepayReference('');
      fetchLoans();
    } catch (err: any) {
      setRepayMsg(err?.response?.data?.detail || 'Repayment failed');
      setRepayStatus('error');
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      active: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
      pending: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
      closed: { bg: 'var(--color-bg-card-inner)', color: 'var(--color-text-muted)' },
      defaulted: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
      rejected: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
      approved: { bg: 'var(--color-primary-bg)', color: 'var(--color-primary)' },
    };
    const c = colors[status] || colors.pending;
    return (
      <span style={{
        background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 4,
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
      }}>
        {status}
      </span>
    );
  };

  if (loading) return <div className="card"><div className="card-header-row"><div className="card-header-copy"><h2>Loans</h2><p className="card-subtitle">Borrowing, repayment, and outstanding balance</p></div></div><div className="loading-text">Loading loans...</div></div>;
  if (error) return <div className="card"><div className="card-header-row"><div className="card-header-copy"><h2>Loans</h2><p className="card-subtitle">Borrowing, repayment, and outstanding balance</p></div></div><div className="error-container">{error}</div></div>;

  return (
    <div className="card">
      <div className="card-header-row">
        <div className="card-header-copy">
          <h2>Loans</h2>
          <p className="card-subtitle">Borrowing, repayment, and outstanding balance</p>
        </div>
        <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => setShowApply(!showApply)}>
          {showApply ? 'Cancel' : '+ Apply for Loan'}
        </button>
      </div>

      {/* Summary */}
      {loans.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div className="activity-stat" style={{ flex: 1 }}>
            <div className="activity-stat-label">Total Loans</div>
            <div className="activity-stat-value">{loans.length}</div>
          </div>
          <div className="activity-stat" style={{ flex: 1 }}>
            <div className="activity-stat-label">Outstanding</div>
            <div className="activity-stat-value" style={{ color: totalOutstanding > 0 ? 'var(--color-warning)' : undefined }}>
              Ksh.{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div className="activity-stat" style={{ flex: 1 }}>
            <div className="activity-stat-label">Active</div>
            <div className="activity-stat-value">{loans.filter(l => l.status === 'active').length}</div>
          </div>
        </div>
      )}

      {/* Apply form */}
      {showApply && (
        <form onSubmit={handleApply} style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid var(--color-border-subtle)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Apply for a New Loan</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <input type="number" placeholder="Amount (Ksh.)" value={applyAmount} onChange={e => setApplyAmount(e.target.value)} required min={1} step="0.01" className="contact-textarea" style={{ resize: 'none', minHeight: 0, padding: '10px 12px' }} />
            <input type="number" placeholder="Term (months)" value={applyTerm} onChange={e => setApplyTerm(e.target.value)} min={1} max={360} className="contact-textarea" style={{ resize: 'none', minHeight: 0, padding: '10px 12px' }} />
          </div>
          <input type="text" placeholder="Purpose (optional)" value={applyPurpose} onChange={e => setApplyPurpose(e.target.value)} className="contact-textarea" style={{ resize: 'none', minHeight: 0, padding: '10px 12px', marginBottom: 10 }} />
          <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={applyStatus === 'loading'}>
            {applyStatus === 'loading' ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      )}

      {applyMsg && (
        <div className={applyStatus === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 12 }}>
          {applyMsg}
        </div>
      )}
      {repayMsg && (
        <div className={repayStatus === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 12 }}>
          {repayMsg}
        </div>
      )}

      {/* Loan list */}
      {loans.length === 0 ? (
        <div className="empty-state">No loans yet. Apply for your first loan above!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loans.map(loan => (
            <div key={loan.id} className="activity-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    Ksh.{Number(loan.principal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  {getStatusBadge(loan.status)}
                </div>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {loan.interest_rate}% APR · {loan.term_months}mo
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>
                  Outstanding: <b style={{ color: Number(loan.outstanding) > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                    Ksh.{Number(loan.outstanding).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </b>
                </span>
                {loan.next_due_date && (
                  <span style={{ color: 'var(--color-text-muted)' }}>Due: {loan.next_due_date}</span>
                )}
              </div>

              {loan.status === 'active' && (
                repayLoanId === loan.id ? (
                  <form onSubmit={handleRepay} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={repayAmount}
                      onChange={e => setRepayAmount(e.target.value)}
                      required
                      min={0.01}
                      max={Number(loan.outstanding)}
                      step="0.01"
                      className="contact-textarea"
                      style={{ resize: 'none', minHeight: 0, padding: '8px 10px', flex: 1, minWidth: 120 }}
                    />
                    <select
                      value={repayMethod}
                      onChange={e => setRepayMethod(e.target.value)}
                      className="contact-textarea"
                      style={{ resize: 'none', minHeight: 0, padding: '8px 10px', minWidth: 140 }}
                    >
                      <option value="mpesa">Mpesa</option>
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="wallet">Wallet</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Reference (optional)"
                      value={repayReference}
                      onChange={e => setRepayReference(e.target.value)}
                      className="contact-textarea"
                      style={{ resize: 'none', minHeight: 0, padding: '8px 10px', flex: 1, minWidth: 160 }}
                    />
                    <button type="submit" className="btn-primary" style={{ padding: '8px 14px', fontSize: 12 }} disabled={repayStatus === 'loading'}>Pay</button>
                    <button type="button" onClick={() => setRepayLoanId(null)} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>Cancel</button>
                  </form>
                ) : (
                  <button onClick={() => { setRepayLoanId(loan.id); setRepayAmount(''); setRepayMethod('mpesa'); setRepayReference(''); setRepayMsg(''); }}
                    className="btn-secondary"
                    style={{ alignSelf: 'flex-start', padding: '6px 14px', fontSize: 12, color: 'var(--color-primary)', background: 'var(--color-primary-bg)', marginTop: 4 }}>
                    Make Repayment
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
