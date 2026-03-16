import { useState, useEffect, useRef, useMemo } from 'react';
import { formatNumber } from '../../budget/components/AmountInput';
import { createTransaction, updateTransaction, getTodayDate, fireCrossTxnAlert } from '../../budget/services/transactions';
import { createSubCategory } from '../../budget/services/budget';
import { getActiveHouseholdCards } from '../../budget/services/cards';
import type { TransactionType, TransactionWithDetails, HouseholdCard } from '../../budget/types';

interface SubCategoryOption {
  id: string;
  name: string;
  icon: string | null;
  categoryName: string;
  categoryType: 'income' | 'expense';
  categoryId: string;
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
  const [isCreditCard, setIsCreditCard] = useState<boolean>(() =>
    isEditMode ? transaction.payment_method === 'card' : false
  );
  const [selectedCardId, setSelectedCardId] = useState<string | null>(() =>
    isEditMode ? (transaction.card_id || null) : null
  );
  const [householdCards, setHouseholdCards] = useState<HouseholdCard[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [localSubCategories, setLocalSubCategories] = useState<SubCategoryOption[]>([]);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTimeout(() => amountInputRef.current?.focus(), 100);
  }, []);

  // Fetch active cards when CC toggle is on (or on mount in edit mode)
  useEffect(() => {
    if (isCreditCard && householdCards.length === 0) {
      getActiveHouseholdCards(householdId).then(result => {
        if (result.success && result.cards) {
          setHouseholdCards(result.cards);
        }
      });
    }
  }, [isCreditCard, householdId]);

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

  // Merge props + locally created subcategories
  const mergedSubCategories = useMemo(
    () => [...subCategories, ...localSubCategories],
    [subCategories, localSubCategories]
  );

  const expenseCategories = mergedSubCategories.filter(c => c.categoryType === 'expense');
  const incomeCategories = mergedSubCategories.filter(c => c.categoryType === 'income');

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

  // Determine if the "+ Create" option should show
  const createDisplayName = useMemo(() => {
    return getSearchText(categorySearch).trim();
  }, [categorySearch]);

  const showCreateOption = useMemo(() => {
    if (!createDisplayName) return false;
    // Don't show if there's an exact match (case-insensitive)
    const exactMatch = mergedSubCategories.some(
      c => c.name.toLowerCase() === createDisplayName.toLowerCase()
    );
    if (exactMatch) return false;
    // Need at least one Variable subcategory to derive the category UUID
    const variableCat = mergedSubCategories.find(c => c.categoryName === 'Variable');
    return !!variableCat;
  }, [createDisplayName, mergedSubCategories]);

  const handleCategorySelect = (cat: SubCategoryOption) => {
    setSelectedSubCategoryId(cat.id);
    setCategorySearch(`${cat.icon || (cat.categoryType === 'income' ? '💰' : '📦')} ${cat.name}`);
    setShowCategoryDropdown(false);
    setHighlightedIndex(-1);
    // Reset CC toggle + card when selecting income category
    if (cat.categoryType === 'income') {
      setIsCreditCard(false);
      setSelectedCardId(null);
    }
  };

  const handleCreateSubCategory = async () => {
    const name = getSearchText(categorySearch).trim();
    if (!name || isCreating) return;

    // Find the Variable category UUID from existing subcategories
    const variableCat = mergedSubCategories.find(c => c.categoryName === 'Variable');
    if (!variableCat) return;

    setIsCreating(true);
    setError(null);

    const result = await createSubCategory(
      householdId,
      variableCat.categoryId,
      name,
      '📦'
    );

    setIsCreating(false);

    if (result.success && result.subCategory) {
      const newOption: SubCategoryOption = {
        id: result.subCategory.id,
        name: result.subCategory.name,
        icon: result.subCategory.icon || '📦',
        categoryName: 'Variable',
        categoryType: 'expense',
        categoryId: variableCat.categoryId,
      };
      setLocalSubCategories(prev => [...prev, newOption]);
      handleCategorySelect(newOption);
    } else {
      setError(result.error || 'Failed to create category');
    }
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
        {
          const maxIndex = allFilteredCategories.length + (showCreateOption ? 0 : -1);
          setHighlightedIndex(prev => prev < maxIndex ? prev + 1 : prev);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < allFilteredCategories.length) {
          handleCategorySelect(allFilteredCategories[highlightedIndex]);
        } else if (showCreateOption && highlightedIndex === allFilteredCategories.length) {
          handleCreateSubCategory();
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
    let raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 2) raw = parts[0] + '.' + parts[1].slice(0, 2);
    setAmount(raw);
    setError(null);
  };

  const handleSubmit = async () => {
    const numAmount = parseFloat(amount) || 0;

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

    const selectedCategory = selectedSubCategoryId ? mergedSubCategories.find(c => c.id === selectedSubCategoryId) : null;
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
        paymentMethod: transactionType === 'income' ? 'upi' : (isCreditCard ? 'card' : 'upi'),
        cardId: isCreditCard ? (selectedCardId || null) : null,
      });
    } else {
      // Create new transaction
      result = await createTransaction({
        householdId,
        subCategoryId: selectedSubCategoryId,
        amount: numAmount,
        transactionType,
        transactionDate,
        paymentMethod: transactionType === 'income' ? 'upi' : (isCreditCard ? 'card' : 'upi'),
        remarks: remarks.trim() || undefined,
        loggedBy: paidBy || undefined, // Include paidBy
        cardId: isCreditCard ? (selectedCardId || undefined) : undefined,
      });
    }

    setIsSubmitting(false);

    if (result.success) {
      // Fire cross-transaction alert to other household members
      if (currentUserId) {
        fireCrossTxnAlert({
          action: isEditMode ? 'update' : 'create',
          userId: paidBy || currentUserId,
          householdId,
          amount: numAmount,
          oldAmount: isEditMode && transaction ? transaction.amount : undefined,
          subCategoryName: selectedCategory?.name || null,
          categoryName: selectedCategory?.categoryName || null,
          transactionType,
        });
      }
      onSuccess();
      onClose();
    } else {
      setError(result.error || 'Failed to save');
    }
  };

  const selectedCategory = mergedSubCategories.find(c => c.id === selectedSubCategoryId);

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
              inputMode="decimal"
              value={amount ? (amount.includes('.') ? amount : formatNumber(parseFloat(amount), { showDecimals: true })) : ''}
              onChange={handleAmountChange}
              onKeyDown={handleAmountKeyDown}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 placeholder:text-gray-400 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
            />
          </div>

          {/* Date — before category so user picks the month context first */}
          <div className="mb-5">
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <span>📅</span> Date of Payment
            </label>
            <input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
              onKeyDown={handleFieldKeyDown}
              className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
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
            {showCategoryDropdown && (filteredExpenseCategories.length > 0 || filteredIncomeCategories.length > 0 || showCreateOption) && (
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
                {showCreateOption && (
                  <>
                    <div className="border-t border-[rgba(124,58,237,0.08)]" />
                    <button
                      onClick={handleCreateSubCategory}
                      disabled={isCreating}
                      className={`w-full px-3 py-2.5 text-left text-sm flex items-center gap-2 ${
                        highlightedIndex === allFilteredCategories.length
                          ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)]'
                          : 'text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)]/50'
                      }`}
                    >
                      <span className="text-base">+</span>
                      <span className="font-medium">
                        {isCreating ? 'Creating...' : `Create "${createDisplayName}"`}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">in Variable</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Credit Card Toggle — only for expense transactions */}
          {selectedCategory?.categoryType !== 'income' && (
            <div className="mb-4">
              <div className="flex items-center justify-between px-1">
                <label className="text-xs text-gray-500 flex items-center gap-1.5">
                  <span>💳</span> Paid with Credit Card?
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCreditCard;
                    setIsCreditCard(next);
                    if (!next) setSelectedCardId(null);
                  }}
                  className={`relative w-10 h-[22px] rounded-full transition-colors ${
                    isCreditCard
                      ? 'bg-[var(--color-primary)]'
                      : 'bg-gray-200'
                  }`}
                >
                  <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
                    isCreditCard ? 'translate-x-[18px]' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              {/* Card Picker — shown when CC toggle is on */}
              {isCreditCard && (
                <div className="mt-2 px-1">
                  {householdCards.length > 0 ? (
                    <>
                      <select
                        value={selectedCardId || ''}
                        onChange={(e) => setSelectedCardId(e.target.value || null)}
                        className="w-full px-3 py-2.5 border border-[rgba(124,58,237,0.15)] rounded-xl text-sm text-gray-900 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                      >
                        <option value="">Select a card (optional)</option>
                        {householdCards.map(card => (
                          <option key={card.id} value={card.id}>
                            {card.card_name} •••• {card.last_four_digits}{card.card_owner ? ` (${card.card_owner})` : ''}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-gray-400 mt-1 ml-1">Only active cards are shown</p>
                    </>
                  ) : (
                    <p className="text-[11px] text-gray-400 ml-1">No cards added yet. Add cards from Profile &rarr; Settings &rarr; Credit Cards.</p>
                  )}
                </div>
              )}
            </div>
          )}

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
