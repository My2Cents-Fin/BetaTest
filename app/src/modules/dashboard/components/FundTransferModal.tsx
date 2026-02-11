import { useState, useEffect, useRef } from 'react';
import { formatNumber } from '../../budget/components/AmountInput';
import { createTransaction, getTodayDate } from '../../budget/services/transactions';
import { supabase } from '../../../lib/supabase';

interface HouseholdMember {
  id: string;
  display_name: string;
}

interface FundTransferModalProps {
  householdId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function FundTransferModal({ householdId, onClose, onSuccess }: FundTransferModalProps) {
  const [amount, setAmount] = useState('');
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(getTodayDate());
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadHouseholdMembers();
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, []);

  async function loadHouseholdMembers() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return;
      }
      setCurrentUserId(user.id);

      console.log('Loading household members for household:', householdId);
      console.log('Current user ID:', user.id);

      // Get all household members except current user
      const { data: membersData, error: membersError } = await supabase
        .from('household_members')
        .select('user_id')
        .eq('household_id', householdId)
        .neq('user_id', user.id);

      if (membersError) {
        console.error('Supabase error loading household members:', membersError);
        throw membersError;
      }

      console.log('Raw household members data:', membersData);

      if (!membersData || membersData.length === 0) {
        console.log('No other household members found');
        setHouseholdMembers([]);
        return;
      }

      // Get user details for all member user_ids
      const userIds = membersData.map(m => m.user_id);
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', userIds);

      if (usersError) {
        console.error('Supabase error loading user details:', usersError);
        throw usersError;
      }

      console.log('User details data:', usersData);

      const members: HouseholdMember[] = (usersData || []).map((u: any) => ({
        id: u.id,
        display_name: u.display_name || 'Unknown',
      }));

      console.log('Processed household members:', members);
      setHouseholdMembers(members);
    } catch (e) {
      console.error('Error loading household members:', e);
    }
  }

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

  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full md:w-[420px] md:max-w-[90vw] bg-white rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">💸</span>
            <h2 className="text-base font-semibold text-gray-900">
              Record Fund Transfer
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-3 pt-4">
          {/* Amount Input */}
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
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Recipient Selection */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>👤</span> Paying To
            </label>
            {householdMembers.length === 0 ? (
              <div className="text-sm text-gray-400 py-2">
                No other household members
              </div>
            ) : (
              <div className="space-y-2">
                {householdMembers.map(member => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => setSelectedRecipientId(member.id)}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm text-left transition-colors ${
                      selectedRecipientId === member.id
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-gray-200 bg-white text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {member.display_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date */}
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
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Notes */}
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
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Error */}
          {error && <p className="text-sm text-red-500 text-center mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-4 py-3">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !amount || !selectedRecipientId}
            className={`
              w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
              ${isSubmitting || !amount || !selectedRecipientId
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white active:bg-blue-700'}
            `}
          >
            {isSubmitting ? 'Recording...' : 'Record Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}
