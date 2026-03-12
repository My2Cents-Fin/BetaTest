import { useState, useRef, useEffect } from 'react';
import { formatNumber } from './AmountInput';
import { createTransaction } from '../services/transactions';
import { getPlannedMonths } from '../services/budget';

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
  hasHistory: boolean; // true if smart pre-fill has data to work with
  onStartWithSuggestions: () => void;
  onClone: (sourceMonth: string) => void;
  onStartBlank: () => void;
  onBack: () => void;
  onIncomeRecorded: () => void;
}

type StartChoice = 'suggestions' | 'clone' | 'blank';

/**
 * Interstitial screen shown when navigating from Dashboard "Plan Now".
 * Two-phase flow:
 *   Phase 1 (if no income): Income entry form
 *   Phase 2 (choice screen): How do you want to start? (radio selection)
 */
export function BudgetInterstitial({
  month,
  householdId,
  currentUserId,
  totalIncome,
  incomeSubCategories,
  hasHistory,
  onStartWithSuggestions,
  onClone,
  onStartBlank,
  onBack,
  onIncomeRecorded,
}: BudgetInterstitialProps) {
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasIncome = totalIncome > 0;

  // Phase: income entry vs choice screen
  // If income exists, skip straight to choice
  const [phase, setPhase] = useState<'income' | 'choice'>(hasIncome ? 'choice' : 'income');

  // Income entry state (Phase 1)
  const [amount, setAmount] = useState('');
  const [displayValue, setDisplayValue] = useState('');
  const [selectedSubCatId, setSelectedSubCatId] = useState(incomeSubCategories[0]?.id || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Choice screen state (Phase 2)
  const [choice, setChoice] = useState<StartChoice>(hasHistory ? 'suggestions' : 'blank');
  const [cloneMonths, setCloneMonths] = useState<{ value: string; label: string }[]>([]);
  const [selectedCloneMonth, setSelectedCloneMonth] = useState('');
  const [isLoadingMonths, setIsLoadingMonths] = useState(true);

  // Load clone sources on mount
  useEffect(() => {
    loadCloneMonths();
  }, [householdId]);

  async function loadCloneMonths() {
    setIsLoadingMonths(true);
    const result = await getPlannedMonths(householdId);
    const months = result.months || [];
    setCloneMonths(months);
    if (months.length > 0) {
      setSelectedCloneMonth(months[0].value);
    }
    setIsLoadingMonths(false);
  }

  // Focus amount input on mount (Phase 1)
  useEffect(() => {
    if (phase === 'income' && amountInputRef.current) {
      setTimeout(() => amountInputRef.current?.focus(), 300);
    }
  }, [phase]);

  // Sync phase if totalIncome changes (e.g., after recording)
  useEffect(() => {
    if (totalIncome > 0 && phase === 'income') {
      setPhase('choice');
    }
  }, [totalIncome]);

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

  const handleRecordIncome = async () => {
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
        transactionDate: `${month}-01`,
        paymentMethod: 'netbanking',
        remarks: null,
        loggedBy: currentUserId,
      });

      if (!result.success) {
        setError(result.error || 'Failed to record income');
        setIsSubmitting(false);
        return;
      }

      await onIncomeRecorded();
      // Transition to choice screen (phase will also update via totalIncome effect)
      setPhase('choice');
    } catch (e) {
      console.error('Failed to record income:', e);
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleLetsGo = () => {
    if (choice === 'suggestions') {
      onStartWithSuggestions();
    } else if (choice === 'clone') {
      onClone(selectedCloneMonth);
    } else {
      onStartBlank();
    }
  };

  const hasCloneSources = cloneMonths.length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Icon */}
      <div className="relative w-20 h-20 mx-auto mb-6">
        <div className="absolute inset-0 bg-primary-gradient rounded-3xl rotate-6 opacity-15" />
        <div className="relative w-20 h-20 bg-primary-gradient rounded-3xl flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.25)]">
          <span className="text-3xl">{phase === 'income' ? '💰' : '📊'}</span>
        </div>
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(251,191,36,0.4)]">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>
      </div>

      {phase === 'income' ? (
        /* ─── Phase 1: Income Entry ─── */
        <>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-1">
            How much did you earn?
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-6 max-w-xs leading-relaxed">
            Enter your {monthLabel} income to get started.
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

          {error && (
            <p className="text-xs text-[var(--color-danger)] mb-3">{error}</p>
          )}

          <button
            onClick={handleRecordIncome}
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
      ) : (
        /* ─── Phase 2: Choice Screen ─── */
        <>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-3">
            Plan {monthLabel} budget
          </h2>

          {/* Income pill */}
          {totalIncome > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full mb-6">
              <span className="text-xs">💰</span>
              <span className="text-xs font-semibold text-emerald-700">₹{formatNumber(totalIncome)} earned</span>
            </div>
          )}

          {/* "How do you want to start?" */}
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            How do you want to start?
          </p>

          {/* Radio options */}
          <div className="w-full max-w-xs space-y-2.5 mb-6 text-left">
            {/* Option: Suggestions from history */}
            {hasHistory && (
              <label
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  choice === 'suggestions'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] shadow-[0_0_0_1px_var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-white/60 hover:border-[var(--color-primary-light)]'
                }`}
                onClick={() => setChoice('suggestions')}
              >
                <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  choice === 'suggestions' ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-tertiary)]'
                }`}
                  style={{ width: '18px', height: '18px' }}
                >
                  {choice === 'suggestions' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Suggestions from history</p>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Based on your past spending</p>
                </div>
              </label>
            )}

            {/* Option: Clone from a past budget */}
            {hasCloneSources && !isLoadingMonths && (
              <label
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                  choice === 'clone'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] shadow-[0_0_0_1px_var(--color-primary)]'
                    : 'border-[var(--color-border)] bg-white/60 hover:border-[var(--color-primary-light)]'
                }`}
                onClick={() => setChoice('clone')}
              >
                <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  choice === 'clone' ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-tertiary)]'
                }`}
                  style={{ width: '18px', height: '18px' }}
                >
                  {choice === 'clone' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Clone from</p>
                    {cloneMonths.length === 1 ? (
                      <span className="text-sm font-medium text-[var(--color-primary)]">{cloneMonths[0].label}</span>
                    ) : (
                      <select
                        value={selectedCloneMonth}
                        onChange={(e) => { setSelectedCloneMonth(e.target.value); setChoice('clone'); }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-medium text-[var(--color-primary)] bg-transparent border-none outline-none cursor-pointer appearance-none pr-3"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%237c3aed' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right center',
                          backgroundSize: '0.75rem',
                          paddingRight: '1rem',
                        }}
                      >
                        {cloneMonths.map(m => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-tertiary)]">Copy exact amounts from a past budget</p>
                </div>
              </label>
            )}

            {/* Option: Start blank */}
            <label
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                choice === 'blank'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary-bg)] shadow-[0_0_0_1px_var(--color-primary)]'
                  : 'border-[var(--color-border)] bg-white/60 hover:border-[var(--color-primary-light)]'
              }`}
              onClick={() => setChoice('blank')}
            >
              <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                choice === 'blank' ? 'border-[var(--color-primary)]' : 'border-[var(--color-text-tertiary)]'
              }`}
                style={{ width: '18px', height: '18px' }}
              >
                {choice === 'blank' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">Start blank</p>
                <p className="text-xs text-[var(--color-text-tertiary)]">Set every amount yourself</p>
              </div>
            </label>
          </div>

          {/* CTA */}
          <button
            onClick={handleLetsGo}
            className="px-8 py-3 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
          >
            Let's go
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
