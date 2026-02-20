/**
 * Support Ticket Modal Component
 * Allows users to submit support tickets
 */

import { useState, FormEvent } from 'react';
import {
  XMarkIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useSubmitSupportTicketMutation } from '../../services/userApi';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function SupportTicketModal({
  isOpen,
  onClose,
  userEmail = '',
}: SupportTicketModalProps) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState(userEmail);
  const [submitTicket, { isLoading, isSuccess, isError, reset }] = useSubmitSupportTicketMutation();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    try {
      await submitTicket({ message: message.trim(), email: email.trim() }).unwrap();
      setMessage('');
    } catch (error) {
      console.error('Failed to submit ticket:', error);
    }
  };

  const handleClose = () => {
    reset();
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-md transform overflow-hidden rounded-2xl bg-dashboard-card border border-gray-700 p-6 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <LifebuoyIcon className="w-5 h-5 text-sentinel-400" />
                Contact Support
              </h2>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Success Message */}
            {isSuccess && (
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3 mb-4">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">Ticket submitted successfully!</p>
                  <p className="text-xs text-gray-400 mt-0.5">We'll get back to you soon.</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {isError && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 mb-4">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Failed to submit ticket</p>
                  <p className="text-xs text-gray-400 mt-0.5">Please try again later.</p>
                </div>
              </div>
            )}

            {/* Form */}
            {!isSuccess && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="support-email" className="block text-sm font-medium text-gray-300 mb-1">
                    Your Email
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="support-message" className="block text-sm font-medium text-gray-300 mb-1">
                    How can we help?
                  </label>
                  <textarea
                    id="support-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="input w-full h-32 resize-none"
                    placeholder="Describe your issue or question..."
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !message.trim() || !email.trim()}
                    className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        Submit Ticket
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Close button after success */}
            {isSuccess && (
              <div className="flex justify-end">
                <button
                  onClick={handleClose}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
