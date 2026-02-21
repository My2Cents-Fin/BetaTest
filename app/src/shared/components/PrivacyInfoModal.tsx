interface PrivacyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DATA_PRACTICES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Client-side processing',
    description: 'Bank statement PDFs are parsed entirely on your device using your browser. The file is never uploaded to any server.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
      </svg>
    ),
    title: 'Minimal data storage',
    description: 'We store only what\'s needed: transaction date, description, and amount. We do not store bank account numbers, card numbers, IFSC codes, names, or addresses from statements.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
    title: 'No third-party services',
    description: 'Zero external APIs are used for parsing, categorisation, or analytics. No OCR services, no AI APIs, no merchant databases. Everything runs locally.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Household isolation',
    description: 'Database-level Row Level Security (RLS) ensures your household\'s data is only accessible to its members. No other user or household can see your data.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Encryption',
    description: 'All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Your 6-digit PIN is hashed — we cannot read it.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'No data selling',
    description: 'Your financial data is never sold, shared, or used for advertising. Not anonymised, not aggregated — not at all.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    title: 'Right to deletion',
    description: 'You can permanently delete your account and all associated data at any time from the "Delete my account & data" option in your profile.',
  },
];

export function PrivacyInfoModal({ isOpen, onClose }: PrivacyInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 flex-shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary-bg)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Data & Privacy</h2>
              <p className="text-xs text-gray-500">How My2cents handles your data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-4">
            {DATA_PRACTICES.map((practice, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center flex-shrink-0 text-[var(--color-primary)]">
                  {practice.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{practice.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{practice.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* What we store vs don't */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-700 mb-3">Data we store vs. data we don't:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Stored</p>
                {['Phone number', 'Display name', 'Transaction amounts', 'Transaction descriptions', 'Budget allocations', 'Category choices'].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-xs text-gray-600">{item}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Never stored</p>
                {['Bank account numbers', 'Credit/debit card no.', 'Aadhaar / PAN', 'Address', 'Bank statement files', 'PDF passwords'].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 mb-1">
                    <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-xs text-gray-400">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Legal compliance */}
          <div className="mt-4 p-3 bg-[var(--color-primary-bg)] rounded-xl">
            <p className="text-xs text-[var(--color-primary)] font-medium">DPDPA 2023 Compliant</p>
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
              My2cents adheres to India's Digital Personal Data Protection Act. You have the right to access, correct, and delete your personal data. For concerns, contact our Grievance Officer at privacy@my2cents.app.
            </p>
          </div>

          {/* Link to full privacy policy */}
          <button
            onClick={() => window.open('/privacy', '_blank')}
            className="mt-4 flex items-center justify-center gap-1.5 w-full text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] font-medium transition-colors"
          >
            <span>Read our full Privacy Policy</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
