import { useState, useMemo } from 'react';
import { formatNumber } from '../../budget/components/AmountInput';
import type { TransactionWithDetails, HouseholdCard } from '../../budget/types';

interface CardDue {
  card: HouseholdCard;
  expenses: number;
  payments: number;
  outstanding: number;
}

// Card colors for the bar chart
const CARD_COLORS = [
  '#7C3AED', // Purple
  '#2563EB', // Blue
  '#059669', // Green
  '#D97706', // Amber
  '#DC2626', // Red
  '#0891B2', // Cyan
  '#7C2D12', // Brown
  '#4338CA', // Indigo
];

interface CCDuesSectionProps {
  transactions: TransactionWithDetails[];
  cards: HouseholdCard[];
  onPayBill?: (cardId: string, cardName: string, amount: number) => void;
}

export function CCDuesSection({ transactions, cards, onPayBill }: CCDuesSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate per-card outstanding: CC expenses - CC fund-transfer payments
  const cardDues = useMemo(() => {
    const dues: CardDue[] = [];

    for (const card of cards) {
      // CC expenses tagged to this card
      const expenses = transactions
        .filter(t => t.transaction_type === 'expense' && t.card_id === card.id)
        .reduce((sum, t) => sum + t.amount, 0);

      // CC payments (cc_payment transactions tagged to this card)
      const payments = transactions
        .filter(t => t.transaction_type === 'cc_payment' && t.card_id === card.id)
        .reduce((sum, t) => sum + t.amount, 0);

      const outstanding = expenses - payments;

      if (expenses > 0 || payments > 0) {
        dues.push({ card, expenses, payments, outstanding });
      }
    }

    // Sort by outstanding (highest first)
    return dues.sort((a, b) => b.outstanding - a.outstanding);
  }, [transactions, cards]);

  // Also include untagged CC expenses (payment_method='card' but no card_id)
  const untaggedCCExpenses = useMemo(() => {
    return transactions
      .filter(t => t.transaction_type === 'expense' && t.payment_method === 'card' && !t.card_id)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const totalOutstanding = cardDues.reduce((sum, d) => sum + d.outstanding, 0) + untaggedCCExpenses;
  const maxOutstanding = Math.max(...cardDues.map(d => d.outstanding), untaggedCCExpenses, 1);

  // Don't render if no CC activity at all
  if (totalOutstanding <= 0 && cardDues.length === 0 && untaggedCCExpenses <= 0) {
    return null;
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-base">💳</span>
          <span className="text-sm font-semibold text-gray-900">Credit Card Dues</span>
        </div>
        <span className={`text-sm font-bold ${totalOutstanding > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
          {totalOutstanding > 0 ? `₹${formatNumber(totalOutstanding)}` : 'Settled'}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[rgba(124,58,237,0.06)] px-4 py-3 space-y-3">
          {cardDues.map((due, idx) => {
            const color = CARD_COLORS[idx % CARD_COLORS.length];
            const barWidth = maxOutstanding > 0 ? Math.max((due.outstanding / maxOutstanding) * 100, 2) : 0;

            return (
              <div key={due.card.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">💳</span>
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {due.card.card_name} <span className="text-gray-400">•••• {due.card.last_four_digits}</span>
                    </span>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ml-2 ${due.outstanding > 0 ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]'}`}>
                    {due.outstanding > 0 ? `₹${formatNumber(due.outstanding)}` : 'Settled'}
                  </span>
                </div>

                {/* Bar */}
                {due.outstanding > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2.5 bg-black/[0.04] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(barWidth, 100)}%`, backgroundColor: color }}
                      />
                    </div>
                    {onPayBill && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPayBill(due.card.id, `${due.card.card_name} •••• ${due.card.last_four_digits}`, due.outstanding);
                        }}
                        className="text-[10px] font-semibold text-[var(--color-primary)] bg-[var(--color-primary-bg)] px-2 py-1 rounded-lg hover:bg-[rgba(124,58,237,0.15)] transition-colors whitespace-nowrap flex-shrink-0"
                      >
                        Pay Bill
                      </button>
                    )}
                  </div>
                )}

                {/* Breakdown */}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                  <span>Spent: ₹{formatNumber(due.expenses)}</span>
                  {due.payments > 0 && <span>Paid: ₹{formatNumber(due.payments)}</span>}
                </div>
              </div>
            );
          })}

          {/* Untagged CC expenses */}
          {untaggedCCExpenses > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm">💳</span>
                  <span className="text-xs font-medium text-gray-500 italic">Other CC Expenses</span>
                </div>
                <span className="text-xs font-bold text-[var(--color-warning)]">
                  ₹{formatNumber(untaggedCCExpenses)}
                </span>
              </div>
              <div className="flex-1 h-2.5 bg-black/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-gray-400"
                  style={{ width: `${Math.min((untaggedCCExpenses / maxOutstanding) * 100, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Not tagged to a specific card</p>
            </div>
          )}

          {cardDues.length === 0 && untaggedCCExpenses > 0 && (
            <p className="text-[10px] text-gray-400 text-center pt-1">
              Tag expenses to specific cards for per-card tracking
            </p>
          )}
        </div>
      )}
    </div>
  );
}
