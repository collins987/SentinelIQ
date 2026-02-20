import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { submitSupportTicket } from '../services/api';

export default function ContactAdminForm() {
  const { user, token } = useUser();
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !token) return;
    setStatus('loading');
    try {
      await submitSupportTicket({ message, email: user.email }, token);
      setStatus('success');
      setMessage('');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="card" style={{ minHeight: 120 }}>
      <h2 style={{ marginBottom: 14 }}>Contact Admin</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your issue or question..."
          required
          rows={4}
          style={{ width: '100%', borderRadius: 6, border: '1px solid #ccc', padding: 8, marginBottom: 0, fontSize: 15 }}
        />
        <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 600, fontSize: 16 }} disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending...' : 'Send'}
        </button>
        {status === 'success' && <div style={{ color: 'green', marginTop: 4 }}>Message sent!</div>}
        {status === 'error' && <div style={{ color: 'red', marginTop: 4 }}>Failed to send message.</div>}
      </form>
      <div style={{ marginTop: 10 }}>
        <a href={`mailto:admin@example.com?subject=Support Request from ${user?.email}`} style={{ color: '#2563eb', textDecoration: 'underline' }}>Or contact via email</a>
      </div>
    </div>
  );
}
