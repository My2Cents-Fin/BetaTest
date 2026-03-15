import { useState, useEffect, useRef } from 'react';
import { formatNumber } from '../../budget/components/AmountInput';
import { createTransaction, getTodayDate, fireCrossTxnAlert } from '../../budget/services/transactions';
import type { HouseholdCard } from '../../budget/types';

interface HouseholdMember {
  id: string;
  displayName: string;
}

interface CCPaymentModalProps {
  householdId: string;
  currentUserId: string;
  householdUsers: HouseholdMember[];
  cards: HouseholdCard[];
  /** Pre-selected card ID (from Pay Bill button) */
  preSelectedCardId?: string;
  /** Pre-filled amount (outstanding balance) */
  preFilledAmount?: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function CCPaymentModal({
  householdId,
  currentUserId,
  householdUsers,
  cards,
  preSelectedCardId,
  preFilledAmount,
  onClose,
  onSuccess,
}: CCPaymentModalProps) {
  const [amount, setAmount] = useState(() =>
    preFilledAmount && preFilledAmount > 0 ? String(Math.round(preFilledAmount)) : ''
  );
  const [selectedCardId, setSelectedCardId] = useState<string>(preSelectedCardId || (cards.length === 1 ? cards[0].id : ''));
  const [paidBy, setPaidBy] = useState<string>(currentUserId);
  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, []);

  const activeCards = cards.filter(c => c.is_active);
  const selectedCard = cards.find(c => c.id === selectedCardId);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && amount && selectedCardId && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    const numAmount = parseInt(amount, 10) || 0;

    if (numAmount <= 0) {
      setError('Enter amount');
      amountInputRef.current?.focus();
      return;
    }

    if (!selectedCardId) {
      setError('Select a card');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createTransaction({
      householdId,
      subCategoryId: null,
      amount: numAmount,
      transactionType: 'cc_payment',
      transactionDate,
      paymentMethod: 'netbanking', // Bank → CC company
      remarks: remarks.trim() || `CC bill payment${selectedCard ? ` - ${selectedCard.card_name}` : ''}`,
      cardId: selectedCardId,
      loggedBy: paidBy || undefined,
    });

    setIsSubmitting(false);

    if (result.success) {
      fireCrossTxnAlert({
        action: 'create',
        userId: paidBy || currentUserId,
        householdId,
        amount: numAmount,
        transactionType: 'cc_payment',
      });
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Failed to save');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:w-[420px] md:max-w-[90vw] bg-white/90 backdrop-blur-xl rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(124,58,237,0.06)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
              <span className="text-sm">💳</span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Pay CC Bill
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-white/60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 pt-4">
          {/* 1. Card selector */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>💳</span> Card
            </label>
            {activeCards.length === 1 ? (
              <div className="px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75">
                {activeCards[0].card_name} •••• {activeCards[0].last_four_digits}
              </div>
            ) : (
              <select
                value={selectedCardId}
                onChange={(e) => { setSelectedCardId(e.target.value); setError(null); }}
                onKeyDown={handleKeyDown}
                className="w-full px-3 pr-8 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
              >
                <option value="">Select card</option>
                {activeCards.map(card => (
                  <option key={card.id} value={card.id}>
                    {card.card_name} •••• {card.last_four_digits}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 2. Paid by */}
          {householdUsers.length > 1 && (
            <div className="mb-5">
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <span>👤</span> Paid by
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 pr-8 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
              >
                {householdUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.displayName}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Amount */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>💵</span> Amount (in ₹)
            </label>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="numeric"
              value={amount ? formatNumber(parseInt(amount, 10)) : ''}
              onChange={handleAmountChange}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
            {preFilledAmount && preFilledAmount > 0 && (
              <p className="text-[10px] text-gray-400 mt-1">Outstanding: ₹{formatNumber(Math.round(preFilledAmount))}</p>
            )}
          </div>

          {/* 3. Date */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>📅</span> Date
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* 4. Remarks (optional) */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>📝</span> Remarks <span className="text-gray-300">(optional)</span>
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., March statement"
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[rgba(124,58,237,0.06)]">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !selectedCardId}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
              isSubmitting || !amount || !selectedCardId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
