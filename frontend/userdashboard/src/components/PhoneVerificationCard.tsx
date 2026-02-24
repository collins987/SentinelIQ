import React, { useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import { getPhoneStatus, updatePhone, verifyPhone, resendPhoneCode } from '../services/api';

export default function PhoneVerificationCard() {
  const { token } = useUser();
  const [phone, setPhone] = useState<string | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add phone flow
  const [showAddPhone, setShowAddPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [addMsg, setAddMsg] = useState('');

  // Verify flow
  const [showVerify, setShowVerify] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [verifyMsg, setVerifyMsg] = useState('');

  // Resend flow
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading'>('idle');
  const [resendMsg, setResendMsg] = useState('');

  useEffect(() => {
    if (!token) return;
    getPhoneStatus(token)
      .then(data => {
        setPhone(data.phone);
        setPhoneVerified(data.phone_verified);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load phone status');
        setLoading(false);
      });
  }, [token]);

  const handleAddPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setAddStatus('loading');
    setAddMsg('');
    try {
      const data = await updatePhone(phoneInput, token);
      setPhone(data.phone);
      setPhoneVerified(data.phone_verified);
      setAddMsg(data.message);
      setAddStatus('success');
      setShowAddPhone(false);
      setShowVerify(true);
      setPhoneInput('');
    } catch (err: any) {
      setAddMsg(err?.response?.data?.detail || 'Failed to update phone');
      setAddStatus('error');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setVerifyStatus('loading');
    setVerifyMsg('');
    try {
      const data = await verifyPhone(verifyCode, token);
      setVerifyMsg(data.message);
      setVerifyStatus('success');
      setPhoneVerified(true);
      setShowVerify(false);
      setVerifyCode('');
    } catch (err: any) {
      setVerifyMsg(err?.response?.data?.detail || 'Invalid code');
      setVerifyStatus('error');
    }
  };

  const handleResend = async () => {
    if (!token) return;
    setResendStatus('loading');
    setResendMsg('');
    try {
      const data = await resendPhoneCode(token);
      setResendMsg(data.message);
      setResendStatus('idle');
    } catch (err: any) {
      setResendMsg(err?.response?.data?.detail || 'Failed to resend code');
      setResendStatus('idle');
    }
  };

  if (loading) return <div className="card"><h2>Phone Verification</h2><div className="loading-text">Loading...</div></div>;
  if (error) return <div className="card"><h2>Phone Verification</h2><div className="error-container">{error}</div></div>;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ marginBottom: 0 }}>Phone Verification</h2>
        <span style={{
          padding: '4px 12px', borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 0.5,
          background: phoneVerified ? 'var(--color-success-bg)' : phone ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
          color: phoneVerified ? 'var(--color-success)' : phone ? 'var(--color-warning)' : 'var(--color-danger)',
        }}>
          {phoneVerified ? '✓ Verified' : phone ? '⏳ Unverified' : '✗ Not Set'}
        </span>
      </div>

      {/* Status messages */}
      {addMsg && <div className={addStatus === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 12 }}>{addMsg}</div>}
      {verifyMsg && <div className={verifyStatus === 'success' ? 'status-success' : 'status-error'} style={{ marginBottom: 12 }}>{verifyMsg}</div>}
      {resendMsg && <div className="status-success" style={{ marginBottom: 12 }}>{resendMsg}</div>}

      {/* No phone set */}
      {!phone && !showAddPhone && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📱</div>
          <div style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 6 }}>
            Add a phone number for enhanced account security.
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Verifying your phone reduces your identity risk score and increases your trust level.
          </div>
          <button className="btn-primary" onClick={() => { setShowAddPhone(true); setAddMsg(''); }}>
            Add Phone Number
          </button>
        </div>
      )}

      {/* Phone verified */}
      {phone && phoneVerified && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-success)', marginBottom: 6 }}>
            Phone number verified
          </div>
          <div style={{
            background: 'var(--color-bg-card-inner)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 16px', display: 'inline-block',
            fontSize: 15, fontWeight: 700, letterSpacing: 1, color: 'var(--color-text)',
            marginBottom: 16,
          }}>
            {phone}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Your phone number is verified and linked to your account.
          </div>
          <button
            onClick={() => { setShowAddPhone(true); setAddMsg(''); setPhoneInput(''); }}
            style={{
              padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
              background: 'none', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
            }}>
            Change Phone Number
          </button>
        </div>
      )}

      {/* Phone set but not verified */}
      {phone && !phoneVerified && !showVerify && !showAddPhone && (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏳</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-warning)', marginBottom: 6 }}>
            Phone number pending verification
          </div>
          <div style={{
            background: 'var(--color-bg-card-inner)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)', padding: '10px 16px', display: 'inline-block',
            fontSize: 15, fontWeight: 700, letterSpacing: 1, color: 'var(--color-text)',
            marginBottom: 16,
          }}>
            {phone}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 20 }}>
            Please verify your phone number to improve your security score.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            <button className="btn-primary" onClick={() => { setShowVerify(true); setVerifyMsg(''); }}>
              Enter Verification Code
            </button>
            <button
              onClick={() => { setShowAddPhone(true); setAddMsg(''); setPhoneInput(''); }}
              style={{
                padding: '8px 20px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)',
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              }}>
              Change Number
            </button>
          </div>
        </div>
      )}

      {/* Add / Update phone form */}
      {showAddPhone && (
        <form onSubmit={handleAddPhone} style={{
          background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
          padding: 20, border: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
            {phone ? 'Update Phone Number' : 'Add Phone Number'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Enter your phone number in international format (e.g. +254712345678).
            A verification code will be generated.
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="tel"
              placeholder="+254712345678"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              required
              minLength={7}
              maxLength={20}
              className="contact-textarea"
              style={{ resize: 'none', minHeight: 0, padding: '10px 12px', flex: 1, fontSize: 15, letterSpacing: 1 }}
            />
            <button type="submit" className="btn-primary" disabled={addStatus === 'loading' || phoneInput.length < 7}>
              {addStatus === 'loading' ? 'Saving...' : 'Save & Verify'}
            </button>
          </div>
          <button type="button" onClick={() => { setShowAddPhone(false); setAddMsg(''); }}
            style={{
              marginTop: 10, width: '100%', padding: '8px', background: 'none',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: 13,
            }}>
            Cancel
          </button>
        </form>
      )}

      {/* Verify code form */}
      {showVerify && (
        <div style={{
          background: 'var(--color-bg)', borderRadius: 'var(--radius-md)',
          padding: 20, border: '1px solid var(--color-border)',
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--color-text)' }}>
            Verify Your Phone
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Enter the 6-digit verification code. The code is shown in the status message above or in the server logs.
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
            <button type="submit" className="btn-primary" disabled={verifyStatus === 'loading' || verifyCode.length !== 6}>
              {verifyStatus === 'loading' ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleResend}
              disabled={resendStatus === 'loading'}
              style={{
                flex: 1, padding: '8px', background: 'none',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: 13, color: 'var(--color-primary)',
              }}>
              {resendStatus === 'loading' ? 'Resending...' : 'Resend Code'}
            </button>
            <button onClick={() => { setShowVerify(false); setVerifyMsg(''); }}
              style={{
                flex: 1, padding: '8px', background: 'none',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                cursor: 'pointer', fontSize: 13,
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
