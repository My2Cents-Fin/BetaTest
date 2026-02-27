interface BudgetEmptyStateProps {
  month: string; // YYYY-MM
  onPlanBudget: () => void;
}

/**
 * Empty state shown when user navigates to a month with no budget plan.
 * Shows a friendly message and a CTA to create a plan.
 */
export function BudgetEmptyState({ month, onPlanBudget }: BudgetEmptyStateProps) {
  const monthLabel = new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Illustration */}
      <div className="w-20 h-20 bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center mb-5">
        <span className="text-4xl">📋</span>
      </div>

      {/* Message */}
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        Budget not planned
      </h2>
      <p className="text-sm text-[var(--color-text-secondary)] mb-8 max-w-xs leading-relaxed">
        You haven't created a budget for {monthLabel} yet. Set one up to start tracking your spending.
      </p>

      {/* CTA */}
      <button
        onClick={onPlanBudget}
        className="px-6 py-3 bg-primary-gradient text-white font-medium rounded-2xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(124,58,237,0.35)] active:scale-[0.98] transition-all"
      >
        Plan your budget
      </button>
    </div>
  );
}
