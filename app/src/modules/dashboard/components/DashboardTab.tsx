import { useState, useEffect, useRef } from 'react';
import { getUserHousehold } from '../../onboarding/services/onboarding';
import { getHouseholdSubCategories, getAllocations, getMonthlyPlan } from '../../budget/services/budget';
import { getCurrentMonthTransactions, getHouseholdUsers, getUncategorizedCount } from '../../budget/services/transactions';
import { formatNumber } from '../../budget/components/AmountInput';
import { QuickAddTransaction } from './QuickAddTransaction';
import { FundTransferModal } from './FundTransferModal';
import { supabase } from '../../../lib/supabase';
import { PrivacyInfoModal } from '../../../shared/components/PrivacyInfoModal';
import type { BudgetAllocation, HouseholdSubCategory } from '../../budget/types';

interface DashboardTabProps {
  onOpenMenu: () => void;
  quickAddTrigger?: number;
  fundTransferTrigger?: number;
  onFundTransferConsumed?: () => void;
  onHasOtherMembersChange?: (hasOthers: boolean) => void;
  onCategoryDrillDown?: (subCategoryId: string) => void;
  onUncategorizedDrillDown?: () => void;
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
  cashSpent: number;          // non-CC expenses
  ccSpent: number;            // CC expenses only
  totalSpent: number;         // all expenses (for budget tracking)
  netTransfer: number;        // positive = received more, negative = sent more
  expectedCashBalance: number; // income - cashSpent + netTransfer
}

