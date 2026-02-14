import { useState, useEffect, useRef } from 'react';
import { getUserHousehold } from '../../onboarding/services/onboarding';
import { getHouseholdSubCategories, getAllocations, getMonthlyPlan } from '../../budget/services/budget';
import { getCurrentMonthTransactions, getHouseholdUsers } from '../../budget/services/transactions';
import { formatNumber } from '../../budget/components/AmountInput';
import { QuickAddTransaction } from './QuickAddTransaction';
import { FundTransferModal } from './FundTransferModal';
import { supabase } from '../../../lib/supabase';
import type { BudgetAllocation, HouseholdSubCategory } from '../../budget/types';

interface DashboardTabProps {
  onOpenMenu: () => void;
  quickAddTrigger?: number;
  fundTransferTrigger?: number;
  onFundTransferConsumed?: () => void;
  onHasOtherMembersChange?: (hasOthers: boolean) => void;
}

interface CategorySpending {
  id: string;
  name: string;
  icon: string;
  planned: number;
  actual: number;
  percentUsed: number;
  categoryName: string;
}

interface UserBalance {
  userId: string;
  userName: string;
  income: number;
  spent: number;
  netTransfer: number; // positive = received more, negative = sent more
  expectedBalance: number;
}

export function DashboardTab({ onOpenMenu, quickAddTrigger, fundTransferTrigger, onFundTransferConsumed, onHasOtherMembersChange }: DashboardTabProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<{ id: string; name: string } | null>(null);
  const [totalPlanned, setTotalPlanned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalActualIncome, setTotalActualIncome] = useState(0);
  const [variablePlanned, setVariablePlanned] = useState(0);
  const [variableSpent, setVariableSpent] = useState(0);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [allSubCategories, setAllSubCategories] = useState<{ id: string; name: string; icon: string; categoryName: string; categoryType: 'income' | 'expense' }[]>([]);
  const [planStatus, setPlanStatus] = useState<'draft' | 'frozen'>('draft');
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showOtherMembers, setShowOtherMembers] = useState(false);
  const [hasOtherMembers, setHasOtherMembers] = useState(false);
  const [householdUsers, setHouseholdUsers] = useState<{ id: string; displayName: string }[]>([]);

  const hasLoadedRef = useRef(false);

  // Current month
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const monthDisplay = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Days remaining in month
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysRemaining = Math.max(0, lastDayOfMonth.getDate() - today.getDate());

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDashboardData();
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
      onFundTransferConsumed?.();
    }
  }, [fundTransferTrigger]);

  // Notify parent when hasOtherMembers changes
  useEffect(() => {
    if (onHasOtherMembersChange) {
      onHasOtherMembersChange(hasOtherMembers);
    }
  }, [hasOtherMembers, onHasOtherMembersChange]);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      // Step 1: Get auth user and household in parallel
      const [authResult, householdData] = await Promise.all([
        supabase.auth.getUser(),
        getUserHousehold(),
      ]);

      const user = authResult.data?.user;
      if (user) {
        setCurrentUserId(user.id);
      }
      if (!householdData) return;
      setHousehold(householdData);

      // Step 2: All these only need householdData.id — run in parallel
      const [planResult, subCategoriesResult, allocationsResult, transactionsResult, usersResult] = await Promise.all([
        getMonthlyPlan(householdData.id, currentMonth),
        getHouseholdSubCategories(householdData.id),
        getAllocations(householdData.id, currentMonth),
        getCurrentMonthTransactions(householdData.id),
        getHouseholdUsers(householdData.id),
      ]);

      // Process plan
      if (planResult.plan) {
        setPlanStatus(planResult.plan.status);
        setTotalPlanned(planResult.plan.total_allocated || 0);
      }

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

      // Process allocations
      const allocations = allocationsResult.allocations || [];

      // Process transactions
      const transactions = transactionsResult.transactions || [];

      // Calculate total spent
      const spent = transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalSpent(spent);

      // Calculate total actual income (AI)
      const actualIncome = transactions
        .filter(t => t.transaction_type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalActualIncome(actualIncome);

      // Calculate spending by sub-category
      const spendingBySubCat = new Map<string, number>();
      transactions
        .filter(t => t.transaction_type === 'expense')
        .forEach(t => {
          spendingBySubCat.set(t.sub_category_id, (spendingBySubCat.get(t.sub_category_id) || 0) + t.amount);
        });

      // Build category spending list (only expense items)
      const expenseSubCats = subCategories.filter((sc: HouseholdSubCategory & { categories?: { type: string } }) =>
        sc.categories?.type === 'expense'
      );

      const categoryList: CategorySpending[] = expenseSubCats.map((sc: HouseholdSubCategory & { categories?: { name: string } }) => {
        const allocation = allocations.find((a: BudgetAllocation) => a.sub_category_id === sc.id);
        const planned = allocation?.monthly_amount || 0;
        const actual = spendingBySubCat.get(sc.id) || 0;
        const percentUsed = planned > 0 ? (actual / planned) * 100 : (actual > 0 ? 100 : 0);

        return {
          id: sc.id,
          name: sc.name,
          icon: sc.icon || '📦',
          planned,
          actual,
          percentUsed,
          categoryName: sc.categories?.name || 'Other',
        };
      }).filter(c => c.planned > 0 || c.actual > 0)
        .sort((a, b) => b.percentUsed - a.percentUsed);

      setCategorySpending(categoryList);

      // Calculate variable-only spending for daily spending card
      const varSpent = categoryList
        .filter(c => c.categoryName === 'Variable')
        .reduce((sum, c) => sum + c.actual, 0);
      setVariableSpent(varSpent);

      const varPlanned = categoryList
        .filter(c => c.categoryName === 'Variable')
        .reduce((sum, c) => sum + c.planned, 0);
      setVariablePlanned(varPlanned);

      // Calculate user balances — use display names from transactions themselves
      const userIds = [...new Set(transactions.map(t => t.logged_by).filter(Boolean))];

      // Fetch user display names
      const { data: usersData } = await supabase
        .from('users')
        .select('id, display_name')
        .in('id', userIds);

      const userMap = new Map<string, string>();
      (usersData || []).forEach((u: any) => {
        userMap.set(u.id, u.display_name || 'Unknown');
      });

      // Calculate balance for each user
      const balances: UserBalance[] = userIds.map(userId => {
        const userIncome = transactions
          .filter(t => t.transaction_type === 'income' && t.logged_by === userId)
          .reduce((sum, t) => sum + t.amount, 0);

        const userSpent = transactions
          .filter(t => t.transaction_type === 'expense' && t.logged_by === userId)
          .reduce((sum, t) => sum + t.amount, 0);

        const transfersReceived = transactions
          .filter(t => t.transaction_type === 'transfer' && t.transfer_to === userId)
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const transfersSent = transactions
          .filter(t => t.transaction_type === 'transfer' && t.logged_by === userId)
          .reduce((sum, t) => sum + (t.amount || 0), 0);

        const netTransfer = (transfersReceived || 0) - (transfersSent || 0);

        return {
          userId,
          userName: userMap.get(userId) || 'Unknown',
          income: userIncome,
          spent: userSpent,
          netTransfer,
          expectedBalance: userIncome - userSpent + netTransfer,
        };
      }).sort((a, b) => a.userName.localeCompare(b.userName));

      setUserBalances(balances);

      // Process household users (already loaded in parallel above)
      if (user && usersResult.success && usersResult.users) {
        setHouseholdUsers(usersResult.users);
        const otherMembers = usersResult.users.filter(u => u.id !== user.id);
        setHasOtherMembers(otherMembers.length > 0);
      }

    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleTransactionAdded = () => {
    hasLoadedRef.current = false;
    loadDashboardData();
  };

  const remaining = totalPlanned - totalSpent;
  const percentUsed = totalPlanned > 0 ? (totalSpent / totalPlanned) * 100 : 0;
  const unallocated = totalActualIncome - totalPlanned; // AI - PE
  const combinedBalance = userBalances.reduce((sum, u) => sum + u.expectedBalance, 0);

  // Calculate spending velocity metrics based on VARIABLE expenses only (day-to-day spending)
  const daysElapsed = today.getDate();
  const dailyAverage = daysElapsed > 0 ? Math.ceil(variableSpent / daysElapsed) : 0;
  const totalDaysInMonth = lastDayOfMonth.getDate();
  const projectedSpend = Math.ceil(dailyAverage * totalDaysInMonth);
  const variableRemaining = variablePlanned - variableSpent;
  const projectedOverspend = Math.ceil(projectedSpend - variablePlanned);

  // Filter Variable categories at-risk (>=75% of budget)
  const variableAtRisk = categorySpending.filter(cat =>
    cat.categoryName === 'Variable' && cat.percentUsed >= 75
  );

  // Filter non-Variable overspent categories (>100%)
  const nonVariableOverspent = categorySpending.filter(cat =>
    cat.categoryName !== 'Variable' && cat.percentUsed > 100
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If plan is not frozen, show prompt to set up budget
  if (planStatus === 'draft') {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
          <h1 className="text-xl font-semibold text-gray-900">Home</h1>
        </header>
        <main className="p-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="max-w-md mx-auto text-center space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-base">ℹ️</span>
                <span>
                  <strong>Set up your budget to unlock the app and start tracking!</strong>
                </span>
              </p>
            </div>

            {/* Main illustration */}
            <div className="mb-4">
              <div className="w-24 h-24 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <span className="text-5xl">🔒</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Home Locked</h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                Create your first budget in the <strong>Budget tab</strong> to unlock the Dashboard and start recording transactions.
              </p>
            </div>

            {/* CTA */}
            <p className="text-xs text-gray-500 mt-8">
              💡 Once you freeze your budget, you'll be able to track spending, record transactions, and see your financial progress.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - Mobile only */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <h1 className="text-xl font-semibold text-gray-900">Home</h1>
      </header>

      {/* Content */}
      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Month & Days Remaining */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{monthDisplay}</h2>
            <span className="text-sm text-gray-500">{daysRemaining} days left</span>
          </div>

          {/* Row 1: Income Summary — Total Income with budgeted/unbudgeted bar */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-700">Total Income</h3>
              <p className={`text-xl font-bold text-green-600`}>
                ₹{formatNumber(totalActualIncome)}
              </p>
            </div>

            {/* Stacked bar: Budgeted | Unbudgeted */}
            {totalActualIncome > 0 && (
              <>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-purple-500 rounded-l-full"
                    style={{ width: `${Math.min((totalPlanned / totalActualIncome) * 100, 100)}%` }}
                  />
                  {unallocated > 0 && (
                    <div
                      className="h-full bg-green-300"
                      style={{ width: `${(unallocated / totalActualIncome) * 100}%` }}
                    />
                  )}
                </div>

                {/* Legend */}
                <div className="flex justify-between items-center mt-1.5">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span className="text-[10px] text-gray-500">Budgeted</span>
                    <span className="text-[10px] font-semibold text-gray-700">₹{formatNumber(totalPlanned)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`w-2 h-2 rounded-full ${unallocated >= 0 ? 'bg-green-300' : 'bg-red-400'}`} />
                    <span className="text-[10px] text-gray-500">Unbudgeted</span>
                    <span className={`text-[10px] font-semibold ${unallocated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {unallocated >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(unallocated))}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Row 2: Budget Health & Daily Spending - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            {/* Left to Spend */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-700">Left to Spend</h3>
                <p className="text-[9px] text-gray-500 mt-0.5">Planned vs actual expenses</p>
              </div>

              <div className="mb-3">
                <p className={`font-bold ${Math.abs(remaining) >= 100000 ? 'text-[26px]' : 'text-3xl'} ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {remaining >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(remaining))}
                </p>
                {remaining < 0 && (
                  <p className="text-[10px] text-red-500 mt-1">Over budget</p>
                )}
              </div>

              <div>
                <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${percentUsed > 100 ? 'bg-red-500' : percentUsed > 80 ? 'bg-yellow-500' : 'bg-purple-600'}`}
                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] text-gray-500 uppercase">Budget</p>
                    <p className="text-xs font-semibold text-gray-900">₹{formatNumber(totalPlanned)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 uppercase">Spent</p>
                    <p className="text-xs font-semibold text-gray-900">₹{formatNumber(totalSpent)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Spending */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-gray-700">Daily Spending</h3>
                <p className="text-[9px] text-gray-500 mt-0.5">Based on variable expenses</p>
              </div>

              <div className="mb-3 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  ₹{formatNumber(dailyAverage)}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Average/day</p>
              </div>

              {projectedOverspend > 0 ? (
                <div className="px-2 py-2 bg-red-50 border border-red-200 rounded-lg text-center">
                  <p className="text-[10px] text-red-700 flex items-center justify-center gap-1 mb-1">
                    <span>⚠️</span>
                    <span className="font-semibold">Alert</span>
                  </p>
                  <p className="text-[9px] text-red-600 leading-relaxed">
                    Reduce to ₹{formatNumber(daysRemaining > 0 ? Math.ceil(variableRemaining / daysRemaining) : 0)}/day
                  </p>
                </div>
              ) : (
                <div className="px-2 py-2 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-[10px] text-green-700 flex items-center justify-center gap-1 mb-1">
                    <span>✅</span>
                    <span className="font-semibold">On Track</span>
                  </p>
                  <p className="text-[9px] text-green-600 leading-relaxed">
                    Keep under ₹{formatNumber(daysRemaining > 0 ? Math.ceil(variableRemaining / daysRemaining) : 0)}/day
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Total Cash in Hand — compact full width */}
          <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100 flex items-start justify-between">
            <div>
              <h3 className="text-xs font-semibold text-gray-700">Total Cash in Hand</h3>
              <p className="text-[9px] text-gray-500 mt-0.5">Total income v/s actual expense</p>
              <p className={`text-xl font-bold mt-0.5 ${combinedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {combinedBalance >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(combinedBalance))}
              </p>
            </div>
            {userBalances.length > 1 && (
              <button
                onClick={() => setShowOtherMembers(true)}
                className="text-[11px] text-purple-600 hover:text-purple-700 font-medium whitespace-nowrap"
              >
                Split by Members
              </button>
            )}
          </div>

          {/* 3a. Variable Categories At-Risk (>=75%) */}
          {variableAtRisk.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <span className="text-base">⏰</span>
                Daily Expenses to Watch Out!
              </h3>
              <div className="space-y-3">
                {variableAtRisk.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      cat.percentUsed > 100 ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                    <div className="text-right">
                      <span className={`text-sm font-medium ${
                        cat.percentUsed > 100 ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {Math.ceil(cat.percentUsed)}%
                      </span>
                      <p className="text-xs text-gray-400">
                        ₹{formatNumber(cat.actual)} / ₹{formatNumber(cat.planned)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3b. Non-Variable Overspent Categories (>100%) */}
          {nonVariableOverspent.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
              <h3 className="text-sm font-semibold text-red-700 mb-3">Overspent Categories</h3>
              <div className="space-y-3">
                {nonVariableOverspent.map(cat => (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-lg">{cat.icon}</span>
                    <span className="flex-1 text-sm text-gray-700">{cat.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-red-600">
                        {Math.ceil(cat.percentUsed)}%
                      </span>
                      <p className="text-xs text-gray-400">
                        ₹{formatNumber(cat.actual)} / ₹{formatNumber(cat.planned)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No issues */}
          {variableAtRisk.length === 0 && nonVariableOverspent.length === 0 && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 text-center">
              <span className="text-4xl mb-3 block">🎉</span>
              <h3 className="text-sm font-semibold text-gray-700 mb-1">All Categories Healthy</h3>
              <p className="text-xs text-gray-500">No categories are at risk of exceeding budget</p>
            </div>
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
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          householdUsers={householdUsers}
          currentUserId={currentUserId || ''}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

      {/* Fund Transfer Modal */}
      {showFundTransfer && household && (
        <FundTransferModal
          householdId={household.id}
          householdUsers={householdUsers.map(u => ({ id: u.id, displayName: u.displayName }))}
          currentUserId={currentUserId || ''}
          onClose={() => setShowFundTransfer(false)}
          onSuccess={handleTransactionAdded}
        />
      )}

      {/* Member Balances Modal */}
      {showOtherMembers && userBalances.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowOtherMembers(false)} />

          {/* Modal */}
          <div className="relative w-full md:w-[420px] md:max-w-[90vw] bg-white rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-lg">👥</span>
                <h2 className="text-base font-semibold text-gray-900">
                  Member Balances
                </h2>
              </div>
              <button onClick={() => setShowOtherMembers(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-4">
                {userBalances.map(user => (
                  <div key={user.userId} className="bg-gray-50 rounded-lg p-3">
                    {/* User name and balance */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">👤</span>
                        <span className="text-sm font-medium text-gray-900">{user.userName}</span>
                        {user.userId === currentUserId && (
                          <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">You</span>
                        )}
                      </div>
                      <p className={`text-lg font-bold ${user.expectedBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {user.expectedBalance >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(user.expectedBalance))}
                      </p>
                    </div>

                    {/* Breakdown */}
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <div>
                        <span className="text-gray-400">Income: </span>
                        <span className="font-medium">₹{formatNumber(user.income)}</span>
                      </div>
                      {user.netTransfer !== 0 && !isNaN(user.netTransfer) && (
                        <div>
                          <span className="text-gray-400">Net Transfer: </span>
                          <span className="font-medium">{user.netTransfer > 0 ? '+' : '-'}₹{formatNumber(Math.abs(user.netTransfer))}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-400">Spent: </span>
                        <span className="font-medium">₹{formatNumber(user.spent)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
