import { useNavigate } from 'react-router-dom';

export function TermsPage() {
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
        <h1 className="text-lg font-semibold">Terms & Conditions</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 py-6 space-y-6">
        <div className="glass-card p-5 space-y-4">
          <p className="text-xs text-gray-400">Last updated: February 2026</p>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">1. Acceptance of terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              By creating an account on My2cents, you agree to these Terms & Conditions and our Privacy Policy. If you do not agree, please do not use the app.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">2. What My2cents is</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              My2cents is a personal budgeting and expense tracking tool. It is not a financial advisor, bank, payment processor, or investment platform. We do not provide financial advice of any kind.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">3. Your account</h2>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1 ml-2">
              <li>You must provide a valid Indian mobile number to register</li>
              <li>You are responsible for keeping your 6-digit PIN secure</li>
              <li>You must not share your account with anyone outside your household</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">4. Age eligibility & children</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You must be at least 18 years of age to create an account on My2cents. By creating an account, you confirm that you are 18 or older.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              If you are under 18, a parent or legal guardian must create and manage the account on your behalf. My2cents does not knowingly collect personal data from children under 18 without verifiable parental consent, in compliance with Section 9 of the Digital Personal Data Protection Act 2023.
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              If we become aware that a child under 18 has created an account without parental consent, we will delete the account and associated data promptly.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">5. Household data</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              My2cents is designed for household use. All members of a household can see transactions, budgets, and plans within that household. By inviting someone to your household, you consent to sharing your household's financial data with them.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">6. Data accuracy</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You are responsible for the accuracy of the data you enter. My2cents does not verify the accuracy of transactions, income figures, or budget amounts. Bank statement imports are processed on your device and may occasionally misparse certain formats.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">7. Limitation of liability</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              My2cents is provided "as is" without warranties of any kind. We are not liable for any financial decisions you make based on data shown in the app. We are not liable for data loss due to circumstances beyond our control.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">8. Account deletion</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              You may delete your account at any time from the profile menu. Deletion is permanent and irreversible. If you are the sole member of a household, all household data (budgets, transactions, categories) will be permanently deleted. If other members exist, household ownership will be transferred.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">9. Changes to terms</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              We may update these terms from time to time. Continued use of the app after changes constitutes acceptance. For material changes, we will request your consent again.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-gray-900">10. Governing law</h2>
            <p className="text-sm text-gray-600 leading-relaxed">
              These terms are governed by the laws of India. Any disputes will be subject to the exclusive jurisdiction of the courts in New Delhi, India.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
