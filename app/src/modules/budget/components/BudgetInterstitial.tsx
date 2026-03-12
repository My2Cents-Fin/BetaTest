import { useState, useRef, useEffect } from 'react';
import { formatNumber } from './AmountInput';
import { createTransaction } from '../services/transactions';

interface IncomeSubCategory {
  id: string;
  name: string;
  icon: string;
}

interface BudgetInterstitialProps {
  month: string; // YYYY-MM
  householdId: string;
  currentUserId: string;
  totalIncome: number;
  incomeSubCategories: IncomeSubCategory[];
  onStartPlanning: () => void;
  onBack: () => void;
  onIncomeRecorded: () => void; // refresh income after recording
}

/**
 * Interstitial screen shown when navigating from Dashboard "Plan Now".
 * - Variant A (income exists): Confirmation — "You earned ₹X. Let's plan."
 * - Variant B (no income): Single income field + subcategory picker.
 */
export function BudgetInterstitial({
  month,
  householdId,
  currentUserId,
  totalIncome,
  incomeSubCategories,
  onStartPlanning,
  onBack,
  onIncomeRecorded,
}: BudgetInterstitialProps) {
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasIncome = totalIncome > 0;

  // Variant B state
  const [amount, setAmount] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [selectedSubCatId, setSelectedSubCatId] = useState(incomeSubCategories[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hasIncome && amountInputRef.current) {
      // Small delay to ensure element is rendered
      setTimeout(() => amountInputRef.current?.focus(), 300);
    }
  }, [hasIncome]);

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      setAmount('');
      setDisplayValue('');
      return;
    }
    const num = parseInt(cleaned, 10);
    setAmount(String(num));
    setDisplayValue(num.toLocaleString('en-IN'));
  };

  const handleRecordAndPlan = async () => {
    const numAmount = parseInt(amount, 10);
    if (!numAmount || numAmount <= 0) {
      setError('Please enter your income amount');
      return;
    }
    if (!selectedSubCatId) {
      setError('Please select an income source');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createTransaction({
        householdId,
        subCategoryId: selectedSubCatId,
        amount: numAmount,
        transactionType: 'income',
        transactionDate: `${month}-01`, // First of the month
        paymentMethod: 'netbanking',
        remarks: null,
        loggedBy: currentUserId,
      });

      if (!result.success) {
        setError(result.error || 'Failed to record income');
        setIsSubmitting(false);
        return;
      }

      // Refresh income data then proceed to planning
      await onIncomeRecorded();
      onStartPlanning();
    } catch (e) {
      console.error('Failed to record income:', e);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const selectedSubCat = incomeSubCategories.find(sc => sc.id === selectedSubCatId);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-primary-gradient rounded-3xl rotate-6 opacity-15" />
        <div className="relative w-20 h-20 bg-primary-gradient rounded-3xl flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.25)]">
          <span className="text-3xl">{hasIncome ? '📊' : '💰'}</span>
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(251,191,36,0.4)]">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>
      </div>

      {hasIncome ? (
        /* ─── Variant A: Income exists ─── */
        <>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">
            You earned ₹{formatNumber(totalIncome)}
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            in {monthLabel}
          </p>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-8 max-w-xs leading-relaxed">
            Let's plan where it goes.
          </p>

          <button
            onClick={onStartPlanning}
            className="px-8 py-3 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            Start planning
          </button>
        </>
      ) : (
        /* ─── Variant B: No income — record it first ─── */
        <>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
            How much did you earn?
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6 max-w-xs leading-relaxed">
            Enter your {monthLabel} income to start planning.
          </p>

          {/* Income amount field */}
          <div className="w-full max-w-xs mb-4">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--color-text-secondary)] font-medium">₹</span>
              <input
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                value={displayValue}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                className="w-full pl-9 pr-4 py-3.5 text-xl font-semibold text-center text-[var(--color-text-primary)] bg-white/80 border border-[var(--color-border)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Income source tags */}
          <div className="w-full max-w-xs mb-2">
            <p className="text-xs text-[var(--color-text-tertiary)] mb-2 text-left">Income source</p>
            <div className="flex flex-wrap gap-2">
              {incomeSubCategories.map(sc => (
                <button
                  key={sc.id}
                  onClick={() => setSelectedSubCatId(sc.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                    selectedSubCatId === sc.id
                      ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-[0_2px_8px_rgba(124,58,237,0.25)]'
                      : 'bg-white/60 text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-primary)]'
                  }`}
                >
                  {sc.icon} {sc.name}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-tertiary)] mb-6 max-w-xs">
            You can add more income sources later.
          </p>

          {/* Error */}
          {error && (
            <p className="text-xs text-[var(--color-danger)] mb-3">{error}</p>
          )}

          {/* Next button */}
          <button
            onClick={handleRecordAndPlan}
            disabled={isSubmitting}
            className="px-8 py-3 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              'Next'
            )}
          </button>
        </>
      )}

      {/* Back link */}
      <button
        onClick={onBack}
        className="mt-4 text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
      >
        ← Back to dashboard
      </button>
    </div>
  );
}
