import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getUserHousehold } from '../../onboarding/services/onboarding';
import { supabase } from '../../../lib/supabase';
import {
  getHouseholdSubCategories,
  getAllocations,
  createDefaultExpenseTemplate,
  upsertMonthlyPlan,
  saveAllocations,
  renameSubCategory,
  updateSubCategoryOrder,
  createSubCategory,
  getCategoryList,
  deleteSubCategory,
  getMonthlyPlan,
  freezePlan,
  getAvailableBudgetMonths,
  getBudgetViewData,
  cloneBudgetAllocations,
} from '../services/budget';
import { getHouseholdUsers, getActualIncomeForMonth } from '../services/transactions';
import type { ActualIncomeItem } from '../services/transactions';
import { calculateMonthlyAmount, EXPENSE_CATEGORIES } from '../data/defaultCategories';
import { formatNumber } from './AmountInput';
import { MonthSelector, formatMonthOption, getCurrentMonth } from './MonthSelector';
import { BudgetViewMode } from './BudgetViewMode';
import { BudgetEmptyState } from './BudgetEmptyState';
import { InlineIncomeSection } from './InlineIncomeSection';
import { WelcomeCard } from '../../dashboard/components/WelcomeCard';
import { BudgetSection } from '../../dashboard/components/BudgetSection';
import { QuickAddTransaction } from '../../dashboard/components/QuickAddTransaction';
import { FundTransferModal } from '../../dashboard/components/FundTransferModal';
import { MemberMultiSelect } from '../../../shared/components/MemberMultiSelect';
import { useBudget } from '../../../app/providers/BudgetProvider';
import type { AddingState } from '../../dashboard/components/BudgetSection';
import type { HouseholdSubCategory, BudgetAllocation, Period, PlanStatus, MonthlyPlan } from '../types';

interface BudgetTabProps {
  onOpenMenu: () => void;
  sidebarCollapsed?: boolean;
  quickAddTrigger?: number;
  fundTransferTrigger?: number;
  onFundTransferConsumed?: () => void;
  onHasOtherMembersChange?: (hasOthers: boolean) => void;
  /** When navigating from Dashboard "Plan Now", this passes the month to plan */
  initialMonth?: string | null;
  onInitialMonthConsumed?: () => void;
}

interface BudgetItem {
  id: string;
  name: string;
  icon: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  period: Period;
  monthlyAmount: number;
}

interface Household {
  id: string;
  name: string;
}

type BudgetStep = 'edit' | 'view' | 'empty';

