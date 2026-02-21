import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { getUserHousehold } from '../../onboarding/services/onboarding';
import { getHouseholdSubCategories } from '../../budget/services/budget';
import { getCurrentMonthTransactions, deleteTransaction, getHouseholdUsers } from '../../budget/services/transactions';
import { formatNumber } from '../../budget/components/AmountInput';
import { QuickAddTransaction } from '../../dashboard/components/QuickAddTransaction';
import { FundTransferModal } from '../../dashboard/components/FundTransferModal';
import type { TransactionWithDetails, HouseholdSubCategory } from '../../budget/types';
import { supabase } from '../../../lib/supabase';
import { MemberMultiSelect } from '../../../shared/components/MemberMultiSelect';
import { CategoryMultiSelect } from '../../../shared/components/CategoryMultiSelect';
import { StatementImportModal } from './StatementImportModal';

interface TransactionsTabProps {
  quickAddTrigger?: number;
  fundTransferTrigger?: number;
  onFundTransferConsumed?: () => void;
  onHasOtherMembersChange?: (hasOthers: boolean) => void;
  /** Pre-apply a sub-category filter (drill-down from Dashboard) */
  drillDownSubCategoryId?: string | null;
  onDrillDownConsumed?: () => void;
}

interface GroupedTransactions {
  date: string;
  label: string;
  transactions: TransactionWithDetails[];
}

