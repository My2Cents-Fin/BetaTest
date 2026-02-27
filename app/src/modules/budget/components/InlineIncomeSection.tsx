import { useState, useRef, useEffect, useCallback } from 'react';
import { formatNumber } from './AmountInput';
import { createTransaction, updateTransaction, deleteTransaction } from '../services/transactions';
import { createSubCategory } from '../services/budget';
import type { ActualIncomeItem } from '../services/transactions';
import { INCOME_CATEGORY } from '../data/defaultCategories';

interface IncomeSubCategory {
  id: string;
  name: string;
  icon: string;
}

interface InlineIncomeSectionProps {
  householdId: string;
  month: string; // YYYY-MM
  householdUsers: { id: string; displayName: string }[];
  currentUserId: string;
  incomeSubCategories: IncomeSubCategory[];
  incomeCategoryId: string; // The system "Income" category ID
  incomeItems: ActualIncomeItem[];
  totalIncome: number;
  onIncomeChanged: () => void; // refresh callback after add/edit/delete
  onSubCategoriesChanged?: () => void; // refresh sub-categories after creating new one
}

// Two-step add flow: 'name' → 'amount'
type AddStep = 'name' | 'amount';

/**
 * Inline income editing section — mirrors the expense BudgetSection pattern.
 * Shows income items with editable amounts, delete, and "+ Add item".
 * Income items are stored as actual transactions (not allocations).
 *
 * Add flow mirrors expenses:
 *   Step 1: Text input + suggestion chips (pick/type income source name)
 *   Step 2: Amount input + "By" selector (enter amount, then save creates transaction)
 */
