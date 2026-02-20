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
    <div className="card">
      <h2>Contact Admin</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <textarea
          className="contact-textarea"
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your issue or question..."
          required
          rows={4}
        />
        <button type="submit" className="btn-primary" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending...' : 'Send Message'}
        </button>
        {status === 'success' && <div className="status-success">✓ Message sent successfully!</div>}
        {status === 'error' && <div className="status-error">✕ Failed to send message. Please try again.</div>}
      </form>
      <div style={{ marginTop: 12 }}>
        <a href={`mailto:admin@example.com?subject=Support Request from ${user?.email}`} className="contact-email-link">
          ✉ Or contact via email
        </a>
      </div>
    </div>
  );
}