export function TransactionsTab({ quickAddTrigger, fundTransferTrigger, onFundTransferConsumed, onHasOtherMembersChange, drillDownSubCategoryId, onDrillDownConsumed }: TransactionsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [allSubCategories, setAllSubCategories] = useState<{ id: string; name: string; icon: string; categoryName: string; categoryType: 'income' | 'expense' }[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [hasOtherMembers, setHasOtherMembers] = useState(false);
  const [householdUsers, setHouseholdUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [showImport, setShowImport] = useState(false);
  const [rawSubCategories, setRawSubCategories] = useState<HouseholdSubCategory[]>([]);
  const [categoryMap, setCategoryMap] = useState<Map<string, { name: string; type: string }>>(new Map());

  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterRecordedBy, setFilterRecordedBy] = useState<string[]>([]);
  // Category filter (replaces previous filterTypes toggle buttons — see commit 71d3c01 for revert)
  const [filterSubCategoryIds, setFilterSubCategoryIds] = useState<Set<string>>(new Set());
  const [filterIncludeTransfers, setFilterIncludeTransfers] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueRecorders, setUniqueRecorders] = useState<{ id: string; name: string }[]>([]);

  const hasLoadedRef = useRef(false);

  // Today's date for max date constraint
  const today = new Date().toISOString().split('T')[0];

  const monthDisplay = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadTransactions();
  }, []);

  // Apply drill-down filter from Dashboard (pre-filter by sub-category)
  useEffect(() => {
    if (drillDownSubCategoryId) {
      setFilterSubCategoryIds(new Set([drillDownSubCategoryId]));
      setFilterIncludeTransfers(false);
      onDrillDownConsumed?.();
    }
  }, [drillDownSubCategoryId]);

  // Note: click-outside-to-close is handled by the portal backdrop's onClick.
  // The old document mousedown listener was removed — it conflicted with the portal
  // (refs pointed to header buttons, not the portal-rendered panel).

  // Respond to quick add trigger from bottom nav
  useEffect(() => {
    if (quickAddTrigger && quickAddTrigger > 0 && household) {
      setShowQuickAdd(true);
    }
  }, [quickAddTrigger]);

  // Respond to fund transfer trigger from bottom nav
  useEffect(() => {
    if (fundTransferTrigger && fundTransferTrigger > 0 && household && hasOtherMembers) {
      setShowFundTransfer(true);
      onFundTransferConsumed?.();
    }
  }, [fundTransferTrigger]);

  // Notify parent when hasOtherMembers changes
  useEffect(() => {
    if (onHasOtherMembersChange) {
      onHasOtherMembersChange(hasOtherMembers);
    }
  }, [hasOtherMembers, onHasOtherMembersChange]);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      // Step 1: Get household (sequential — needs user internally)
      const householdData = await getUserHousehold();
      if (!householdData) return;
      setHousehold(householdData);

      // Step 2: All independent — run in parallel
      const [subCategoriesResult, transactionsResult, authResult, usersResult] = await Promise.all([
        getHouseholdSubCategories(householdData.id),
        getCurrentMonthTransactions(householdData.id),
        supabase.auth.getUser(),
        getHouseholdUsers(householdData.id),
      ]);

      // Process sub-categories
      const subCategories = subCategoriesResult.subCategories || [];
      const subCatList = subCategories.map((sc: HouseholdSubCategory & { categories?: { type: string; name: string } }) => ({
        id: sc.id,
        name: sc.name,
        icon: sc.icon || '📦',
        categoryName: sc.categories?.name || 'Other',
        categoryType: (sc.categories?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      }));
      setAllSubCategories(subCatList);

      // Store raw sub-categories for import modal
      setRawSubCategories(subCategories);

      // Build category map for merchant matcher
      const catMap = new Map<string, { name: string; type: string }>();
      subCategories.forEach((sc: HouseholdSubCategory & { categories?: { type: string; name: string } }) => {
        if (sc.category_id && sc.categories) {
          catMap.set(sc.category_id, { name: sc.categories.name, type: sc.categories.type });
        }
      });
      setCategoryMap(catMap);

      // Process transactions
      const txns = transactionsResult.transactions || [];
      setTransactions(txns);

      // Extract unique recorders
      const recordersMap = new Map<string, string>();
      txns.forEach(t => {
        if (t.logged_by && t.logged_by_name && !recordersMap.has(t.logged_by)) {
          recordersMap.set(t.logged_by, t.logged_by_name);
        }
      });
      setUniqueRecorders(Array.from(recordersMap.entries()).map(([id, name]) => ({ id, name })));

      // Process auth + household users
      const user = authResult.data?.user;
      if (user) {
        setCurrentUserId(user.id);
        if (usersResult.success && usersResult.users) {
          setHouseholdUsers(usersResult.users);
          const otherMembers = usersResult.users.filter(u => u.id !== user.id);
          setHasOtherMembers(otherMembers.length > 0);
        }
      }

    } catch (e) {
      console.error('Error loading transactions:', e);
    } finally {
      setIsLoading(false);
    }
  }

  function groupTransactionsByDate(txns: TransactionWithDetails[]): GroupedTransactions[] {
    const groups = new Map<string, TransactionWithDetails[]>();

    txns.forEach(t => {
      const date = t.transaction_date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(t);
    });

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Sort by date descending
      .map(([date, transactions]) => ({
        date,
        label: date === today
          ? 'Today'
          : date === yesterday
            ? 'Yesterday'
            : new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        transactions,
      }));
  }

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Filter by date range
      if (filterDateFrom && t.transaction_date < filterDateFrom) {
        return false;
      }
      if (filterDateTo && t.transaction_date > filterDateTo) {
        return false;
      }
      // Filter by recorded by (multiselect - if any selected, filter by them)
      if (filterRecordedBy.length > 0 && !filterRecordedBy.includes(t.logged_by)) {
        return false;
      }
      // Filter by sub-category / transfer (replaces old type filter)
      const hasSubCatFilter = filterSubCategoryIds.size > 0 || filterIncludeTransfers;
      if (hasSubCatFilter) {
        if (t.transaction_type === 'transfer') {
          if (!filterIncludeTransfers) return false;
        } else {
          // null sub_category_id = uncategorized — show when no specific filter is applied
          if (t.sub_category_id === null) {
            // Uncategorized transactions pass through when any sub-cat filter is active
            // (they don't belong to any filtered category, so include them)
          } else if (!filterSubCategoryIds.has(t.sub_category_id)) {
            return false;
          }
        }
      }
      return true;
    });
  }, [transactions, filterDateFrom, filterDateTo, filterRecordedBy, filterSubCategoryIds, filterIncludeTransfers]);

  // Group filtered transactions by date
  const filteredGroupedTransactions = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(filterDateFrom || filterDateTo || filterRecordedBy.length > 0 || filterSubCategoryIds.size > 0 || filterIncludeTransfers);

  // Count active filters
  const activeFilterCount = [
    filterDateFrom || filterDateTo ? 1 : 0,
    filterRecordedBy.length > 0 ? 1 : 0,
    filterSubCategoryIds.size > 0 || filterIncludeTransfers ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterRecordedBy([]);
    setFilterSubCategoryIds(new Set());
    setFilterIncludeTransfers(false);
  };

  const toggleRecorder = (recorderId: string) => {
    setFilterRecordedBy(prev =>
      prev.includes(recorderId)
        ? prev.filter(id => id !== recorderId)
        : [...prev, recorderId]
    );
  };

  const toggleSubCategory = (id: string) => {
    setFilterSubCategoryIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleTransfers = () => setFilterIncludeTransfers(prev => !prev);

  const toggleAllOfType = (type: 'income' | 'expense' | 'transfer') => {
    if (type === 'transfer') { toggleTransfers(); return; }
    const idsOfType = allSubCategories.filter(sc => sc.categoryType === type).map(sc => sc.id);
    const allSelected = idsOfType.every(id => filterSubCategoryIds.has(id));
    setFilterSubCategoryIds(prev => {
      const next = new Set(prev);
      idsOfType.forEach(id => allSelected ? next.delete(id) : next.add(id));
      return next;
    });
  };

  const handleTransactionAdded = () => {
    hasLoadedRef.current = false;
    loadTransactions();
    setShowQuickAdd(false);
    setSelectedTransaction(null);
  };

  const handleTransactionClick = (txn: TransactionWithDetails) => {
    setSelectedTransaction(txn);
  };

  const handleCloseEdit = () => {
    setSelectedTransaction(null);
  };

  const handleDeleteTransaction = async (txn: TransactionWithDetails, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening edit modal
    if (!confirm('Delete this transaction?')) return;

    const result = await deleteTransaction(txn.id);
    if (result.success) {
      hasLoadedRef.current = false;
      loadTransactions();
    }
  };

  const totalSpent = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-page-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* Header - Mobile */}
      <header className="glass-header px-4 py-3 flex items-center justify-between md:hidden">
        <h1 className="text-lg font-semibold text-gray-900">Transactions</h1>
        <div className="flex items-center gap-2">
          {/* Import Statement Button */}
          <button
            onClick={() => setShowImport(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-white/60 border border-[rgba(124,58,237,0.15)] text-[var(--color-primary)]"
            title="Import Statement"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-primary-gradient text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Header - Desktop */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 glass-header">
        <h1 className="text-lg font-semibold text-gray-900">Transactions • {monthDisplay}</h1>
        <div className="flex items-center gap-2">
          {/* Import Statement Button */}
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors bg-white/60 border border-[rgba(124,58,237,0.15)] text-[var(--color-primary)] hover:bg-white/80"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span className="text-sm font-medium">Import</span>
          </button>
          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors bg-primary-gradient text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium">Filters</span>
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 bg-white text-[var(--color-primary)] text-xs font-bold rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Filter Dropdown — rendered via portal at document body to escape all containing blocks */}
      {showFilters && createPortal(
        <div className="fixed inset-0 z-50" onClick={() => setShowFilters(false)}>
          <div
            className="fixed right-4 top-14 md:right-6 md:top-16 w-72 md:w-80 z-50 rounded-2xl border border-[rgba(124,58,237,0.15)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <FilterContent
              filterDateFrom={filterDateFrom}
              filterDateTo={filterDateTo}
              filterRecordedBy={filterRecordedBy}
              allSubCategories={allSubCategories}
              filterSubCategoryIds={filterSubCategoryIds}
              filterIncludeTransfers={filterIncludeTransfers}
              hasTransfers={transactions.some(t => t.transaction_type === 'transfer')}
              uniqueRecorders={uniqueRecorders}
              hasActiveFilters={hasActiveFilters}
              maxDate={today}
              setFilterDateFrom={setFilterDateFrom}
              setFilterDateTo={setFilterDateTo}
              toggleRecorder={toggleRecorder}
              toggleSubCategory={toggleSubCategory}
              toggleTransfers={toggleTransfers}
              toggleAllOfType={toggleAllOfType}
              clearFilters={clearFilters}
              onClose={() => setShowFilters(false)}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Content */}
      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Month Summary */}
          <div className="glass-card glass-card-elevated p-4">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-success-bg)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--color-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actual Income</p>
                  <p className="text-base font-bold text-[var(--color-success)]">₹{formatNumber(totalIncome)}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-danger)]/5 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actual Expenses</p>
                  <p className="text-base font-bold text-[var(--color-danger)]">₹{formatNumber(totalSpent)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Indicator */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between px-1">
              <p className="text-xs text-gray-500">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </p>
              <button
                onClick={clearFilters}
                className="text-xs text-[var(--color-primary)] font-medium hover:opacity-80"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Transaction List */}
          {filteredGroupedTransactions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[var(--color-primary-bg)] flex items-center justify-center mx-auto mb-4">
                {hasActiveFilters ? (
                  <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {hasActiveFilters ? 'No transactions match your filters' : 'No transactions this month'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-primary-gradient text-white text-sm font-medium rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="mt-4 px-4 py-2 bg-primary-gradient text-white text-sm font-medium rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.3)]"
                >
                  Add First Transaction
                </button>
              )}
            </div>
          ) : (
            filteredGroupedTransactions.map(group => (
              <div key={group.date}>
                <h3 className="text-xs font-medium text-gray-400 mb-2 px-1 uppercase tracking-wide">{group.label}</h3>
                <div className="glass-card divide-y divide-[rgba(124,58,237,0.04)] !p-0 overflow-hidden">
                  {group.transactions.map(txn => (
                    <div
                      key={txn.id}
                      onClick={() => handleTransactionClick(txn)}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-white/40 active:bg-white/60 transition-colors"
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        txn.transaction_type === 'transfer' ? 'bg-blue-50' :
                        txn.transaction_type === 'income' ? 'bg-[var(--color-success-bg)]' : 'bg-red-50'
                      }`}>
                        <span className="text-base">{txn.sub_category_icon}</span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {txn.sub_category_name}
                            {txn.transaction_type === 'transfer' && txn.transfer_to_name && (
                              <span className="text-gray-500"> → {txn.transfer_to_name}</span>
                            )}
                          </p>
                          {/* Uncategorised badge for imported transactions without a category */}
                          {txn.sub_category_id === null && txn.transaction_type !== 'transfer' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-100 text-amber-700 whitespace-nowrap flex-shrink-0">
                              Uncategorised
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-400">
                          {new Date(txn.transaction_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, {new Date(txn.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })} • {txn.logged_by_name || 'Unknown'}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${
                          txn.transaction_type === 'transfer' ? 'text-blue-600' :
                          txn.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {txn.transaction_type === 'income' ? '+' : txn.transaction_type === 'transfer' ? '→ ' : '-'}₹{formatNumber(txn.amount)}
                        </p>
                      </div>

                      {/* Delete */}
                      <button
                        onClick={(e) => handleDeleteTransaction(txn, e)}
                        className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* FAB - Quick Add Transaction (Web only - mobile uses bottom nav center button) */}
      {household && (
        <div className="hidden md:block fixed bottom-8 right-4 z-30 group">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-14 h-14 bg-primary-gradient text-white rounded-2xl shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:shadow-[0_6px_24px_rgba(124,58,237,0.45)] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Add transaction"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Add Transaction
          </div>
        </div>
      )}

      {/* Quick Add Transaction Modal */}
      {showQuickAdd && household && (
        <QuickAddTransaction
          householdId={household.id}
          subCategories={allSubCategories}
          householdUsers={householdUsers}
          currentUserId={currentUserId}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

      {/* Edit Transaction Modal */}
      {selectedTransaction && household && (
        <QuickAddTransaction
          householdId={household.id}
          subCategories={allSubCategories}
          householdUsers={householdUsers}
          currentUserId={currentUserId}
          onClose={handleCloseEdit}
          onSuccess={handleTransactionAdded}
          transaction={selectedTransaction}
          mode="edit"
        />
      )}

      {/* Fund Transfer Modal */}
      {showFundTransfer && household && (
        <FundTransferModal
          householdId={household.id}
          householdUsers={householdUsers.map(u => ({ id: u.id, displayName: u.displayName }))}
          currentUserId={currentUserId}
          onClose={() => setShowFundTransfer(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

      {/* Statement Import Modal */}
      {showImport && household && (
        <StatementImportModal
          householdId={household.id}
          currentUserId={currentUserId}
          householdSubCategories={rawSubCategories}
          categoryMap={categoryMap}
          subCategories={allSubCategories}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            hasLoadedRef.current = false;
            loadTransactions();
          }}
        />
      )}

      {/* Desktop - Secondary FAB for Fund Transfer (only visible if there are other household members) */}
      {hasOtherMembers && (
        <div className="hidden md:block fixed bottom-24 right-4 z-30 group">
          <button
            onClick={() => setShowFundTransfer(true)}
            className="w-12 h-12 bg-white/80 backdrop-blur-md text-[var(--color-primary)] rounded-2xl shadow-[var(--glass-shadow)] border border-[rgba(124,58,237,0.15)] hover:shadow-[0_4px_16px_rgba(124,58,237,0.2)] hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Record fund transfer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Record Fund Transfer
          </div>
        </div>
      )}
    </div>
  );
}

// Filter Content Component
interface FilterContentProps {
  filterDateFrom: string;
  filterDateTo: string;
  filterRecordedBy: string[];
  allSubCategories: { id: string; name: string; icon: string; categoryName: string; categoryType: 'income' | 'expense' }[];
  filterSubCategoryIds: Set<string>;
  filterIncludeTransfers: boolean;
  hasTransfers: boolean;
  uniqueRecorders: { id: string; name: string }[];
  hasActiveFilters: boolean;
  maxDate: string;
  setFilterDateFrom: (date: string) => void;
  setFilterDateTo: (date: string) => void;
  toggleRecorder: (id: string) => void;
  toggleSubCategory: (id: string) => void;
  toggleTransfers: () => void;
  toggleAllOfType: (type: 'income' | 'expense' | 'transfer') => void;
  clearFilters: () => void;
  onClose: () => void;
}

function FilterContent({
  filterDateFrom,
  filterDateTo,
  filterRecordedBy,
  allSubCategories,
  filterSubCategoryIds,
  filterIncludeTransfers,
  hasTransfers,
  uniqueRecorders,
  hasActiveFilters,
  maxDate,
  setFilterDateFrom,
  setFilterDateTo,
  toggleRecorder,
  toggleSubCategory,
  toggleTransfers,
  toggleAllOfType,
  clearFilters,
  onClose,
}: FilterContentProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[rgba(124,58,237,0.06)]">
        <div>
          <span className="text-sm font-semibold text-gray-900">Filters</span>
          <p className="text-[9px] text-gray-400 mt-0.5">Changes apply instantly</p>
        </div>
        <button
          onClick={onClose}
          className="px-3 py-1 text-xs font-medium text-[var(--color-primary)] bg-[var(--color-primary-bg)] rounded-xl hover:opacity-80 transition-colors"
        >
          Done
        </button>
      </div>

      {/* Date Range Filter */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Date Range</label>
        <div className="flex flex-col gap-2">
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              max={filterDateTo || maxDate}
              className="w-[96%] md:w-full px-2 py-1.5 text-xs border border-[rgba(124,58,237,0.15)] rounded-xl bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
              style={{ colorScheme: 'light', fontSize: '12px' }}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 mb-1 block">To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              min={filterDateFrom}
              max={maxDate}
              className="w-[96%] md:w-full px-2 py-1.5 text-xs border border-[rgba(124,58,237,0.15)] rounded-xl bg-white/75 focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.15)]"
              style={{ colorScheme: 'light', fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* Members Filter */}
      {uniqueRecorders.length > 1 && (
        <MemberMultiSelect
          label="Members"
          members={uniqueRecorders.map(r => ({ id: r.id, name: r.name }))}
          selectedIds={filterRecordedBy}
          onToggle={toggleRecorder}
        />
      )}

      {/* Category Filter (unified sub-category multiselect — replaces old Type pills) */}
      <CategoryMultiSelect
        label="Category"
        subCategories={allSubCategories}
        selectedIds={filterSubCategoryIds}
        includeTransfers={filterIncludeTransfers}
        hasTransfers={hasTransfers}
        onToggleSubCategory={toggleSubCategory}
        onToggleTransfers={toggleTransfers}
        onToggleAllOfType={toggleAllOfType}
      />

      {/* Reset Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 text-xs font-medium text-gray-500 hover:bg-white/40 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset Filters
        </button>
      )}
    </div>
  );
}