export function InlineIncomeSection({
  householdId,
  month,
  householdUsers,
  currentUserId,
  incomeSubCategories,
  incomeCategoryId,
  incomeItems,
  totalIncome,
  onIncomeChanged,
  onSubCategoriesChanged,
}: InlineIncomeSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState(0);
  const [editDisplayValue, setEditDisplayValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Two-step add state
  const [addStep, setAddStep] = useState<AddStep | null>(null);
  const [addName, setAddName] = useState('');
  const [addIcon, setAddIcon] = useState('💰');
  const [addSubCategoryId, setAddSubCategoryId] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDisplayAmount, setAddDisplayAmount] = useState('');
  const [addPaidBy, setAddPaidBy] = useState(currentUserId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [showDuplicateError, setShowDuplicateError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Swipe-to-delete state per item
  const [swipingId, setSwipingId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const SWIPE_THRESHOLD = 80;

  const hasMultipleMembers = householdUsers.length > 1;

  // Get suggestions from INCOME_CATEGORY templates, excluding existing items
  const allSuggestions = INCOME_CATEGORY.sub_category_templates
    .map(t => ({ name: t.name, icon: t.icon || '💰' }))
    .filter(s => !incomeItems.some(i => i.subCategoryName.toLowerCase() === s.name.toLowerCase()));

  // Filter suggestions based on typed name
  const filteredSuggestions = addName
    ? allSuggestions.filter(s => s.name.toLowerCase().includes(addName.toLowerCase())).slice(0, 5)
    : allSuggestions.slice(0, 5);

  // Existing income source names (for duplicate prevention)
  const existingNames = incomeItems.map(i => i.subCategoryName);

  const isDuplicate = (nameToCheck: string) => {
    const normalized = nameToCheck.trim().toLowerCase();
    return existingNames.some(existing => existing.toLowerCase() === normalized);
  };

  // Focus name input when step 1 starts
  useEffect(() => {
    if (addStep === 'name' && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [addStep]);

  // Focus amount input when step 2 starts
  useEffect(() => {
    if (addStep === 'amount' && amountInputRef.current) {
      amountInputRef.current.focus();
    }
  }, [addStep]);

  // Focus edit input
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // --- Inline editing handlers (existing items) ---
  const handleStartEdit = (item: ActualIncomeItem) => {
    setEditingId(item.id);
    setEditAmount(item.amount);
    setEditDisplayValue(item.amount > 0 ? item.amount.toString() : '');
  };

  const handleEditAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(raw, 10) || 0;
    setEditAmount(numValue);
    setEditDisplayValue(raw);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    const item = incomeItems.find(i => i.id === editingId);
    if (!item) return;

    if (editAmount !== item.amount && editAmount > 0) {
      await updateTransaction(editingId, { amount: editAmount });
      onIncomeChanged();
    }
    setEditingId(null);
    setEditDisplayValue('');
  };

  const handleEditBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to another element within the edit container
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (editContainerRef.current?.contains(relatedTarget)) {
      return;
    }
    handleEditSave();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditDisplayValue('');
    }
  };

  // --- Delete handler ---
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteTransaction(id);
      if (result.success) {
        onIncomeChanged();
      }
    } catch (e) {
      console.error('Failed to delete income:', e);
    } finally {
      setDeletingId(null);
    }
  };

  // --- Swipe-to-delete ---
  const handleTouchStart = useCallback((e: React.TouchEvent, itemId: string) => {
    if (editingId) return;
    touchStartX.current = e.touches[0].clientX;
    setSwipingId(itemId);
  }, [editingId]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipingId) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    const offset = Math.max(0, Math.min(diff, 120));
    setSwipeOffset(offset);
  }, [swipingId]);

  const handleTouchEnd = useCallback(() => {
    if (!swipingId) return;
    if (swipeOffset >= SWIPE_THRESHOLD) {
      handleDelete(swipingId);
    }
    setSwipingId(null);
    setSwipeOffset(0);
  }, [swipingId, swipeOffset]);

  // --- Two-step add handlers ---

  // Step 1: Start adding — show name input
  const handleStartAdd = () => {
    setAddStep('name');
    setAddName('');
    setAddIcon('💰');
    setAddSubCategoryId('');
    setAddAmount('');
    setAddDisplayAmount('');
    setAddPaidBy(currentUserId);
    setAddError(null);
    setShowDuplicateError(false);
  };

  // Step 1: Name input changed
  const handleAddNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddName(e.target.value);
    if (showDuplicateError) setShowDuplicateError(false);
  };

  // Step 1: Confirm name (submit or Enter) → move to step 2
  const handleConfirmName = async (name: string, icon: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (isDuplicate(trimmed)) {
      setShowDuplicateError(true);
      return;
    }

    // Find existing sub-category or create a new one
    const existing = incomeSubCategories.find(
      sc => sc.name.toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      setAddSubCategoryId(existing.id);
      setAddIcon(existing.icon);
    } else {
      // Create new income sub-category
      const result = await createSubCategory(householdId, incomeCategoryId, trimmed, icon);
      if (result.success && result.subCategory) {
        setAddSubCategoryId(result.subCategory.id);
        setAddIcon(result.subCategory.icon || icon);
        onSubCategoriesChanged?.();
      } else {
        setAddError(result.error || 'Failed to create income source');
        return;
      }
    }

    setAddName(trimmed);
    setAddStep('amount');
  };

  // Step 1: Suggestion clicked
  const handleSuggestionClick = (suggestion: { name: string; icon: string }) => {
    handleConfirmName(suggestion.name, suggestion.icon);
  };

  // Step 1: Name input keyboard
  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirmName(addName, addIcon);
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  // Step 1: Name input blur
  const handleNameBlur = (e: React.FocusEvent) => {
    const container = e.currentTarget.closest('[data-add-container]');
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (container?.contains(relatedTarget)) {
      return; // Focus staying within container
    }
    const trimmed = addName.trim();
    if (trimmed) {
      handleConfirmName(trimmed, addIcon);
    } else {
      handleCancelAdd();
    }
  };

  // Step 2: Amount changed
  const handleAddAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setAddAmount(raw);
    setAddDisplayAmount(raw);
  };

  // Step 2: Save — create the transaction
  const handleAddSave = async () => {
    const numAmount = parseInt(addAmount, 10);
    if (!numAmount || numAmount <= 0) {
      setAddError('Enter an amount');
      return;
    }
    if (!addSubCategoryId) {
      setAddError('Select an income source');
      return;
    }

    setIsSubmitting(true);
    setAddError(null);

    try {
      const result = await createTransaction({
        householdId,
        subCategoryId: addSubCategoryId,
        amount: numAmount,
        transactionType: 'income',
        transactionDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'other',
        loggedBy: addPaidBy || currentUserId,
      });

      if (result.success) {
        // Reset and close add form
        setAddStep(null);
        setAddName('');
        setAddAmount('');
        setAddDisplayAmount('');
        setAddSubCategoryId('');
        onIncomeChanged();
      } else {
        setAddError(result.error || 'Failed to save');
      }
    } catch (e) {
      setAddError('Failed to save income');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Amount keyboard
  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSave();
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  // Step 2: Amount blur
  const handleAmountBlur = (e: React.FocusEvent) => {
    const container = e.currentTarget.closest('[data-add-container]');
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (container?.contains(relatedTarget)) {
      return;
    }
    // If amount entered, try to save
    const numAmount = parseInt(addAmount, 10);
    if (numAmount > 0) {
      handleAddSave();
    } else {
      handleCancelAdd();
    }
  };

  const handleCancelAdd = () => {
    setAddStep(null);
    setAddName('');
    setAddIcon('💰');
    setAddAmount('');
    setAddDisplayAmount('');
    setAddSubCategoryId('');
    setAddError(null);
    setShowDuplicateError(false);
  };

  const isEmpty = incomeItems.length === 0;
  const isAdding = addStep !== null;

  return (
    <div className="glass-card overflow-hidden">
      {/* Section Header - Clickable to collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/40 transition-colors border-l-4 border-[var(--color-primary)]"
      >
        <div className="flex items-center gap-1 min-w-0">
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div className="w-6 h-6 rounded-md bg-[var(--color-success-bg)] flex items-center justify-center flex-shrink-0">
            <svg className="w-3 h-3 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate">Income</h2>
            <p className="text-[11px] text-gray-400">These are your earnings</p>
          </div>
        </div>
        <span className="text-base md:text-lg text-gray-500 font-semibold shrink-0">
          ₹{formatNumber(totalIncome)}<span className="md:hidden">/mo</span><span className="hidden md:inline"> / month</span>
        </span>
      </button>

      {!isCollapsed && <div className="h-px bg-[rgba(124,58,237,0.06)]" />}

      {!isCollapsed && (
        <div>
          {isEmpty && !isAdding ? (
            /* Empty state */
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400 mb-4">No income recorded yet</p>
              <button
                onClick={handleStartAdd}
                className="inline-flex items-center gap-2 px-4 py-2 text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-bg)] rounded-xl transition-colors"
              >
                <span className="text-lg">+</span>
                <span>Add your first income</span>
              </button>
            </div>
          ) : (
            <>
              {/* Income items */}
              {incomeItems.map((item) => (
                <div key={item.id} className="relative overflow-hidden">
                  {/* Delete background (revealed on swipe) — hidden during edit to prevent bleed-through */}
                  <div className={`absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center ${editingId === item.id ? 'hidden' : ''}`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>

                  {editingId === item.id ? (
                    /* Edit mode — amount + by (mirrors expense BudgetItem edit) */
                    <div
                      ref={editContainerRef}
                      className="relative bg-[var(--color-primary-bg)] border-l-4 border-[var(--color-primary)] px-4 py-3 flex items-center gap-3"
                    >
                      <span className="text-lg shrink-0">{item.subCategoryIcon}</span>
                      <span className="flex-1 text-gray-900 font-medium truncate">{item.subCategoryName}</span>
                      {/* Amount input */}
                      <div className="relative shrink-0 w-24">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                        <input
                          ref={editInputRef}
                          type="text"
                          inputMode="numeric"
                          value={editDisplayValue}
                          onChange={handleEditAmountChange}
                          onBlur={handleEditBlur}
                          onKeyDown={handleEditKeyDown}
                          placeholder="0"
                          className="w-full pl-6 pr-2 py-1.5 border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-gray-900 font-medium text-right placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                        />
                      </div>
                      {/* By selector (multi-member households only) */}
                      {hasMultipleMembers && (
                        <div className="relative shrink-0">
                          <select
                            defaultValue={item.loggedByName}
                            className="appearance-none pl-2 pr-7 py-1.5 border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-gray-700 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)] cursor-pointer"
                            disabled // Can't change who earned for existing transaction in this inline view
                          >
                            <option>{item.loggedByName}</option>
                          </select>
                          <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Display mode — same as expense BudgetItem display */
                    <div
                      className={`relative bg-white px-4 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${swipingId !== item.id ? 'transition-transform duration-200' : ''}`}
                      style={{ transform: swipingId === item.id ? `translateX(-${swipeOffset}px)` : undefined }}
                      onClick={() => handleStartEdit(item)}
                      onTouchStart={(e) => handleTouchStart(e, item.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      <span className="text-lg shrink-0">{item.subCategoryIcon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.subCategoryName}</p>
                        {hasMultipleMembers && (
                          <p className="text-xs text-gray-400">by {item.loggedByName}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-medium text-gray-900 tabular-nums">
                          ₹{formatNumber(item.amount)}
                        </span>
                      </div>
                      {/* Delete button - desktop only */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        disabled={deletingId === item.id}
                        className="hidden sm:block p-1.5 text-gray-300 hover:text-red-500 transition-all shrink-0"
                        aria-label="Delete"
                      >
                        {deletingId === item.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Step 1: Name input + suggestions */}
              {addStep === 'name' && (
                <div data-add-container className="bg-[var(--color-primary-bg)] border-l-4 border-[var(--color-primary)] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg shrink-0">💰</span>
                    <input
                      ref={nameInputRef}
                      type="text"
                      value={addName}
                      onChange={handleAddNameChange}
                      onKeyDown={handleNameKeyDown}
                      onBlur={handleNameBlur}
                      placeholder="Income source..."
                      className={`flex-1 min-w-0 px-2 py-1.5 border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                        showDuplicateError
                          ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
                          : 'border-[rgba(124,58,237,0.2)] focus:border-[var(--color-primary)] focus:ring-[rgba(124,58,237,0.15)]'
                      }`}
                    />
                    <button
                      onClick={() => handleConfirmName(addName, addIcon)}
                      disabled={!addName.trim()}
                      className="p-1.5 text-green-600 hover:text-green-700 active:text-green-800 disabled:text-gray-300 transition-colors shrink-0"
                      aria-label="Confirm"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCancelAdd}
                      className="p-1.5 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors shrink-0"
                      aria-label="Cancel"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  {/* Duplicate error */}
                  {showDuplicateError && (
                    <p className="mt-1 text-xs text-red-500">
                      "{addName.trim()}" already exists. Please use a different name.
                    </p>
                  )}
                  {/* Suggestions */}
                  {filteredSuggestions.length > 0 && !showDuplicateError && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {filteredSuggestions.map((s) => (
                        <button
                          key={s.name}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur
                            handleSuggestionClick(s);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/75 border border-[rgba(124,58,237,0.1)] rounded-xl text-sm text-gray-700 hover:border-[rgba(124,58,237,0.3)] hover:bg-[var(--color-primary-bg)] transition-colors"
                        >
                          <span>{s.icon}</span>
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Amount + By */}
              {addStep === 'amount' && (
                <div data-add-container className="bg-[var(--color-primary-bg)] border-l-4 border-[var(--color-primary)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg shrink-0">{addIcon}</span>
                    <span className="flex-1 text-gray-900 font-medium truncate">{addName}</span>
                    {/* Amount input */}
                    <div className="relative shrink-0 w-24">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                      <input
                        ref={amountInputRef}
                        type="text"
                        inputMode="numeric"
                        value={addDisplayAmount}
                        onChange={handleAddAmountChange}
                        onBlur={handleAmountBlur}
                        onKeyDown={handleAmountKeyDown}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-1.5 border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-gray-900 font-medium text-right placeholder:text-gray-300 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
                      />
                    </div>
                    {/* By selector (multi-member households only) */}
                    {hasMultipleMembers && (
                      <div className="relative shrink-0">
                        <select
                          value={addPaidBy}
                          onChange={(e) => setAddPaidBy(e.target.value)}
                          className="appearance-none pl-2 pr-7 py-1.5 border border-[rgba(124,58,237,0.2)] rounded-xl text-sm text-gray-700 bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)] cursor-pointer"
                        >
                          {householdUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.displayName}
                            </option>
                          ))}
                        </select>
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Error */}
                  {addError && (
                    <p className="mt-1 text-xs text-red-600">{addError}</p>
                  )}
                </div>
              )}

              {/* + Add income button (only when not in add mode) */}
              {!isAdding && (
                <button
                  onClick={handleStartAdd}
                  className="w-full px-4 py-3 flex items-center gap-2 text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-bg)] transition-colors border-t border-[rgba(124,58,237,0.06)]"
                >
                  <span className="text-lg">+</span>
                  <span>Add income</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
