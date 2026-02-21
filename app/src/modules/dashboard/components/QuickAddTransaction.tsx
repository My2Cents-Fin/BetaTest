import { useState, useEffect, useRef, useMemo } from 'react';
import { formatNumber } from '../../budget/components/AmountInput';
import { createTransaction, updateTransaction, getTodayDate } from '../../budget/services/transactions';
import type { TransactionType, TransactionWithDetails } from '../../budget/types';

interface SubCategoryOption {
  id: string;
  name: string;
  icon: string | null;
  categoryName: string;
  categoryType: 'income' | 'expense';
}

interface QuickAddTransactionProps {
  householdId: string;
  subCategories: SubCategoryOption[];
  householdUsers?: { id: string; displayName: string }[];
  currentUserId?: string;
  recentSubCategoryIds?: string[];
  onClose: () => void;
  onSuccess: () => void;
  // Optional: pass transaction for edit mode
  transaction?: TransactionWithDetails;
  mode?: 'add' | 'edit';
}

export function QuickAddTransaction({
  householdId,
  subCategories,
  householdUsers = [],
  currentUserId = '',
  onClose,
  onSuccess,
  transaction,
  mode = 'add',
}: QuickAddTransactionProps) {
  const isEditMode = mode === 'edit' && transaction;

  // Initialize state with transaction values if editing, using pre-loaded data
  const [amount, setAmount] = useState(() =>
    isEditMode ? String(transaction.amount) : ''
  );
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState<string | null>(() =>
    isEditMode ? transaction.sub_category_id : null
  );
  const [transactionDate, setTransactionDate] = useState(() =>
    isEditMode ? transaction.transaction_date : getTodayDate()
  );
  const [remarks, setRemarks] = useState(() =>
    isEditMode ? (transaction.remarks || '') : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState(() => {
    if (isEditMode) {
      const icon = transaction.sub_category_icon || '📦';
      return `${icon} ${transaction.sub_category_name}`;
    }
    return '';
  });
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [paidBy, setPaidBy] = useState<string>(() =>
    isEditMode ? (transaction.logged_by || '') : currentUserId
  );

  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const expenseCategories = subCategories.filter(c => c.categoryType === 'expense');
  const incomeCategories = subCategories.filter(c => c.categoryType === 'income');

  // Extract search text (remove emoji if present at start)
  const getSearchText = (text: string) => {
    // Remove emoji prefix if present (icon + space + name)
    const parts = text.split(' ');
    if (parts.length > 1 && /^\p{Emoji}/u.test(parts[0])) {
      return parts.slice(1).join(' ').toLowerCase();
    }
    return text.toLowerCase();
  };

  // Filter categories based on search
  const filteredExpenseCategories = useMemo(() => {
    if (!categorySearch.trim()) return expenseCategories;
    const search = getSearchText(categorySearch);
    return expenseCategories.filter(c => c.name.toLowerCase().includes(search));
  }, [expenseCategories, categorySearch]);

  const filteredIncomeCategories = useMemo(() => {
    if (!categorySearch.trim()) return incomeCategories;
    const search = getSearchText(categorySearch);
    return incomeCategories.filter(c => c.name.toLowerCase().includes(search));
  }, [incomeCategories, categorySearch]);

  // Combined list for keyboard navigation
  const allFilteredCategories = useMemo(() => {
    return [...filteredExpenseCategories, ...filteredIncomeCategories];
  }, [filteredExpenseCategories, filteredIncomeCategories]);

  const handleCategorySelect = (cat: SubCategoryOption) => {
    setSelectedSubCategoryId(cat.id);
    setCategorySearch(`${cat.icon || (cat.categoryType === 'income' ? '💰' : '📦')} ${cat.name}`);
    setShowCategoryDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleCategoryKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCategoryDropdown) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setShowCategoryDropdown(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < allFilteredCategories.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allFilteredCategories.length) {
          handleCategorySelect(allFilteredCategories[highlightedIndex]);
        }
        break;
      case 'Escape':
        setShowCategoryDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Handle Enter on amount input to submit or move to category
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (amount && selectedSubCategoryId && !isSubmitting) {
        handleSubmit();
      } else {
        categoryInputRef.current?.focus();
      }
    }
  };

  // Handle Enter on other fields to submit
  const handleFieldKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && amount && selectedSubCategoryId && !isSubmitting) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAmount(raw);
    setError(null);
  };

  const handleSubmit = async () => {
    const numAmount = parseInt(amount, 10) || 0;

    if (numAmount <= 0) {
      setError('Enter amount');
      amountInputRef.current?.focus();
      return;
    }

    // In add mode, category is required. In edit mode, allow null (uncategorized).
    if (!isEditMode && !selectedSubCategoryId) {
      setError('Select category');
      return;
    }

    const selectedCategory = selectedSubCategoryId ? subCategories.find(c => c.id === selectedSubCategoryId) : null;
    const transactionType: TransactionType = selectedCategory?.categoryType === 'income' ? 'income' : 'expense';

    setIsSubmitting(true);
    setError(null);

    let result;

    if (isEditMode && transaction) {
      // Update existing transaction
      result = await updateTransaction(transaction.id, {
        amount: numAmount,
        subCategoryId: selectedSubCategoryId,
        transactionType,
        transactionDate,
        remarks: remarks.trim() || '',
      });
    } else {
      // Create new transaction
      result = await createTransaction({
        householdId,
        subCategoryId: selectedSubCategoryId,
        amount: numAmount,
        transactionType,
        transactionDate,
        paymentMethod: 'upi',
        remarks: remarks.trim() || undefined,
        loggedBy: paidBy || undefined, // Include paidBy
      });
    }

    setIsSubmitting(false);

    if (result.success) {
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Failed to save');
    }
  };

  const selectedCategory = subCategories.find(c => c.id === selectedSubCategoryId);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - bottom sheet on mobile, centered card on desktop */}
      <div className="relative w-full md:w-[420px] md:max-w-[90vw] bg-white/90 backdrop-blur-xl rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[0_8px_40px_rgba(0,0,0,0.12)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(124,58,237,0.06)]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-bg)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {isEditMode ? 'Edit Transaction' : 'Add Transaction'}
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
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* Category Search Dropdown */}
          <div className="mb-5 relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <span>📁</span> Category
              </label>
              {/* Income/Expense indicator */}
              {selectedCategory && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  selectedCategory.categoryType === 'income'
                    ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]'
                    : 'bg-red-50 text-[var(--color-danger)]'
                }`}>
                  {selectedCategory.categoryType === 'income' ? '↑ Income' : '↓ Expense'}
                </span>
              )}
            </div>
            <input
              ref={categoryInputRef}
              type="text"
              value={categorySearch}
              onChange={(e) => {
                setCategorySearch(e.target.value);
                setShowCategoryDropdown(true);
                setHighlightedIndex(0);
                if (!e.target.value) setSelectedSubCategoryId(null);
              }}
              onFocus={() => {
                setShowCategoryDropdown(true);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleCategoryKeyDown}
              placeholder="Search or select..."
              className={`w-full px-3 py-2.5 border rounded-xl text-sm bg-white/75 focus:outline-none focus:ring-2 focus:ring-[rgba(124,58,237,0.15)] ${
                selectedCategory?.categoryType === 'income'
                  ? 'border-[var(--color-success)] focus:border-[var(--color-success)]'
                  : selectedCategory?.categoryType === 'expense'
                    ? 'border-[var(--color-danger)]/50 focus:border-[var(--color-danger)]'
                    : 'border-[rgba(124,58,237,0.15)] focus:border-[var(--color-primary)]'
              }`}
            />
            {/* Dropdown */}
            {showCategoryDropdown && (filteredExpenseCategories.length > 0 || filteredIncomeCategories.length > 0) && (
              <div className="absolute z-10 w-full mt-1 bg-white/90 backdrop-blur-xl border border-[rgba(124,58,237,0.1)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] max-h-40 overflow-y-auto">
                {filteredExpenseCategories.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase bg-[var(--color-primary-bg)]/50">Expense</div>
                    {filteredExpenseCategories.map((cat, idx) => (
                      <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat)}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                          highlightedIndex === idx ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]' :
                          selectedSubCategoryId === cat.id ? 'bg-[var(--color-primary-bg)]/50 text-[var(--color-primary)]' :
                          'text-gray-900 hover:bg-white/60'
                        }`}
                      >
                        <span>{cat.icon || '📦'}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </>
                )}
                {filteredIncomeCategories.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase bg-[var(--color-success-bg)]/50">Income</div>
                    {filteredIncomeCategories.map((cat, idx) => {
                      const globalIdx = filteredExpenseCategories.length + idx;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleCategorySelect(cat)}
                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                            highlightedIndex === globalIdx ? 'bg-[var(--color-success-bg)] text-[var(--color-success)]' :
                            selectedSubCategoryId === cat.id ? 'bg-[var(--color-success-bg)]/50 text-[var(--color-success)]' :
                            'text-gray-900 hover:bg-white/60'
                          }`}
                        >
                          <span>{cat.icon || '💰'}</span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>📅</span> Date of Payment
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

          {/* Paid By */}
          {householdUsers.length > 1 && (
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <span>👤</span> Paid by
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
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

          {/* Bank Description (read-only, shown only for imported transactions in edit mode) */}
          {isEditMode && transaction?.original_narration && (
            <div className="mb-4">
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <span>🏦</span> Bank Description
              </label>
              <div className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.08)] rounded-xl text-sm text-gray-500 bg-gray-50/75 italic">
                {transaction.original_narration}
              </div>
            </div>
          )}

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
            disabled={isSubmitting || !amount || (!isEditMode && !selectedSubCategoryId)}
            className={`
              w-full py-2.5 rounded-xl text-sm font-semibold transition-all
              ${isSubmitting || !amount || (!isEditMode && !selectedSubCategoryId)
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                : 'bg-primary-gradient text-white shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 active:translate-y-0'}
            `}
          >
            {isSubmitting
              ? 'Saving...'
              : isEditMode
                ? 'Update Transaction'
                : `Add ${selectedCategory?.categoryType === 'income' ? 'Income' : 'Expense'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
