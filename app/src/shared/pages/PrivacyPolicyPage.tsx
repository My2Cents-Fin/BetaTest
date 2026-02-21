import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  const handleBack = () => {
    // If opened in a new tab (no prior history), close the tab
    if (window.history.length <= 2) {
      window.close();
      // window.close() may be blocked if not opened via script — fallback to login
      navigate('/login', { replace: true });
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* Header */}
      <div className="bg-primary-gradient text-white px-5 py-4 flex items-center gap-3">
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs text-gray-400">Last updated: February 2026</p>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">1. Who we are</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              My2cents is a household financial management app built for Indian families. We help you plan budgets, record daily transactions, and track spending — all within your household.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">2. What data we collect</h2>
            <p className="text-sm text-gray-600 leading-relaxed">We collect and store only the minimum data needed to provide our service:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1 ml-2">
              <li>Phone number (for authentication)</li>
              <li>Display name (chosen by you)</li>
              <li>Transaction records: date, description, and amount</li>
              <li>Budget plans and category allocations</li>
              <li>Household membership information</li>
            </ul>
            <p className="text-sm font-medium text-gray-700 mt-3">We do NOT collect or store:</p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1 ml-2">
              <li>Bank account numbers, IFSC codes, or card numbers</li>
              <li>Aadhaar, PAN, or any government ID</li>
              <li>Address or location data</li>
              <li>Bank statement PDF files (processed on-device, never uploaded)</li>
              <li>PDF passwords</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">3. How we process bank statements</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              When you import a bank statement, the PDF is parsed entirely on your device using your browser. The file is never sent to our servers or any external service. We extract only transaction date, description, and amount — nothing else.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">4. Third-party services</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We use zero external APIs for parsing, categorisation, or analytics. No OCR services, no AI APIs, no merchant databases, no advertising networks. Your financial data is never shared with any third party.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">5. Data security</h2>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1 ml-2">
              <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)</li>
              <li>Your 6-digit PIN is cryptographically hashed — we cannot read it</li>
              <li>Database-level Row Level Security (RLS) ensures your household's data is only accessible to its members</li>
              <li>No other user or household can see your data</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">6. Data retention & deletion</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your data is retained as long as your account is active. You can permanently delete your account and all associated data at any time from the profile menu. Deletion is immediate and irreversible. No questions asked.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Accounts that remain inactive for more than 24 months may be automatically deleted along with all associated data. We will attempt to notify you before any such deletion.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">7. Children's data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              My2cents is intended for users aged 18 and above. We do not knowingly collect personal data from children under 18 without verifiable parental consent, in compliance with Section 9 of the DPDPA 2023. If you are under 18, a parent or legal guardian must create and manage the account on your behalf.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">8. Your rights under DPDPA 2023</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              Under India's Digital Personal Data Protection Act 2023, you have the right to:
            </p>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1 ml-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Delete your data (right to erasure)</li>
              <li>Withdraw consent at any time</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">9. Changes to this policy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update this policy from time to time. When we do, we will update the "last updated" date and, if the changes are material, request your consent again during your next login.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">10. Grievance officer</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you have any questions, concerns, or complaints about how your data is handled, you can contact our Grievance Officer as required under the DPDPA 2023:
            </p>
            <div className="bg-gray-50 rounded-xl p-3 mt-2 space-y-1">
              <p className="text-sm text-gray-700 font-medium">Varshine Kolla</p>
              <p className="text-sm text-gray-600">Email: privacy@my2cents.app</p>
              <p className="text-xs text-gray-400 mt-1">We will acknowledge your request within 48 hours and resolve it within 30 days.</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
