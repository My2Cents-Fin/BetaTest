import { useState, useEffect, useRef } from 'react';
import { formatNumber } from '../../budget/components/AmountInput';
import { createTransaction, getTodayDate } from '../../budget/services/transactions';

interface HouseholdMember {
  id: string;
  displayName: string;
}

interface FundTransferModalProps {
  householdId: string;
  householdUsers: HouseholdMember[];
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FundTransferModal({ householdId, householdUsers, currentUserId, onClose, onSuccess }: FundTransferModalProps) {
  // Initialize with pre-loaded data — no async fetch needed
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState<string>(currentUserId);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string>(() => {
    // Auto-default "Paid to" for 2-member households
    const otherMembers = householdUsers.filter(u => u.id !== currentUserId);
    return otherMembers.length === 1 ? otherMembers[0].id : '';
  });
  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, []);

  // When "Paid by" changes, update "Paid to" intelligently
  const handlePaidByChange = (newPaidBy: string) => {
    setPaidBy(newPaidBy);

    const otherMembers = householdUsers.filter(u => u.id !== newPaidBy);

    if (otherMembers.length === 1) {
      // 2-member household: auto-switch "Paid to" to the other person
      setSelectedRecipientId(otherMembers[0].id);
    } else if (selectedRecipientId === newPaidBy) {
      // >2 members: if "Paid to" was the same person, clear it
      setSelectedRecipientId('');
    }
  };

  // Get available recipients for "Paid to" dropdown (everyone except "Paid by")
  const availableRecipients = householdUsers.filter(u => u.id !== paidBy);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw);
    setError(null);
  };

  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (amount && selectedRecipientId && !isSubmitting) {
        handleSubmit();
      }
    }
  };

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.key === 'Enter' && amount && selectedRecipientId && !isSubmitting) {
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

    if (!selectedRecipientId) {
      setError('Select recipient');
      return;
    }

    if (!paidBy) {
      setError('Please select who paid');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    // Create fund transfer transaction
    const result = await createTransaction({
      householdId,
      subCategoryId: '', // No sub-category for transfers
      amount: numAmount,
      transactionType: 'transfer',
      transactionDate,
      paymentMethod: 'other', // Not applicable for transfers
      remarks: remarks.trim() || undefined,
      transferTo: selectedRecipientId,
      loggedBy: paidBy || undefined, // Include paidBy
    });

    setIsSubmitting(false);

    if (result.success) {
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
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              Record Fund Transfer
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
          {/* 1. Amount */}
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
              onKeyDown={handleAmountKeyDown}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* 2. Paid By */}
          {householdUsers.length > 1 && (
            <div className="mb-5">
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <span>💳</span> Paid by
              </label>
              <select
                value={paidBy}
                onChange={(e) => handlePaidByChange(e.target.value)}
                onKeyDown={handleFieldKeyDown}
                className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
              >
                {householdUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName}{user.id === currentUserId ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Paid To */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>👤</span> Paid to
            </label>
            {availableRecipients.length === 0 ? (
              <div className="text-sm text-gray-400 py-2">
                No other household members
              </div>
            ) : (
              <select
                value={selectedRecipientId}
                onChange={(e) => setSelectedRecipientId(e.target.value)}
                onKeyDown={handleFieldKeyDown}
                className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
              >
                {availableRecipients.length > 1 && (
                  <option value="" disabled>Select recipient</option>
                )}
                {availableRecipients.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.displayName}{member.id === currentUserId ? ' (You)' : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Date */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>📅</span> Date
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              onKeyDown={handleFieldKeyDown}
              max={getTodayDate()}
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* 5. Notes */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>📝</span> Notes
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              onKeyDown={handleFieldKeyDown}
              placeholder="Optional"
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !selectedRecipientId || !paidBy}
            className={`
              w-full py-2.5 rounded-xl text-sm font-semibold transition-all
              ${isSubmitting || !amount || !selectedRecipientId || !paidBy
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0'}
            `}
          >
            {isSubmitting ? 'Recording...' : 'Record Transfer'}
          </button>
          <p className="text-[10px] text-gray-400 text-center mt-2 flex items-center justify-center gap-1">
            <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Stored in your household's private vault, only visible to you and other members in this household
          </p>
        </div>
      </div>
    </div>
  );
}