export function BudgetTab({ onOpenMenu, sidebarCollapsed = false, quickAddTrigger, fundTransferTrigger, onFundTransferConsumed, onHasOtherMembersChange, initialMonth, onInitialMonthConsumed }: BudgetTabProps) {
  const { refetch: refetchBudgetStatus } = useBudget();
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isFirstFreeze, setIsFirstFreeze] = useState(false);

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Budget mode: edit or view
  const [budgetStep, setBudgetStep] = useState<BudgetStep>('view');

  // Actual income from transactions
  const [actualIncome, setActualIncome] = useState<{ totalIncome: number; incomeItems: ActualIncomeItem[] }>({ totalIncome: 0, incomeItems: [] });

  // Income sub-categories (for the income recording form)
  const [incomeSubCategories, setIncomeSubCategories] = useState<{ id: string; name: string; icon: string }[]>([]);

  // View mode data
  const [viewPlan, setViewPlan] = useState<MonthlyPlan | undefined>();
  const [viewItems, setViewItems] = useState<{
    id: string;
    name: string;
    icon: string | null;
    categoryId: string;
    categoryName: string;
    categoryType: 'income' | 'expense';
    categoryIcon: string | null;
    planned: number;
    actual: number;
    period: Period;
  }[]>([]);
  const [viewExpenseTransactions, setViewExpenseTransactions] = useState<{ sub_category_id: string; amount: number; logged_by: string }[]>([]);

  // Edit mode data (expenses only)
  const [expenseItems, setExpenseItems] = useState<BudgetItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string; icon: string }[]>([]);
  const [expenseAddingState, setExpenseAddingState] = useState<AddingState>({ active: false });

  // Plan status
  const [planStatus, setPlanStatus] = useState<PlanStatus>('draft');
  const [planId, setPlanId] = useState<string | null>(null);
  const [incompleteItemIds, setIncompleteItemIds] = useState<Set<string>>(new Set());
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  // Quick add transaction & fund transfer
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showFundTransfer, setShowFundTransfer] = useState(false);
  const [allSubCategories, setAllSubCategories] = useState<{ id: string; name: string; icon: string; categoryName: string; categoryType: 'income' | 'expense' }[]>([]);
  const [householdUsers, setHouseholdUsers] = useState<{ id: string; displayName: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [hasOtherMembers, setHasOtherMembers] = useState(false);

  // Member filter (view mode only) — empty array means "All"
  const [filterMemberIds, setFilterMemberIds] = useState<string[]>([]);
  const [showBudgetFilter, setShowBudgetFilter] = useState(false);
  // Filter refs removed — close-on-outside handled by portal backdrop onClick

  // Auto-save debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Swipe gesture for month navigation
  const contentTouchStartX = useRef<number | null>(null);
  const contentTouchStartY = useRef<number | null>(null);

  const handleContentTouchStart = useCallback((e: React.TouchEvent) => {
    contentTouchStartX.current = e.touches[0].clientX;
    contentTouchStartY.current = e.touches[0].clientY;
  }, []);

  const handleContentTouchEnd = useCallback((e: React.TouchEvent) => {
    if (contentTouchStartX.current === null || contentTouchStartY.current === null) return;
    // Don't swipe during edit mode (interferes with inputs)
    if (budgetStep === 'edit') {
      contentTouchStartX.current = null;
      contentTouchStartY.current = null;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - contentTouchStartX.current;
    const deltaY = e.changedTouches[0].clientY - contentTouchStartY.current;
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      const [year, month] = selectedMonth.split('-').map(Number);
      const offset = deltaX < 0 ? 1 : -1;
      const date = new Date(year, month - 1 + offset, 1);
      const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      // Block backward navigation past minMonth
      if (offset === -1 && minMonth && newMonth < minMonth) return;
      setSelectedMonth(newMonth);
    }
    contentTouchStartX.current = null;
    contentTouchStartY.current = null;
  }, [budgetStep, selectedMonth]);

  // Prevent double-execution in React StrictMode
  const hasLoadedRef = useRef(false);

  const currentMonth = getCurrentMonth();

  // Earliest month the user has a budget for — used to block backward navigation
  const minMonth = availableMonths.length > 0
    ? availableMonths[availableMonths.length - 1]
    : currentMonth;

  // Consume initialMonth from Dashboard "Plan Now" navigation
  useEffect(() => {
    if (initialMonth) {
      setSelectedMonth(initialMonth);
      onInitialMonthConsumed?.();
    }
  }, [initialMonth]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadInitialData();
  }, []);

  // Load data when month changes
  useEffect(() => {
    if (household && hasLoadedRef.current) {
      loadForMonth();
    }
  }, [selectedMonth]);

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

  // Close budget filter: handled by the portal backdrop's onClick.
  // The old document mousedown listener conflicted with the portal
  // (refs pointed to filter buttons, not the portal-rendered panel).

  // Default single-member household to that member selected
  useEffect(() => {
    if (householdUsers.length === 1 && filterMemberIds.length === 0) {
      setFilterMemberIds([householdUsers[0].id]);
    }
  }, [householdUsers]);

  const toggleMemberFilter = (memberId: string) => {
    setFilterMemberIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const clearMemberFilter = () => {
    setFilterMemberIds([]);
    setShowBudgetFilter(false);
  };

  const activeFilterCount = filterMemberIds.length > 0 ? 1 : 0;

  async function loadForMonth(householdOverride?: Household) {
    const hh = householdOverride || household;
    if (!hh) return;

    setIsLoading(true);
    try {
      // Get plan status and income in parallel
      const planMonth = `${selectedMonth}-01`;
      const [planResult, incomeResult] = await Promise.all([
        getMonthlyPlan(hh.id, planMonth),
        getActualIncomeForMonth(hh.id, selectedMonth),
      ]);

      setActualIncome({
        totalIncome: incomeResult.totalIncome,
        incomeItems: incomeResult.incomeItems,
      });

      const plan = planResult.plan;

      if (plan?.status === 'frozen') {
        // Frozen plan → view mode
        setBudgetStep('view');
        await loadViewData(hh);
      } else {
        // No plan or draft plan → show empty state (user chooses clone/fresh via "Plan your budget")
        setBudgetStep('empty');
      }
    } catch (e) {
      console.error('Error loading for month:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadInitialData() {
    setIsLoading(true);
    try {
      // Step 1: Get household (sequential — needs user internally)
      const householdData = await getUserHousehold();
      if (!householdData) {
        console.error('[Budget] No household found');
        return;
      }
      setHousehold(householdData);

      // Step 2: All independent — run in parallel
      const [authResult, usersResult, monthsResult, categoriesResult, subCategoriesResult, incomeResult] = await Promise.all([
        supabase.auth.getUser(),
        getHouseholdUsers(householdData.id),
        getAvailableBudgetMonths(householdData.id),
        getCategoryList(householdData.id),
        getHouseholdSubCategories(householdData.id),
        getActualIncomeForMonth(householdData.id, currentMonth),
      ]);

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

      // Process available months
      let months = monthsResult.months || [];
      if (!months.includes(currentMonth)) {
        months = [currentMonth, ...months];
      }
      setAvailableMonths(months);

      // Process categories
      if (categoriesResult.categories) {
        setCategories(categoriesResult.categories);
        // Extract income sub-categories for income recording form
        const incomeCats = categoriesResult.categories.filter(c => c.type === 'income');
        // We need to get household sub-categories that belong to income categories
        const incomeSubCats = (subCategoriesResult.subCategories || [])
          .filter((sc: HouseholdSubCategory & { categories?: { type: string } }) =>
            sc.categories?.type === 'income' || incomeCats.some(c => c.id === sc.category_id)
          )
          .map(sc => ({ id: sc.id, name: sc.name, icon: sc.icon || '💰' }));
        setIncomeSubCategories(incomeSubCats);
      }

      // Process sub-categories
      const subCategories = subCategoriesResult.subCategories || [];

      // Build sub-categories list for quick add
      const subCatList = subCategories.map((sc: HouseholdSubCategory & { categories?: { type: string; name: string } }) => ({
        id: sc.id,
        name: sc.name,
        icon: sc.icon || '📦',
        categoryName: sc.categories?.name || 'Other',
        categoryType: (sc.categories?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      }));
      setAllSubCategories(subCatList);

      // Set actual income
      setActualIncome({
        totalIncome: incomeResult.totalIncome,
        incomeItems: incomeResult.incomeItems,
      });

      if (subCategories.length === 0) {
        setShowWelcome(true);
        await createDefaultExpenseTemplate(householdData.id);
        // Reload sub-categories after creating defaults
        const refreshedSubCats = await getHouseholdSubCategories(householdData.id);
        const refreshedList = (refreshedSubCats.subCategories || [])
          .map((sc: HouseholdSubCategory & { categories?: { type: string; name: string } }) => ({
            id: sc.id,
            name: sc.name,
            icon: sc.icon || '📦',
            categoryName: sc.categories?.name || 'Other',
            categoryType: (sc.categories?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
          }));
        setAllSubCategories(refreshedList);

        // Also refresh income sub-categories
        const incomeSubCats = (refreshedSubCats.subCategories || [])
          .filter((sc: HouseholdSubCategory & { categories?: { type: string } }) =>
            sc.categories?.type === 'income'
          )
          .map(sc => ({ id: sc.id, name: sc.name, icon: sc.icon || '💰' }));
        setIncomeSubCategories(incomeSubCats);
      }

      // Determine initial step
      const planMonth = `${currentMonth}-01`;
      const planResult = await getMonthlyPlan(householdData.id, planMonth);
      const plan = planResult.plan;

      if (plan?.status === 'frozen') {
        setBudgetStep('view');
        await loadViewData(householdData);
      } else if (plan) {
        // Draft plan exists → edit mode
        setBudgetStep('edit');
        await loadEditData(householdData);
      } else {
        // No plan for current month → empty state
        setBudgetStep('empty');
      }

      const welcomeDismissed = localStorage.getItem('my2cents_welcome_dismissed');
      setShowWelcome(!welcomeDismissed && subCategories.length === 0);
    } catch (e) {
      console.error('Error loading budget:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadViewData(householdOverride?: Household) {
    const hh = householdOverride || household;
    if (!hh) return;

    setIsLoading(true);
    try {
      const result = await getBudgetViewData(hh.id, selectedMonth);
      if (result.success) {
        setViewPlan(result.plan);
        setViewItems(result.items || []);
        setViewExpenseTransactions(result.expenseTransactions || []);
        if (result.incomeData) {
          setActualIncome(result.incomeData);
        }
        if (result.plan) {
          setPlanStatus(result.plan.status);
          setPlanId(result.plan.id);
        }
      }
    } catch (e) {
      console.error('Error loading view data:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadEditData(householdOverride?: Household) {
    const hh = householdOverride || household;
    if (!hh) return;

    setIsLoading(true);
    try {
      const planMonth = `${selectedMonth}-01`;

      // Get sub-categories and allocations in parallel, plus income
      const [subCategoriesResult, allocationsResult, incomeResult] = await Promise.all([
        getHouseholdSubCategories(hh.id),
        getAllocations(hh.id, planMonth),
        getActualIncomeForMonth(hh.id, selectedMonth),
      ]);

      let subCategories = subCategoriesResult.subCategories || [];
      const allocations = allocationsResult.allocations || [];

      // Update actual income
      setActualIncome({
        totalIncome: incomeResult.totalIncome,
        incomeItems: incomeResult.incomeItems,
      });

      // Clean up orphaned sub-categories (ones with no allocations)
      // Only when there are existing allocations (skip for fresh months)
      if (allocations.length > 0) {
        const orphanedSubCats = subCategories.filter((subCat: HouseholdSubCategory & { categories?: { type: string } }) => {
          // Skip income sub-categories — they're not managed through allocations anymore
          if (subCat.categories?.type === 'income') return false;
          const hasAllocation = allocations.some(a => a.sub_category_id === subCat.id);
          return !hasAllocation;
        });

        // Delete orphaned expense sub-categories
        for (const orphan of orphanedSubCats) {
          console.log('[loadEditData] Deleting orphaned sub-category:', orphan.name);
          await deleteSubCategory(orphan.id);
        }

        // Filter out orphaned sub-categories from the list
        subCategories = subCategories.filter(subCat =>
          !orphanedSubCats.some(o => o.id === subCat.id)
        );
      }

      // Map sub-categories to budget items — EXPENSES ONLY
      const expenses: BudgetItem[] = [];

      subCategories.forEach((subCat: HouseholdSubCategory & { categories?: { type: string; name: string; icon: string } }) => {
        const categoryType = subCat.categories?.type;
        if (categoryType === 'income') return; // Skip income — handled as transactions

        const allocation = allocations.find((a: BudgetAllocation) => a.sub_category_id === subCat.id);

        const item: BudgetItem = {
          id: subCat.id,
          name: subCat.name,
          icon: subCat.icon || '📦',
          categoryId: subCat.category_id,
          categoryName: subCat.categories?.name || 'Other',
          categoryIcon: subCat.categories?.icon || '📁',
          amount: allocation?.amount || 0,
          period: allocation?.period || 'monthly',
          monthlyAmount: allocation?.monthly_amount || 0,
        };

        expenses.push(item);
      });

      setExpenseItems(expenses);

      // Ensure monthly plan exists and get status
      // Use actual income from transactions (not from allocations)
      const totalExpenses = expenses.reduce((sum, item) => sum + item.monthlyAmount, 0);
      const planResult = await upsertMonthlyPlan(hh.id, planMonth, incomeResult.totalIncome, totalExpenses);

      if (planResult.plan) {
        setPlanId(planResult.plan.id);
        setPlanStatus(planResult.plan.status);
      } else {
        const existingPlan = await getMonthlyPlan(hh.id, planMonth);
        if (existingPlan.plan) {
          setPlanId(existingPlan.plan.id);
          setPlanStatus(existingPlan.plan.status);
        }
      }
    } catch (e) {
      console.error('Error loading edit data:', e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
  };

  const handleCloneBudget = async (sourceMonth: string) => {
    if (!household) return;
    setIsLoading(true);
    try {
      const result = await cloneBudgetAllocations(household.id, sourceMonth, selectedMonth);
      if (result.success) {
        setBudgetStep('edit');
        await loadEditData();
      } else {
        console.error('Clone failed:', result.error);
        alert('Failed to clone budget. Please try again.');
      }
    } catch (e) {
      console.error('Clone error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFreshBudget = async () => {
    setBudgetStep('edit');
    await loadEditData();
    // Zero out all planned amounts — user fills in everything from scratch
    setExpenseItems(prev => prev.map(item => ({
      ...item,
      amount: 0,
      monthlyAmount: 0,
    })));
    // Zero out income display too
    setActualIncome({ totalIncome: 0, incomeItems: [] });
  };

  const handleCancelDraft = () => {
    setBudgetStep('empty');
  };

  const handleEnterEditMode = () => {
    setBudgetStep('edit');
    loadEditData();
  };

  const handleCancelEdit = () => {
    setBudgetStep('view');
    loadViewData();
    setShowIncompleteWarning(false);
    setIncompleteItemIds(new Set());
  };

  const handleDismissWelcome = () => {
    localStorage.setItem('my2cents_welcome_dismissed', 'true');
    setShowWelcome(false);
  };

  // Handle income changed — refresh income data (used by InlineIncomeSection)
  const handleIncomeChanged = async () => {
    if (!household) return;
    const result = await getActualIncomeForMonth(household.id, selectedMonth);
    setActualIncome({
      totalIncome: result.totalIncome,
      incomeItems: result.incomeItems,
    });

    // Also update the monthly plan totals
    const planMonth = `${selectedMonth}-01`;
    const totalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
    await upsertMonthlyPlan(household.id, planMonth, result.totalIncome, totalExpenses);
  };

  // Expense add handlers
  const handleStartAddExpense = (categoryId?: string, categoryName?: string) => {
    setExpenseAddingState({ active: true, categoryId, categoryName });
  };

  const handleConfirmAddExpense = async (name: string, icon: string, categoryId?: string) => {
    if (!household) return;

    let targetCategoryId = categoryId;
    if (!targetCategoryId) {
      const expenseCategory = categories.find(c => c.type === 'expense');
      targetCategoryId = expenseCategory?.id;
    }

    if (!targetCategoryId) return;

    const category = categories.find(c => c.id === targetCategoryId);

    const result = await createSubCategory(household.id, targetCategoryId, name, icon);
    if (result.success && result.subCategory) {
      const newItem: BudgetItem = {
        id: result.subCategory.id,
        name: result.subCategory.name,
        icon: result.subCategory.icon || icon,
        categoryId: targetCategoryId,
        categoryName: category?.name || 'Other',
        categoryIcon: category?.icon || '📁',
        amount: 0,
        period: 'monthly',
        monthlyAmount: 0,
      };
      setExpenseItems([...expenseItems, newItem]);
    }

    setExpenseAddingState({ active: false });
  };

  const handleCancelAddExpense = () => {
    setExpenseAddingState({ active: false });
  };

  const handleSaveItem = useCallback(async (id: string, amount: number, period: Period) => {
    if (!household) return;

    if (amount > 0) {
      clearIncompleteHighlight(id);
    }

    const planMonth = `${selectedMonth}-01`;

    const updateItems = (items: BudgetItem[]): BudgetItem[] =>
      items.map(item =>
        item.id === id
          ? { ...item, amount, period, monthlyAmount: calculateMonthlyAmount(amount, period) }
          : item
      );

    const newExpenseItems = updateItems(expenseItems);
    setExpenseItems(newExpenseItems);

    // Debounce the actual API call
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await saveAllocations(household.id, planMonth, [
          { subCategoryId: id, amount, period }
        ]);

        const totalExpenses = newExpenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
        await upsertMonthlyPlan(household.id, planMonth, actualIncome.totalIncome, totalExpenses);

        setLastSaved(new Date());
        console.log('[Budget] Draft auto-saved');
      } catch (e) {
        console.error('Failed to save allocation:', e);
      }
    }, 1000);
  }, [household, selectedMonth, expenseItems, actualIncome.totalIncome]);

  const handleDeleteItem = async (item: BudgetItem) => {
    setExpenseItems(expenseItems.filter(i => i.id !== item.id));

    try {
      await deleteSubCategory(item.id);
    } catch (e) {
      console.error('Failed to delete item:', e);
    }
  };

  const handleRenameItem = async (id: string, newName: string) => {
    const updateItems = (items: BudgetItem[]): BudgetItem[] =>
      items.map(item =>
        item.id === id ? { ...item, name: newName } : item
      );

    setExpenseItems(updateItems(expenseItems));

    try {
      await renameSubCategory(id, newName);
    } catch (e) {
      console.error('Failed to rename item:', e);
    }
  };

  const handleReorderExpense = async (startIndex: number, endIndex: number, categoryName?: string) => {
    if (!categoryName) return;

    const categoryItems = expenseItems.filter(item => item.categoryName === categoryName);
    const otherItems = expenseItems.filter(item => item.categoryName !== categoryName);

    const [removed] = categoryItems.splice(startIndex, 1);
    categoryItems.splice(endIndex, 0, removed);

    const categoryOrder = ['Fixed', 'Variable', 'EMI', 'Insurance', 'Savings', 'One-time'];
    const grouped: Record<string, BudgetItem[]> = {};

    otherItems.forEach(item => {
      const cat = item.categoryName || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    grouped[categoryName] = categoryItems;

    const newExpenseItems: BudgetItem[] = [];
    categoryOrder.forEach(cat => {
      if (grouped[cat]) {
        newExpenseItems.push(...grouped[cat]);
        delete grouped[cat];
      }
    });
    Object.values(grouped).forEach(items => newExpenseItems.push(...items));

    setExpenseItems(newExpenseItems);

    try {
      const updates = categoryItems.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));
      await updateSubCategoryOrder(updates);
    } catch (e) {
      console.error('Failed to reorder items:', e);
    }
  };

  const handleFreezePlan = async () => {
    // Flush any pending saves before freezing
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;

      // Save all expense allocations immediately
      if (household) {
        const planMonth = `${selectedMonth}-01`;
        const allAllocations = expenseItems.map(item => ({
          subCategoryId: item.id,
          amount: item.amount,
          period: item.period,
        }));

        await saveAllocations(household.id, planMonth, allAllocations);

        const totalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
        await upsertMonthlyPlan(household.id, planMonth, actualIncome.totalIncome, totalExpenses);
      }
    }

    // Refresh actual income before freeze validation
    if (household) {
      const freshIncome = await getActualIncomeForMonth(household.id, selectedMonth);
      setActualIncome({
        totalIncome: freshIncome.totalIncome,
        incomeItems: freshIncome.incomeItems,
      });

      const currentTotalIncome = freshIncome.totalIncome;
      const currentTotalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);

      // Update the monthly plan with fresh income BEFORE freeze validation
      const planMonth = `${selectedMonth}-01`;
      await upsertMonthlyPlan(household.id, planMonth, currentTotalIncome, currentTotalExpenses);

      // Check for over-allocation against ACTUAL income
      if (currentTotalExpenses > currentTotalIncome) {
        alert(`Cannot freeze plan: Your expenses (₹${formatNumber(currentTotalExpenses)}) exceed your actual income (₹${formatNumber(currentTotalIncome)}). Please reduce expenses or record more income before freezing.`);
        return;
      }
    }

    // Check for incomplete expense items
    const incompleteExpenses = expenseItems.filter(item => item.amount === 0).map(item => item.id);

    if (incompleteExpenses.length > 0) {
      setIncompleteItemIds(new Set(incompleteExpenses));
      setShowIncompleteWarning(true);
      return;
    }

    if (!planId || !household) {
      console.error('[handleFreeze] Missing planId or household:', { planId, household });
      return;
    }

    console.log('[handleFreeze] Starting freeze process:', {
      planId,
      householdId: household.id,
      selectedMonth,
      currentPlanStatus: planStatus
    });

    // Check if this is the first ever frozen budget for this household
    let isFirstBudget = false;
    if (planStatus === 'draft') {
      const { data: currentPlan } = await supabase
        .from('monthly_plans')
        .select('id, frozen_at')
        .eq('id', planId)
        .single();

      if (currentPlan?.frozen_at) {
        isFirstBudget = false;
      } else {
        const { data: anyPlans } = await supabase
          .from('monthly_plans')
          .select('id')
          .eq('household_id', household.id)
          .not('frozen_at', 'is', null)
          .limit(1);

        isFirstBudget = !anyPlans || anyPlans.length === 0;
      }
    }

    const result = await freezePlan(planId);

    if (result.success) {
      setPlanStatus('frozen');
      setShowIncompleteWarning(false);
      setIncompleteItemIds(new Set());
      setBudgetStep('view');
      loadViewData();

      // Update available months if needed
      if (!availableMonths.includes(selectedMonth)) {
        setAvailableMonths([selectedMonth, ...availableMonths]);
      }

      // Show modal for first budget freeze
      if (isFirstBudget) {
        setIsFirstFreeze(true);
      } else {
        (async () => {
          await refetchBudgetStatus();
        })();
      }
    }
  };

  const clearIncompleteHighlight = (id: string) => {
    if (incompleteItemIds.has(id)) {
      const newSet = new Set(incompleteItemIds);
      newSet.delete(id);
      setIncompleteItemIds(newSet);
      if (newSet.size === 0) {
        setShowIncompleteWarning(false);
      }
    }
  };

  // Calculate totals (expenses only — income comes from actualIncome)
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const remaining = actualIncome.totalIncome - totalExpenses;

  // Expense suggestions
  const expenseSuggestionsByCategory: Record<string, { name: string; icon: string }[]> = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    expenseSuggestionsByCategory[cat.name] = cat.sub_category_templates
      .map(t => ({ name: t.name, icon: t.icon || '📦' }))
      .filter(s => !expenseItems.some(i => i.name.toLowerCase() === s.name.toLowerCase()));
  });

  const getExpenseSuggestions = (categoryName?: string) => {
    if (categoryName && expenseSuggestionsByCategory[categoryName]) {
      return expenseSuggestionsByCategory[categoryName];
    }
    return EXPENSE_CATEGORIES.flatMap(cat =>
      cat.sub_category_templates.map(t => ({ name: t.name, icon: t.icon || '📦' }))
    ).filter(s => !expenseItems.some(i => i.name.toLowerCase() === s.name.toLowerCase()));
  };

  // Month options for selector
  const monthOptions = availableMonths.map(m => formatMonthOption(m, currentMonth));

  // Can edit only current or future months
  const canEdit = selectedMonth >= currentMonth;

  // Is in edit mode (income + expenses together)
  const isEditing = budgetStep === 'edit';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-page-bg)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 'setup' step eliminated — clone/fresh options are now inline in BudgetEmptyState

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* Header - Mobile only */}
      <header className="glass-header px-4 py-3 md:hidden">
        {isEditing && planStatus !== 'frozen' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelDraft}
              className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">
              Plan {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
          </div>
        ) : (
          <h1 className="text-xl font-semibold text-gray-900">Budget</h1>
        )}
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 glass-header">
        {isEditing && planStatus !== 'frozen' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancelDraft}
              className="p-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
              aria-label="Go back"
            >
              <svg className="w-5 h-5 text-[var(--color-text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              Plan {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h1>
          </div>
        ) : (
          <h1 className="text-xl font-semibold text-gray-900">Budget</h1>
        )}

        <div className="flex items-center gap-4">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            minMonth={minMonth}
          />

          {budgetStep === 'view' && canEdit && planStatus === 'frozen' && (
            <button
              onClick={handleEnterEditMode}
              className="px-4 py-2 text-sm text-[var(--color-primary)] font-medium border border-[rgba(124,58,237,0.2)] rounded-xl hover:bg-[var(--color-primary-bg)] flex items-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          )}
          {/* Filter icon — desktop (view mode, multi-member households) */}
          {budgetStep === 'view' && hasOtherMembers && (
            <div className="relative">
              <button
                onClick={() => setShowBudgetFilter(!showBudgetFilter)}
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
          )}
        </div>
      </header>

      {/* Mobile Month Selector + Edit Button + Filter (hidden in draft edit — month shown in header) */}
      {!(isEditing && planStatus !== 'frozen') && (
      <div className="md:hidden bg-white/60 backdrop-blur-md border-b border-[rgba(124,58,237,0.08)]">
        <div className="px-4 py-3 flex items-center justify-between">
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
            minMonth={minMonth}
          />
          <div className="flex items-center gap-1">
            {budgetStep === 'view' && canEdit && planStatus === 'frozen' && (
              <button
                onClick={handleEnterEditMode}
                className="p-2 text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] rounded-xl transition-colors"
                aria-label="Edit budget"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            )}
            {/* Filter icon — mobile (view mode, multi-member households) */}
            {budgetStep === 'view' && hasOtherMembers && (
              <div className="relative">
                <button
                  onClick={() => setShowBudgetFilter(!showBudgetFilter)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors bg-primary-gradient text-white shadow-[0_2px_8px_rgba(124,58,237,0.25)]"
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
            )}
          </div>
        </div>
      </div>
      )}

      {/* Budget Filter Dropdown — rendered via portal at document body to escape all containing blocks */}
      {showBudgetFilter && budgetStep === 'view' && hasOtherMembers && createPortal(
        <div className="fixed inset-0 z-50" onClick={() => setShowBudgetFilter(false)}>
          <div
            className="fixed right-4 top-28 md:right-6 md:top-16 w-60 md:w-64 z-50 p-4 rounded-2xl border border-[rgba(124,58,237,0.15)] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filters</span>
              <button onClick={() => setShowBudgetFilter(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <MemberMultiSelect
              label="Members"
              members={householdUsers.map(u => ({ id: u.id, name: u.displayName }))}
              selectedIds={filterMemberIds}
              onToggle={toggleMemberFilter}
            />
            {filterMemberIds.length > 0 && (
              <button
                onClick={clearMemberFilter}
                className="w-full mt-4 py-2 text-xs font-medium text-gray-500 hover:bg-gray-50 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset Filters
              </button>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Content */}
      <main
        className="p-4 pb-24"
        onTouchStart={handleContentTouchStart}
        onTouchEnd={handleContentTouchEnd}
      >
        <div className="max-w-2xl mx-auto space-y-6">
          {/* EMPTY STATE — no budget for this month (includes clone/fresh options) */}
          {budgetStep === 'empty' && household && (
            <BudgetEmptyState
              month={selectedMonth}
              householdId={household.id}
              onClone={handleCloneBudget}
              onFresh={handleFreshBudget}
            />
          )}

          {/* Welcome Card (only in edit mode, first time) */}
          {showWelcome && budgetStep === 'edit' && (
            <WelcomeCard
              userName={household?.name || 'there'}
              onDismiss={handleDismissWelcome}
            />
          )}

          {/* VIEW MODE */}
          {budgetStep === 'view' && (
            <BudgetViewMode
              plan={viewPlan}
              items={viewItems}
              incomeData={actualIncome}
              expenseTransactions={viewExpenseTransactions}
              onEdit={handleEnterEditMode}
              canEdit={canEdit}
              filterMemberIds={filterMemberIds}
            />
          )}

          {/* EDIT MODE — Income + Expenses together */}
          {isEditing && (
            <>
              {/* Status Badges */}
              {lastSaved && (
                <div className="flex justify-end">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-[var(--color-success-bg)] text-[var(--color-success)]">
                    <span>✓</span>
                    <span>Draft saved</span>
                  </div>
                </div>
              )}

              {/* Income Section — inline editable */}
              {household && (
                <InlineIncomeSection
                  householdId={household.id}
                  month={selectedMonth}
                  householdUsers={householdUsers}
                  currentUserId={currentUserId}
                  incomeSubCategories={incomeSubCategories}
                  incomeCategoryId={categories.find(c => c.type === 'income')?.id || ''}
                  incomeItems={actualIncome.incomeItems}
                  totalIncome={actualIncome.totalIncome}
                  onIncomeChanged={handleIncomeChanged}
                  onSubCategoriesChanged={async () => {
                    // Refresh income sub-categories after a new one is created
                    const subCategoriesResult = await getHouseholdSubCategories(household.id);
                    const incomeCats = categories.filter(c => c.type === 'income');
                    const incomeSubCats = (subCategoriesResult.subCategories || [])
                      .filter((sc: HouseholdSubCategory & { categories?: { type: string } }) =>
                        sc.categories?.type === 'income' || incomeCats.some(c => c.id === sc.category_id)
                      )
                      .map(sc => ({ id: sc.id, name: sc.name, icon: sc.icon || '💰' }));
                    setIncomeSubCategories(incomeSubCats);
                  }}
                />
              )}

              {/* Expenses Section */}
              <BudgetSection
                type="expense"
                title="Expenses"
                icon="📤"
                items={expenseItems}
                total={totalExpenses}
                addingState={expenseAddingState}
                getSuggestions={getExpenseSuggestions}
                expenseCategories={categories.filter(c => c.type === 'expense').map(c => ({ id: c.id, name: c.name, icon: c.icon || '📁' }))}
                onStartAdd={handleStartAddExpense}
                onConfirmAdd={handleConfirmAddExpense}
                onCancelAdd={handleCancelAddExpense}
                onSave={handleSaveItem}
                onDelete={handleDeleteItem}
                onRename={handleRenameItem}
                onReorder={handleReorderExpense}
                incompleteItemIds={incompleteItemIds}
                isEditable={true}
              />

              {/* Over-allocation warning */}
              {remaining < 0 && (
                <div className="glass-card border-l-4 border-l-[var(--color-danger)] bg-red-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[var(--color-danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-red-800">Expenses exceed income</p>
                      <p className="text-sm text-red-600 mt-1">
                        You've allocated ₹{formatNumber(Math.abs(remaining))} more than your actual income. Reduce expenses or record more income to freeze this plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Incomplete items warning */}
              {showIncompleteWarning && (
                <div className="glass-card border-l-4 border-l-[var(--color-warning)] bg-orange-50/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[var(--color-warning)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-orange-800">Add amounts to all items</p>
                      <p className="text-sm text-orange-600 mt-1">
                        {incompleteItemIds.size} item{incompleteItemIds.size > 1 ? 's' : ''} need amounts before you can freeze the plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Bottom Bar - Expense Edit Mode */}
      {isEditing && (
        <div className={`fixed bottom-16 md:bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[rgba(124,58,237,0.1)] px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-20 transition-all duration-200 ${sidebarCollapsed ? 'md:left-20' : 'md:left-64'}`}>
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <span className="text-xs text-gray-400">Remaining</span>
              <p className={`text-base font-bold ${remaining >= 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-danger)]'}`}>
                ₹{formatNumber(remaining)}<span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
            </div>
            {planStatus === 'frozen' ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 text-gray-600 text-sm font-medium rounded-xl border border-[rgba(124,58,237,0.15)] bg-white/60 backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezePlan}
                  className="px-5 py-2.5 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 transition-all"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelDraft}
                  className="px-4 py-2.5 text-gray-600 text-sm font-medium rounded-xl border border-[rgba(124,58,237,0.15)] bg-white/60 backdrop-blur-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezePlan}
                  className="px-5 py-2.5 bg-primary-gradient text-white text-sm font-semibold rounded-xl shadow-[0_4px_12px_rgba(124,58,237,0.3)] hover:-translate-y-0.5 transition-all whitespace-nowrap"
                >
                  Freeze Plan
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAB - Quick Add Transaction (Web only - mobile uses bottom nav center button) */}
      {household && budgetStep === 'view' && (
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
          onSuccess={() => {
            if (budgetStep === 'view') {
              loadViewData();
            }
          }}
        />
      )}

      {/* Fund Transfer Modal */}
      {showFundTransfer && household && (
        <FundTransferModal
          householdId={household.id}
          householdUsers={householdUsers.map(u => ({ id: u.id, displayName: u.displayName }))}
          currentUserId={currentUserId}
          onClose={() => setShowFundTransfer(false)}
          onSuccess={() => {
            if (budgetStep === 'view') {
              loadViewData();
            }
          }}
        />
      )}

      {/* Desktop - Secondary FAB for Fund Transfer */}
      {hasOtherMembers && budgetStep === 'view' && (
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
          <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-gray-800/90 backdrop-blur-sm text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Record Fund Transfer
          </div>
        </div>
      )}

      {/* Success Message for First Freeze */}
      {isFirstFreeze && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card glass-card-elevated p-8 max-w-md text-center space-y-4 animate-scale-in">
            <div className="w-16 h-16 bg-primary-gradient rounded-2xl flex items-center justify-center mx-auto shadow-[0_4px_16px_rgba(124,58,237,0.3)]">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Budget Locked!</h2>
            <p className="text-gray-500">
              Your app is now ready to use. You can start tracking expenses and see your financial progress!
            </p>
            <button
              onClick={async () => {
                await refetchBudgetStatus();
                setIsFirstFreeze(false);
                loadViewData();
              }}
              className="w-full py-3 px-6 bg-primary-gradient text-white font-semibold rounded-xl shadow-[0_4px_16px_rgba(124,58,237,0.3)] hover:shadow-[0_6px_20px_rgba(124,58,237,0.4)] hover:-translate-y-0.5 transition-all"
            >
              Let's Go!
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