export function DashboardTab({ onOpenMenu, quickAddTrigger, fundTransferTrigger, onFundTransferConsumed, onHasOtherMembersChange, onCategoryDrillDown, onUncategorizedDrillDown }: DashboardTabProps) {
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
  const [uncategorizedTotal, setUncategorizedTotal] = useState(0);
  const [uncategorizedCountAll, setUncategorizedCountAll] = useState(0);
  const [uncategorizedCountThisMonth, setUncategorizedCountThisMonth] = useState(0);
  const [totalCCSpent, setTotalCCSpent] = useState(0);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

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
      const [planResult, subCategoriesResult, allocationsResult, transactionsResult, usersResult, uncatCountResult] = await Promise.all([
        getMonthlyPlan(householdData.id, currentMonth),
        getHouseholdSubCategories(householdData.id),
        getAllocations(householdData.id, currentMonth),
        getCurrentMonthTransactions(householdData.id),
        getHouseholdUsers(householdData.id),
        getUncategorizedCount(householdData.id),
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

      // Calculate total CC expenses (for Cash Position card)
      const ccSpent = transactions
        .filter(t => t.transaction_type === 'expense' && t.payment_method === 'card')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalCCSpent(ccSpent);

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

      // Calculate uncategorized expense total (sub_category_id === null, non-transfer)
      const uncategorizedTxns = transactions.filter(t => t.transaction_type === 'expense' && t.sub_category_id === null);
      const uncategorizedSpent = uncategorizedTxns.reduce((sum, t) => sum + t.amount, 0);
      setUncategorizedTotal(uncategorizedSpent);
      setUncategorizedCountThisMonth(uncategorizedTxns.length);
      setUncategorizedCountAll(uncatCountResult.count);

      // Calculate variable-only spending for daily spending card
      // Include uncategorized expenses in the daily velocity (they're assumed as day-to-day spending)
      const varSpent = categoryList
        .filter(c => c.categoryName === 'Variable')
        .reduce((sum, c) => sum + c.actual, 0) + uncategorizedSpent;
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

      // Calculate balance for each user (split CC vs cash expenses)
      const balances: UserBalance[] = userIds.map(userId => {
        const userIncome = transactions
          .filter(t => t.transaction_type === 'income' && t.logged_by === userId)
          .reduce((sum, t) => sum + t.amount, 0);

        const userExpenses = transactions
          .filter(t => t.transaction_type === 'expense' && t.logged_by === userId);

        const userCashSpent = userExpenses
          .filter(t => t.payment_method !== 'card')
          .reduce((sum, t) => sum + t.amount, 0);

        const userCCSpent = userExpenses
          .filter(t => t.payment_method === 'card')
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
          cashSpent: userCashSpent,
          ccSpent: userCCSpent,
          totalSpent: userCashSpent + userCCSpent,
          netTransfer,
          expectedCashBalance: userIncome - userCashSpent + netTransfer,
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
  const cashInHand = userBalances.reduce((sum, u) => sum + u.expectedCashBalance, 0);
  const netPosition = cashInHand - totalCCSpent;

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
      <div className="min-h-screen bg-[var(--color-page-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If plan is not frozen, show prompt to set up budget
  if (planStatus === 'draft') {
    return (
      <div className="min-h-screen bg-[var(--color-page-bg)]">
        <header className="glass-header px-4 py-3 md:hidden">
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Home</h1>
        </header>
        <main className="p-4 flex items-center justify-center min-h-[calc(100vh-200px)]">
          <div className="max-w-md mx-auto text-center space-y-6">
            {/* Info Banner */}
            <div className="glass-card p-4 mb-6" style={{ borderColor: 'rgba(59,130,246,0.2)' }}>
              <p className="text-sm text-blue-800 flex items-start gap-2">
                <span className="text-base">ℹ️</span>
                <span>
                  <strong>Set up your budget to unlock the app and start tracking!</strong>
                </span>
              </p>
            </div>

            {/* Main illustration */}
            <div className="mb-4">
              <div className="w-24 h-24 mx-auto bg-[var(--color-primary-bg)] rounded-full flex items-center justify-center mb-4">
                <span className="text-5xl">🔒</span>
              </div>
              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-2">Home Locked</h2>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                Create your first budget in the <strong>Budget tab</strong> to unlock the Dashboard and start recording transactions.
              </p>
            </div>

            {/* CTA */}
            <p className="text-xs text-[var(--color-text-tertiary)] mt-8">
              💡 Once you freeze your budget, you'll be able to track spending, record transactions, and see your financial progress.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* Header - Mobile only */}
      <header className="glass-header px-4 py-3 flex items-center justify-between md:hidden">
        <h1 className="text-lg font-bold text-[var(--color-text-primary)]">Home</h1>
      </header>

      {/* Content */}
      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Month & Days Remaining */}
          <div className="flex items-center justify-between">
            <h2 className="text-[17px] font-bold text-[var(--color-text-primary)]">{monthDisplay}</h2>
            <span className="text-[11px] font-medium text-[var(--color-text-secondary)] bg-white/60 backdrop-blur-sm border border-[var(--color-border)] px-3 py-1 rounded-full">{daysRemaining} days left</span>
          </div>

          {/* Row 1: Income Summary — Total Income with budgeted/unbudgeted bar */}
          <div className="glass-card glass-card-elevated px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-text-secondary)]">Total Income</span>
              <p className="text-xl font-bold text-[var(--color-success)]">
                ₹{formatNumber(totalActualIncome)}
              </p>
            </div>

            {/* Stacked bar: Budgeted | Unbudgeted */}
            {totalActualIncome > 0 && (
              <>
                <div className="h-2.5 bg-black/[0.04] rounded-full overflow-hidden flex">
                  <div
                    className="h-full rounded-l-full"
                    style={{
                      width: `${Math.min((totalPlanned / totalActualIncome) * 100, 100)}%`,
                      background: 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))'
                    }}
                  />
                  {unallocated > 0 && (
                    <div
                      className="h-full"
                      style={{
                        width: `${(unallocated / totalActualIncome) * 100}%`,
                        background: 'linear-gradient(90deg, #34D399, #6EE7B7)'
                      }}
                    />
                  )}
                </div>

                {/* Legend */}
                <div className="flex justify-between items-center mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">Budgeted</span>
                    <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">₹{formatNumber(totalPlanned)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${unallocated >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">Unbudgeted</span>
                    <span className={`text-[10px] font-semibold ${unallocated >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
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
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="icon-container icon-container-sm" style={{ background: 'rgba(5,150,105,0.1)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5"><path d="M12 2v20m8-8H4"/></svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Left to Spend</h3>
                </div>
              </div>

              <div className="mb-3">
                <p className={`font-bold ${Math.abs(remaining) >= 100000 ? 'text-[22px]' : 'text-2xl'} ${remaining >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                  {remaining >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(remaining))}
                </p>
                {remaining < 0 && (
                  <p className="text-[10px] text-[var(--color-danger)] mt-1">Over budget</p>
                )}
              </div>

              <div>
                <div className="progress-bar mb-3" style={{ height: '6px' }}>
                  <div
                    className="progress-bar-fill"
                    style={{
                      width: `${Math.min(percentUsed, 100)}%`,
                      background: percentUsed > 100 ? 'var(--color-danger)' : percentUsed > 80 ? 'var(--color-warning)' : 'linear-gradient(90deg, var(--color-primary), var(--color-primary-light))'
                    }}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[9px] font-medium text-[var(--color-text-tertiary)] uppercase">Budget</p>
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">₹{formatNumber(totalPlanned)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-medium text-[var(--color-text-tertiary)] uppercase">Spent</p>
                    <p className="text-xs font-semibold text-[var(--color-text-secondary)]">₹{formatNumber(totalSpent)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Spending */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="icon-container icon-container-sm" style={{ background: 'var(--color-primary-bg)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5"><path d="M13 17h8m-8-5h8m-8-5h8M3 7l3 3-3 3"/></svg>
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Daily Spending</h3>
                </div>
              </div>

              <div className="mb-3 text-center">
                <p className="text-2xl font-bold text-[var(--color-primary)]">
                  ₹{formatNumber(dailyAverage)}
                </p>
                <p className="text-[10px] text-[var(--color-text-tertiary)] mt-1">Average/day (variable)</p>
              </div>

              {projectedOverspend > 0 ? (
                <div className="px-2 py-2 rounded-xl text-center" style={{ background: 'var(--color-danger-light)' }}>
                  <p className="text-[11px] font-semibold text-[var(--color-danger)] flex items-center justify-center gap-1">
                    <span>⚠️</span> Alert
                  </p>
                  <p className="text-[10px] text-[var(--color-danger)] mt-0.5">
                    Reduce to ₹{formatNumber(daysRemaining > 0 ? Math.ceil(variableRemaining / daysRemaining) : 0)}/day
                  </p>
                </div>
              ) : (
                <div className="px-2 py-2 rounded-xl text-center" style={{ background: 'var(--color-success-light)' }}>
                  <p className="text-[11px] font-semibold text-[var(--color-success)] flex items-center justify-center gap-1">
                    ✅ On Track
                  </p>
                  <p className="text-[10px] text-[var(--color-success)] mt-0.5">
                    Keep under ₹{formatNumber(daysRemaining > 0 ? Math.ceil(variableRemaining / daysRemaining) : 0)}/day
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 3: Cash Position — shows Cash in Hand, CC Due, and Net */}
          <div className="glass-card px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <div className="icon-container" style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(5,150,105,0.1)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5"><rect x="1" y="4" width="22" height="16" rx="2"/><path d="M1 10h22"/></svg>
                </div>
                <h3 className="text-xs font-semibold text-[var(--color-text-secondary)]">Cash Position</h3>
              </div>
              {userBalances.length > 1 && (
                <button
                  onClick={() => setShowOtherMembers(true)}
                  className="text-[11px] text-[var(--color-primary)] font-medium px-2.5 py-1 rounded-full border border-[rgba(124,58,237,0.2)] bg-[var(--color-primary-bg)] whitespace-nowrap flex-shrink-0"
                >
                  Split by Members
                </button>
              )}
            </div>

            {/* Cash in Hand */}
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">💵</span>
                <span className="text-xs text-[var(--color-text-secondary)]">Cash in Hand</span>
              </div>
              <span className={`text-sm font-bold ${cashInHand >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                {cashInHand >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(cashInHand))}
              </span>
            </div>

            {/* CC Due — only show if there are CC expenses */}
            {totalCCSpent > 0 && (
              <>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px]">💳</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">Credit Card Due</span>
                  </div>
                  <span className="text-sm font-bold text-[var(--color-warning)]">
                    ₹{formatNumber(totalCCSpent)}
                  </span>
                </div>

                {/* Divider + Net Position */}
                <div className="border-t border-black/[0.06] my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--color-text-primary)]">Net Position</span>
                  <span className={`text-lg font-bold ${netPosition >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                    {netPosition >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(netPosition))}
                  </span>
                </div>
              </>
            )}

            {/* Subtitle when no CC expenses */}
            {totalCCSpent === 0 && (
              <p className="text-[10px] text-[var(--color-text-tertiary)] ml-6">Total income v/s actual expense</p>
            )}
          </div>

          {/* 3a. Variable Categories At-Risk (>=75%) + Uncategorised */}
          {(variableAtRisk.length > 0 || uncategorizedTotal > 0) && (
            <>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="icon-container icon-container-sm" style={{ background: 'rgba(217,119,6,0.1)' }}>
                    <span className="text-sm">⏰</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Daily Expenses to Watch!</h3>
                </div>
              </div>
              <div className="glass-card px-4 py-2">
                {variableAtRisk.map((cat, i) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-black/[0.04]' : ''} ${onCategoryDrillDown ? 'cursor-pointer active:bg-black/[0.02] transition-colors' : ''}`}
                    onClick={() => onCategoryDrillDown?.(cat.id)}
                  >
                    <div className={`w-[3px] h-9 rounded-sm ${cat.percentUsed > 100 ? 'bg-[var(--color-danger)]' : 'bg-[var(--color-warning)]'}`} />
                    <div className="icon-container icon-container-md" style={{
                      background: cat.percentUsed > 100 ? 'rgba(220,38,38,0.06)' : 'rgba(217,119,6,0.06)'
                    }}>
                      <span className="text-base">{cat.icon}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{cat.name}</span>
                      <span className="block text-[10px] text-[var(--color-text-tertiary)]">Variable</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className={`text-sm font-bold ${
                          cat.percentUsed > 100 ? 'text-[var(--color-danger)]' : 'text-[var(--color-warning)]'
                        }`}>
                          {Math.ceil(cat.percentUsed)}%
                        </span>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">
                          ₹{formatNumber(cat.actual)} / ₹{formatNumber(cat.planned)}
                        </p>
                      </div>
                      {onCategoryDrillDown && (
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
                {/* Uncategorised row — shows imported transactions without a category */}
                {uncategorizedTotal > 0 && (
                  <div
                    className={`flex items-center gap-3 py-2.5 ${variableAtRisk.length > 0 ? 'border-t border-black/[0.04]' : ''} ${onUncategorizedDrillDown ? 'cursor-pointer active:bg-black/[0.02] transition-colors' : ''}`}
                    onClick={() => onUncategorizedDrillDown?.()}
                  >
                    <div className="w-[3px] h-9 rounded-sm bg-amber-400" />
                    <div className="icon-container icon-container-md" style={{ background: 'rgba(217,119,6,0.08)' }}>
                      <span className="text-base">❓</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-amber-700">Uncategorised</span>
                      <span className="block text-[10px] text-amber-600/70">
                        {uncategorizedCountThisMonth} this month{uncategorizedCountAll > uncategorizedCountThisMonth ? ` · ${uncategorizedCountAll} total` : ''}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className="text-sm font-bold text-amber-600">
                          ₹{formatNumber(uncategorizedTotal)}
                        </span>
                        <p className="text-[10px] text-amber-600/60">unbudgeted</p>
                      </div>
                      {onUncategorizedDrillDown && (
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* 3b. Non-Variable Overspent Categories (>100%) */}
          {nonVariableOverspent.length > 0 && (
            <>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <div className="icon-container icon-container-sm" style={{ background: 'rgba(220,38,38,0.1)' }}>
                    <span className="text-sm">🚨</span>
                  </div>
                  <h3 className="text-sm font-semibold text-[var(--color-danger)]">Overspent Categories</h3>
                </div>
              </div>
              <div className="glass-card px-4 py-2">
                {nonVariableOverspent.map((cat, i) => (
                  <div
                    key={cat.id}
                    className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-black/[0.04]' : ''} ${onCategoryDrillDown ? 'cursor-pointer active:bg-black/[0.02] transition-colors' : ''}`}
                    onClick={() => onCategoryDrillDown?.(cat.id)}
                  >
                    <div className="w-[3px] h-9 rounded-sm bg-[var(--color-danger)]" />
                    <div className="icon-container icon-container-md" style={{ background: 'rgba(220,38,38,0.06)' }}>
                      <span className="text-base">{cat.icon}</span>
                    </div>
                    <div className="flex-1">
                      <span className="text-[13px] font-medium text-[var(--color-text-primary)]">{cat.name}</span>
                      <span className="block text-[10px] text-[var(--color-text-tertiary)]">{cat.categoryName || 'Fixed'}</span>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      <div>
                        <span className="text-sm font-bold text-[var(--color-danger)]">
                          {Math.ceil(cat.percentUsed)}%
                        </span>
                        <p className="text-[10px] text-[var(--color-text-tertiary)]">
                          ₹{formatNumber(cat.actual)} / ₹{formatNumber(cat.planned)}
                        </p>
                      </div>
                      {onCategoryDrillDown && (
                        <svg className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* No issues */}
          {variableAtRisk.length === 0 && nonVariableOverspent.length === 0 && uncategorizedTotal === 0 && (
            <div className="glass-card p-6 text-center">
              <span className="text-4xl mb-3 block">🎉</span>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">All Categories Healthy</h3>
              <p className="text-xs text-[var(--color-text-tertiary)]">No categories are at risk of exceeding budget</p>
            </div>
          )}

          {/* Trust indicator */}
          <button
            onClick={() => setShowPrivacyInfo(true)}
            className="w-full flex items-center justify-center gap-1.5 mt-2 py-2 text-[11px] text-gray-400 hover:text-gray-500 transition-colors"
          >
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Your data: Encrypted, private, never shared</span>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </main>

      {/* Privacy Info Modal */}
      <PrivacyInfoModal isOpen={showPrivacyInfo} onClose={() => setShowPrivacyInfo(false)} />

      {/* FAB - Quick Add Transaction (Web only - mobile uses bottom nav center button) */}
      {household && (
        <div className="hidden md:block fixed bottom-8 right-4 z-30 group">
          <button
            onClick={() => setShowQuickAdd(true)}
            className="w-14 h-14 bg-primary-gradient text-white rounded-2xl shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(124,58,237,0.4)] active:scale-95 transition-all flex items-center justify-center"
            aria-label="Add transaction"
          >
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
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
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowOtherMembers(false)} />

          {/* Modal */}
          <div className="relative w-full md:w-[420px] md:max-w-[90vw] bg-white/90 backdrop-blur-xl rounded-t-3xl md:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-[var(--glass-shadow-elevated)] border border-[rgba(124,58,237,0.1)] animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.04]">
              <div className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Member Balances
                </h2>
              </div>
              <button onClick={() => setShowOtherMembers(false)} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="space-y-3">
                {userBalances.map(user => (
                  <div key={user.userId} className="glass-card p-3">
                    {/* User name and balance */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="icon-container icon-container-sm" style={{ background: 'var(--color-primary-bg)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a8.38 8.38 0 0 1 13 0"/></svg>
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{user.userName}</span>
                        {user.userId === currentUserId && (
                          <span className="text-[9px] bg-[var(--color-primary-bg)] text-[var(--color-primary)] px-1.5 py-0.5 rounded-md font-medium">You</span>
                        )}
                      </div>
                      <p className={`text-lg font-bold ${user.expectedCashBalance >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                        {user.expectedCashBalance >= 0 ? '₹' : '(-) ₹'}{formatNumber(Math.abs(user.expectedCashBalance))}
                      </p>
                    </div>

                    {/* Breakdown */}
                    <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] flex-wrap gap-y-1">
                      <div>
                        <span>Income: </span>
                        <span className="font-medium text-[var(--color-text-secondary)]">₹{formatNumber(user.income)}</span>
                      </div>
                      <div>
                        <span>Spent: </span>
                        <span className="font-medium text-[var(--color-text-secondary)]">₹{formatNumber(user.cashSpent)}</span>
                      </div>
                      {user.ccSpent > 0 && (
                        <div>
                          <span>CC: </span>
                          <span className="font-medium text-[var(--color-warning)]">₹{formatNumber(user.ccSpent)}</span>
                        </div>
                      )}
                      {user.netTransfer !== 0 && !isNaN(user.netTransfer) && (
                        <div>
                          <span>Transfers: </span>
                          <span className="font-medium text-[var(--color-text-secondary)]">{user.netTransfer > 0 ? '+' : '-'}₹{formatNumber(Math.abs(user.netTransfer))}</span>
                        </div>
                      )}
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
