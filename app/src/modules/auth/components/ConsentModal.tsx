import { useState, useEffect } from 'react';

interface ConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

const PRIVACY_SECTIONS = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Your data stays on your device',
    description: 'Bank statements are processed entirely on your phone. The PDF is never uploaded to our servers.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    title: 'Minimal data stored',
    description: 'We only store transaction date, description, and amount. No account numbers, card numbers, or personal identity details.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    title: 'No third-party sharing',
    description: 'Your financial data is never sold, shared, or sent to any external service. Zero third-party APIs are used.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Household isolation',
    description: 'Your data is only visible to members of your household. Each household\'s data is isolated at the database level.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    title: 'You can delete your data',
    description: 'You can permanently delete your account and all data from your profile settings at any time. No questions asked.',
  },
];

export function ConsentModal({ isOpen, onAccept, onDecline }: ConsentModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const isAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 20;
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ touchAction: 'none' }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onTouchMove={(e) => e.preventDefault()} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-3 flex-shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-bg)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Your Privacy Matters</h2>
              <p className="text-xs text-gray-500">How My2cents protects your financial data</p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-2"
          onScroll={handleScroll}
        >
          {/* Privacy sections */}
          <div className="space-y-4">
            {PRIVACY_SECTIONS.map((section, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center flex-shrink-0 text-[var(--color-primary)]">
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{section.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{section.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* What we collect summary */}
          <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-2">What we collect & store:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: 'Phone number', stored: true },
                { label: 'Display name', stored: true },
                { label: 'Transactions', stored: true },
                { label: 'Budget plans', stored: true },
                { label: 'Bank account no.', stored: false },
                { label: 'Card numbers', stored: false },
                { label: 'Aadhaar / PAN', stored: false },
                { label: 'Address', stored: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {item.stored ? (
                    <svg className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-xs ${item.stored ? 'text-gray-700' : 'text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Legal note */}
          <p className="mt-4 text-[10px] text-gray-400 leading-relaxed">
            My2cents complies with India's Digital Personal Data Protection Act (DPDPA) 2023.
            Your data is encrypted in transit (TLS) and at rest (AES-256).
            You can request data deletion at any time from your profile settings.
          </p>
        </div>

        {/* Footer with checkbox + buttons */}
        <div className="px-6 pb-6 pt-3 flex-shrink-0 border-t border-gray-100">
          {/* Consent checkbox */}
          <label className="flex items-start gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => setIsChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer"
            />
            <span className="text-xs text-gray-600 leading-relaxed">
              I understand how My2cents handles my data and agree to the{' '}
              <button
                onClick={() => window.open('/privacy', '_blank')}
                className="text-[var(--color-primary)] font-medium hover:underline"
              >
                Privacy Policy
              </button>
              {' '}and{' '}
              <button
                onClick={() => window.open('/terms', '_blank')}
                className="text-[var(--color-primary)] font-medium hover:underline"
              >
                Terms of Service
              </button>
              .
            </span>
          </label>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onDecline}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={onAccept}
              disabled={!isChecked}
              className="flex-1 py-3 px-4 text-sm font-semibold text-white bg-primary-gradient rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:translate-y-0 transition-all"
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
