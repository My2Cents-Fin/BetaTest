import { useState, useEffect, useRef, useMemo } from 'react';
import { getUserHousehold } from '../../onboarding/services/onboarding';
import { getHouseholdSubCategories } from '../../budget/services/budget';
import { getCurrentMonthTransactions, deleteTransaction } from '../../budget/services/transactions';
import { formatNumber } from '../../budget/components/AmountInput';
import { QuickAddTransaction } from '../../dashboard/components/QuickAddTransaction';
import { FundTransferModal } from '../../dashboard/components/FundTransferModal';
import type { TransactionWithDetails, HouseholdSubCategory } from '../../budget/types';
import { supabase } from '../../../lib/supabase';

interface TransactionsTabProps {
  quickAddTrigger?: number;
  fundTransferTrigger?: number;
  onHasOtherMembersChange?: (hasOthers: boolean) => void;
}

interface GroupedTransactions {
  date: string;
  label: string;
  transactions: TransactionWithDetails[];
}

type TransactionTypeFilter = 'all' | 'income' | 'expense';

export function TransactionsTab({ quickAddTrigger, fundTransferTrigger, onHasOtherMembersChange }: TransactionsTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [allSubCategories, setAllSubCategories] = useState<{ id: string; name: string; icon: string; categoryName: string; categoryType: 'income' | 'expense' }[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithDetails | null>(null);
  const [hasOtherMembers, setHasOtherMembers] = useState(false);

  // Filter states
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [filterRecordedBy, setFilterRecordedBy] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<TransactionTypeFilter>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [uniqueRecorders, setUniqueRecorders] = useState<{ id: string; name: string }[]>([]);

  const hasLoadedRef = useRef(false);
  const mobileFilterRef = useRef<HTMLDivElement>(null);
  const desktopFilterRef = useRef<HTMLDivElement>(null);

  // Today's date for max date constraint
  const today = new Date().toISOString().split('T')[0];

  const monthDisplay = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadTransactions();
  }, []);

  // Close filters when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideMobile = mobileFilterRef.current && !mobileFilterRef.current.contains(target);
      const isOutsideDesktop = desktopFilterRef.current && !desktopFilterRef.current.contains(target);

      // Close if click is outside both filter containers
      if (isOutsideMobile && isOutsideDesktop) {
        setShowFilters(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    }
  }, [fundTransferTrigger, household, hasOtherMembers]);

  // Notify parent when hasOtherMembers changes
  useEffect(() => {
    if (onHasOtherMembersChange) {
      onHasOtherMembersChange(hasOtherMembers);
    }
  }, [hasOtherMembers, onHasOtherMembersChange]);

  async function loadTransactions() {
    setIsLoading(true);
    try {
      const householdData = await getUserHousehold();
      if (!householdData) return;
      setHousehold(householdData);

      // Get sub-categories for quick add
      const subCategoriesResult = await getHouseholdSubCategories(householdData.id);
      const subCategories = subCategoriesResult.subCategories || [];

      const subCatList = subCategories.map((sc: HouseholdSubCategory & { categories?: { type: string; name: string } }) => ({
        id: sc.id,
        name: sc.name,
        icon: sc.icon || '📦',
        categoryName: sc.categories?.name || 'Other',
        categoryType: (sc.categories?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      }));
      setAllSubCategories(subCatList);

      // Get transactions
      const transactionsResult = await getCurrentMonthTransactions(householdData.id);
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

      // Check if there are other household members for fund transfer feature
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: membersData } = await supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', householdData.id)
          .neq('user_id', user.id);

        setHasOtherMembers((membersData || []).length > 0);
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
      // Filter by type
      if (filterType !== 'all' && t.transaction_type !== filterType) {
        return false;
      }
      return true;
    });
  }, [transactions, filterDateFrom, filterDateTo, filterRecordedBy, filterType]);

  // Group filtered transactions by date
  const filteredGroupedTransactions = useMemo(() => {
    return groupTransactionsByDate(filteredTransactions);
  }, [filteredTransactions]);

  // Check if any filter is active
  const hasActiveFilters = Boolean(filterDateFrom || filterDateTo || filterRecordedBy.length > 0 || filterType !== 'all');

  // Count active filters
  const activeFilterCount = [
    filterDateFrom || filterDateTo ? 1 : 0,
    filterRecordedBy.length > 0 ? 1 : 0,
    filterType !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterRecordedBy([]);
    setFilterType('all');
  };

  const toggleRecorder = (recorderId: string) => {
    setFilterRecordedBy(prev =>
      prev.includes(recorderId)
        ? prev.filter(id => id !== recorderId)
        : [...prev, recorderId]
    );
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
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - Mobile */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between md:hidden">
        <h1 className="text-lg font-semibold text-gray-900">Transactions</h1>
        <div className="relative" ref={mobileFilterRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
              hasActiveFilters
                ? 'bg-purple-600 text-white'
                : 'bg-purple-600 text-white'
            }`}
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

          {/* Mobile Filter Dropdown */}
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <FilterContent
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                filterRecordedBy={filterRecordedBy}
                filterType={filterType}
                uniqueRecorders={uniqueRecorders}
                hasActiveFilters={hasActiveFilters}
                maxDate={today}
                setFilterDateFrom={setFilterDateFrom}
                setFilterDateTo={setFilterDateTo}
                toggleRecorder={toggleRecorder}
                setFilterType={setFilterType}
                clearFilters={clearFilters}
                onClose={() => setShowFilters(false)}
              />
            </div>
          )}
        </div>
      </header>

      {/* Header - Desktop */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900">Transactions • {monthDisplay}</h1>
        <div className="relative" ref={desktopFilterRef}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              hasActiveFilters
                ? 'bg-purple-600 text-white'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-medium">Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 bg-white text-purple-600 text-xs font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Desktop Filter Dropdown */}
          {showFilters && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <FilterContent
                filterDateFrom={filterDateFrom}
                filterDateTo={filterDateTo}
                filterRecordedBy={filterRecordedBy}
                filterType={filterType}
                uniqueRecorders={uniqueRecorders}
                hasActiveFilters={hasActiveFilters}
                maxDate={today}
                setFilterDateFrom={setFilterDateFrom}
                setFilterDateTo={setFilterDateTo}
                toggleRecorder={toggleRecorder}
                setFilterType={setFilterType}
                clearFilters={clearFilters}
                onClose={() => setShowFilters(false)}
              />
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Month Summary */}
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="flex items-center justify-center gap-2">
                <span className="text-green-500">↑</span>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actual Income</p>
                  <p className="text-base font-bold text-green-600">₹{formatNumber(totalIncome)}</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-red-500">↓</span>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Actual Expenses</p>
                  <p className="text-base font-bold text-red-600">₹{formatNumber(totalSpent)}</p>
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
                className="text-xs text-purple-600 font-medium hover:text-purple-700"
              >
                Clear filters
              </button>
            </div>
          )}

          {/* Transaction List */}
          {filteredGroupedTransactions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <span className="text-4xl mb-4 block">{hasActiveFilters ? '🔍' : '📝'}</span>
              <p className="text-sm text-gray-500">
                {hasActiveFilters ? 'No transactions match your filters' : 'No transactions this month'}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={clearFilters}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
                >
                  Clear Filters
                </button>
              ) : (
                <button
                  onClick={() => setShowQuickAdd(true)}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg"
                >
                  Add First Transaction
                </button>
              )}
            </div>
          ) : (
            filteredGroupedTransactions.map(group => (
              <div key={group.date}>
                <h3 className="text-xs font-medium text-gray-400 mb-2 px-1 uppercase tracking-wide">{group.label}</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
                  {group.transactions.map(txn => (
                    <div
                      key={txn.id}
                      onClick={() => handleTransactionClick(txn)}
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors first:rounded-t-xl last:rounded-b-xl"
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                        txn.transaction_type === 'transfer' ? 'bg-blue-50' :
                        txn.transaction_type === 'income' ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <span className="text-base">{txn.sub_category_icon}</span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {txn.sub_category_name}
                          {txn.transaction_type === 'transfer' && txn.transfer_to_name && (
                            <span className="text-gray-500"> → {txn.transfer_to_name}</span>
                          )}
                        </p>
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
            className="w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 active:bg-purple-800 transition-colors flex items-center justify-center"
            aria-label="Add transaction"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Add Transaction
          </div>
        </div>
      )}

      {/* Quick Add Transaction Modal */}
      {showQuickAdd && household && (
        <QuickAddTransaction
          householdId={household.id}
          subCategories={allSubCategories}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

      {/* Edit Transaction Modal */}
      {selectedTransaction && household && (
        <QuickAddTransaction
          householdId={household.id}
          subCategories={allSubCategories}
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
          onClose={() => setShowFundTransfer(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

      {/* Desktop - Secondary FAB for Fund Transfer (only visible if there are other household members) */}
      {hasOtherMembers && (
        <div className="hidden md:block fixed bottom-24 right-4 z-30 group">
          <button
            onClick={() => setShowFundTransfer(true)}
            className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:bg-blue-800 transition-colors flex items-center justify-center"
            aria-label="Record fund transfer"
          >
            <span className="text-2xl">💸</span>
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
  filterType: TransactionTypeFilter;
  uniqueRecorders: { id: string; name: string }[];
  hasActiveFilters: boolean;
  maxDate: string;
  setFilterDateFrom: (date: string) => void;
  setFilterDateTo: (date: string) => void;
  toggleRecorder: (id: string) => void;
  setFilterType: (type: TransactionTypeFilter) => void;
  clearFilters: () => void;
  onClose: () => void;
}

function FilterContent({
  filterDateFrom,
  filterDateTo,
  filterRecordedBy,
  filterType,
  uniqueRecorders,
  hasActiveFilters,
  maxDate,
  setFilterDateFrom,
  setFilterDateTo,
  toggleRecorder,
  setFilterType,
  clearFilters,
  onClose,
}: FilterContentProps) {
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Filters</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
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
              className="w-[96%] md:w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400"
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
              className="w-[96%] md:w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400"
              style={{ colorScheme: 'light', fontSize: '12px' }}
            />
          </div>
        </div>
      </div>

      {/* Recorded By Filter */}
      {uniqueRecorders.length > 1 && (
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">Recorded By</label>
          <div className="space-y-1.5">
            {uniqueRecorders.map(recorder => (
              <label key={recorder.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterRecordedBy.includes(recorder.id)}
                  onChange={() => toggleRecorder(recorder.id)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-xs text-gray-700">{recorder.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Type Filter */}
      <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Type</label>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('income')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'income'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Income
          </button>
          <button
            onClick={() => setFilterType('expense')}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'expense'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Expense
          </button>
        </div>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
