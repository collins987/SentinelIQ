import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getMFAStatus, enableMFA, verifyMFA, disableMFA } from '../services/api';

export default function MFASetupCard() {
  const { token } = useUser();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Enable flow
  const [setupData, setSetupData] = useState<{ secret: string; qr_uri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [setupStatus, setSetupStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [setupMsg, setSetupMsg] = useState('');

  // Disable flow
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disableStatus, setDisableStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [disableMsg, setDisableMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    getMFAStatus(token)
      .then(data => { setMfaEnabled(data.mfa_enabled); setLoading(false); })
      .catch(() => { setError('Could not load MFA status'); setLoading(false); });
  }, [token]);

  const handleEnable = async () => {
    if (!token) return;
    setSetupStatus('loading');
    try {
      const data = await enableMFA(token);
      setSetupData({ secret: data.secret, qr_uri: data.qr_uri });
      setSetupStatus('idle');
    } catch (err: any) {
      setSetupMsg(err?.response?.data?.detail || 'Failed to start MFA setup');
      setSetupStatus('error');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSetupStatus('loading');
    try {
      const data = await verifyMFA(verifyCode, token);
      setSetupMsg(data.message);
      setSetupStatus('success');
      setMfaEnabled(true);
      setSetupData(null);
      setVerifyCode('');
    } catch (err: any) {
      setSetupMsg(err?.response?.data?.detail || 'Invalid code');
      setSetupStatus('error');
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setDisableStatus('loading');
    try {
      await disableMFA(disableCode, token);
      setDisableMsg('MFA disabled successfully');
      setDisableStatus('success');
      setMfaEnabled(false);
      setShowDisable(false);
      setDisableCode('');
    } catch (err: any) {
      setDisableMsg(err?.response?.data?.detail || 'Invalid code');
      setDisableStatus('error');
    }
  };

  if (loading) return <div className="card"><h2>Multi-Factor Authentication</h2><div className="loading-text">Loading...</div></div>;
  if (error) return <div className="card"><h2>Multi-Factor Authentication</h2><div className="error-container">{error}</div></div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>Multi-Factor Authentication</h2>
        <span style={{
          padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 0.5,
          background: mfaEnabled ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
          color: mfaEnabled ? 'var(--color-success)' : 'var(--color-danger)',
        }}>
          {mfaEnabled ? '✓ Enabled' : '✗ Disabled'}
        </span>
      </div>

      {/* Status messages */}
      {setupMsg && <div className={setupStatus === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 12 }}>{setupMsg}</div>}
      {disableMsg && <div className={disableStatus === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 12 }}>{disableMsg}</div>}

      {!mfaEnabled && !setupData && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🔐</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Protect your account with an authenticator app (TOTP).
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Enabling MFA reduces your identity risk score and increases your trust level.
          </div>
          <button className="btn-primary" onClick={handleEnable} disabled={setupStatus === 'loading'}>
            {setupStatus === 'loading' ? 'Setting up...' : 'Enable MFA'}
          </button>
        </div>
      )}

      {/* Setup flow: show secret and QR URI, verify code */}
      {setupData && (
        <div style={{ background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', padding: 20, border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>Setup Instructions</div>
          <ol style={{ fontSize: 13, color: 'var(--color-text-secondary)', paddingLeft: 20, marginBottom: 16, lineHeight: 1.8 }}>
            <li>Install an authenticator app (Google Authenticator, Authy, etc.)</li>
            <li>Add a new account using the key below:</li>
          </ol>

          <div style={{
            background: 'var(--color-bg-card-inner)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-sm)',
            padding: 14, marginBottom: 16, textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6, fontWeight: 600 }}>SECRET KEY</div>
            <code style={{
              fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'var(--color-primary)',
              wordBreak: 'break-all',
            }}>
              {setupData.secret}
            </code>
          </div>

          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 4 }}>
            Or use this OTP URI in your authenticator app:
          </div>
          <div style={{
            background: 'var(--color-bg-card-inner)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
            padding: 10, marginBottom: 16, fontSize: 11, wordBreak: 'break-all', color: 'var(--color-text-secondary)',
          }}>
            {setupData.qr_uri}
          </div>

          <form onSubmit={handleVerify} style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value)}
              maxLength={6}
              pattern="\d{6}"
              required
              className="contact-textarea"
              style={{ resize: 'none', minHeight: 0, padding: '10px 12px', flex: 1, fontSize: 16, textAlign: 'center', letterSpacing: 4 }}
            />
            <button type="submit" className="btn-primary" disabled={setupStatus === 'loading' || verifyCode.length !== 6}>
              {setupStatus === 'loading' ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          <button onClick={() => { setSetupData(null); setSetupMsg(''); }}
            style={{ marginTop: 10, width: '100%', padding: '8px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}>
            Cancel Setup
          </button>
        </div>
      )}

      {/* Enabled state */}
      {mfaEnabled && !showDisable && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-success)', marginBottom: 6 }}>
            MFA is enabled on your account.
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Your account is protected with Time-based One-Time Password (TOTP).
          </div>
          <button onClick={() => { setShowDisable(true); setDisableMsg(''); }}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-danger)',
              background: 'var(--color-danger-bg)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}>
            Disable MFA
          </button>
        </div>
      )}

      {/* Disable flow */}
      {showDisable && (
        <form onSubmit={handleDisable} style={{ background: 'var(--color-danger-bg)', borderRadius: 'var(--radius-md)', padding: 16, border: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 8 }}>⚠️ Disable MFA</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
            Enter your current TOTP code to confirm. This will reduce your account security.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={disableCode}
              onChange={e => setDisableCode(e.target.value)}
              maxLength={6}
              pattern="\d{6}"
              required
              className="contact-textarea"
              style={{ resize: 'none', minHeight: 0, padding: '10px 12px', flex: 1, fontSize: 16, textAlign: 'center', letterSpacing: 4 }}
            />
            <button type="submit" style={{
              padding: '10px 16px', background: 'var(--color-danger)', color: 'var(--color-text-inverse)',
              border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>
              Confirm
            </button>
            <button type="button" onClick={() => setShowDisable(false)}
              style={{ padding: '10px 16px', background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
