import { useState, useEffect } from 'react';
import { getPlannedMonths } from '../services/budget';
import { getCurrentMonth } from './MonthSelector';

interface BudgetEmptyStateProps {
  month: string; // YYYY-MM
  householdId: string;
  onClone: (sourceMonth: string) => void;
  onFresh: () => void;
}

/**
 * Empty state shown when user navigates to a month with no budget plan.
 * Combines the illustration, clone option, and fresh start into one screen.
 */
export function BudgetEmptyState({ month, householdId, onClone, onFresh }: BudgetEmptyStateProps) {
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const [plannedMonths, setPlannedMonths] = useState<{ value: string; label: string }[]>([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlannedMonths();
  }, [householdId]);

  async function loadPlannedMonths() {
    setIsLoading(true);
    const result = await getPlannedMonths(householdId);
    const months = result.months || [];
    setPlannedMonths(months);

    // Default: current month if it has a plan, otherwise the most recent
    const currentMonth = getCurrentMonth();
    const currentPlan = months.find(m => m.value === currentMonth);
    setSelectedSource(currentPlan ? currentPlan.value : (months[0]?.value || ''));
    setIsLoading(false);
  }

  const hasCloneSource = plannedMonths.length > 0;
  const isSingleMonth = plannedMonths.length === 1;
  const singleMonthLabel = isSingleMonth ? plannedMonths[0].label : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Themed illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div className="absolute inset-0 bg-primary-gradient rounded-3xl rotate-6 opacity-15" />
        <div className="relative w-24 h-24 bg-primary-gradient rounded-3xl flex items-center justify-center shadow-[0_8px_24px_rgba(124,58,237,0.25)]">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
          </svg>
        </div>
        {/* Decorative sparkle */}
        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(251,191,36,0.4)]">
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </div>
        {/* Secondary accent dot */}
        <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-emerald-400 rounded-full opacity-80 shadow-[0_2px_6px_rgba(52,211,153,0.4)]" />
      </div>

      {/* Message */}
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        No budget for {monthLabel}
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-6 max-w-xs leading-relaxed">
        Set up a plan to start tracking your spending this month.
      </p>

      {/* Actions */}
      {isLoading ? (
        <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      ) : (
        <div className="space-y-2.5">
          {/* Clone option (primary) — only if past frozen months exist */}
          {hasCloneSource && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onClone(selectedSource)}
                className="px-5 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 active:scale-[0.98] transition-all whitespace-nowrap"
              >
                {isSingleMonth ? `Clone ${singleMonthLabel}` : 'Clone budget'}
              </button>
              {/* Month picker (only if multiple source months) */}
              {!isSingleMonth && (
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="px-2 py-2 bg-white/80 border border-[var(--color-border)] rounded-xl text-xs text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '0.75rem',
                    paddingRight: '1.75rem',
                  }}
                >
                  {plannedMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Fresh start option */}
          {hasCloneSource ? (
            <button
              onClick={onFresh}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-primary)] transition-colors"
            >
              or start fresh
            </button>
          ) : (
            <button
              onClick={onFresh}
              className="px-5 py-2 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.25)] hover:-translate-y-0.5 active:scale-[0.98] transition-all"
            >
              Start planning
            </button>
          )}
        </div>
      )}
    </div>
  );
}
