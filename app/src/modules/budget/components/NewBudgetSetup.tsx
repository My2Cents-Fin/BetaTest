import { useState, useEffect } from 'react';
import { getPlannedMonths } from '../services/budget';
import { getCurrentMonth } from './MonthSelector';

interface NewBudgetSetupProps {
  householdId: string;
  targetMonth: string; // YYYY-MM — the month being planned
  onClone: (sourceMonth: string) => void;
  onFresh: () => void;
  onBack: () => void;
}

/**
 * "Plan Your Budget" page — lets user choose between cloning
 * a previous month's budget or starting fresh.
 *
 * Behavior:
 * - Multiple planned months → dropdown + clone CTA (primary) + skip link (secondary)
 * - Single planned month → simplified "Clone X's budget?" + skip link
 * - No planned months → auto-triggers onFresh (never shown)
 */
export function NewBudgetSetup({ householdId, targetMonth, onClone, onFresh, onBack }: NewBudgetSetupProps) {
  const [plannedMonths, setPlannedMonths] = useState<{ value: string; label: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const currentMonth = getCurrentMonth();
  const targetLabel = new Date(targetMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    loadPlannedMonths();
  }, [householdId]);

  async function loadPlannedMonths() {
    setIsLoading(true);
    const result = await getPlannedMonths(householdId);
    const months = result.months || [];

    if (months.length === 0) {
      // No planned months at all — go straight to fresh
      onFresh();
      return;
    }

    setPlannedMonths(months);

    // Default selection: current month if it has a plan, otherwise the most recent
    const currentMonthPlan = months.find(m => m.value === currentMonth);
    if (currentMonthPlan) {
      setSelectedSource(currentMonthPlan.value);
    } else {
      setSelectedSource(months[0].value);
    }

    setIsLoading(false);
  }

  const handleClone = () => {
    if (selectedSource) {
      onClone(selectedSource);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-page-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isSingleMonth = plannedMonths.length === 1;
  const singleMonthLabel = isSingleMonth ? plannedMonths[0].label : '';

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* Header */}
      <header className="glass-header px-4 py-3 flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Plan {targetLabel}
        </h1>
      </header>

      {/* Content */}
      <main className="p-6 max-w-md mx-auto">
        <div className="mt-8 space-y-6">
          {/* Clone Card (Primary) */}
          <div className="glass-card glass-card-elevated p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[var(--color-primary-bg)] rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  {isSingleMonth ? `Clone ${singleMonthLabel}'s budget?` : 'Clone from a previous month'}
                </h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                  Copy all categories & planned amounts
                </p>
              </div>
            </div>

            {/* Month Dropdown (only if multiple months) */}
            {!isSingleMonth && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5">
                  Clone from
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white/80 border border-[var(--color-border)] rounded-xl text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.75rem center',
                    backgroundSize: '1rem',
                    paddingRight: '2.5rem',
                  }}
                >
                  {plannedMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clone Button */}
            <button
              onClick={handleClone}
              className="w-full py-3 bg-primary-gradient text-white font-medium rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] active:scale-[0.98] transition-all"
            >
              Clone Budget
            </button>
          </div>

          {/* Fresh Option (Secondary) */}
          <div className="text-center">
            <button
              onClick={onFresh}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors underline underline-offset-2"
            >
              Skip and start new plan
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
