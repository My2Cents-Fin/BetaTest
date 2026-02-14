import { useState, useEffect, useRef, useCallback } from 'react';
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
  createCustomCategory,
} from '../services/budget';
import { getHouseholdUsers } from '../services/transactions';
import { calculateMonthlyAmount, EXPENSE_CATEGORIES, INCOME_CATEGORY } from '../data/defaultCategories';
import { formatNumber } from './AmountInput';
import { MonthSelector, formatMonthOption, getCurrentMonth } from './MonthSelector';
import { BudgetViewMode } from './BudgetViewMode';
import { WelcomeCard } from '../../dashboard/components/WelcomeCard';
import { BudgetSection } from '../../dashboard/components/BudgetSection';
import { QuickAddTransaction } from '../../dashboard/components/QuickAddTransaction';
import { FundTransferModal } from '../../dashboard/components/FundTransferModal';
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

type ViewMode = 'view' | 'edit';

export function BudgetTab({ onOpenMenu, sidebarCollapsed = false, quickAddTrigger, fundTransferTrigger, onFundTransferConsumed, onHasOtherMembersChange }: BudgetTabProps) {
  const { refetch: refetchBudgetStatus } = useBudget();
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
  const [isFirstFreeze, setIsFirstFreeze] = useState(false);

  // Month selection
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // View/Edit mode
  const [mode, setMode] = useState<ViewMode>('view');

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

  // Edit mode data
  const [incomeItems, setIncomeItems] = useState<BudgetItem[]>([]);
  const [expenseItems, setExpenseItems] = useState<BudgetItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string; icon: string }[]>([]);
  const [incomeAddingState, setIncomeAddingState] = useState<AddingState>({ active: false });
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

  // Auto-save debouncing
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Prevent double-execution in React StrictMode
  const hasLoadedRef = useRef(false);

  const currentMonth = getCurrentMonth();

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadInitialData();
  }, []);

  // Load data when month changes
  useEffect(() => {
    if (household && hasLoadedRef.current) {
      if (mode === 'view') {
        loadViewData();
      } else {
        loadEditData();
      }
    }
  }, [selectedMonth, mode]);

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
      const [authResult, usersResult, monthsResult, categoriesResult, subCategoriesResult] = await Promise.all([
        supabase.auth.getUser(),
        getHouseholdUsers(householdData.id),
        getAvailableBudgetMonths(householdData.id),
        getCategoryList(householdData.id),
        getHouseholdSubCategories(householdData.id),
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
      }

      // Process sub-categories
      let subCategories = subCategoriesResult.subCategories || [];

      // Build sub-categories list for quick add
      const subCatList = subCategories.map((sc: HouseholdSubCategory & { categories?: { type: string; name: string } }) => ({
        id: sc.id,
        name: sc.name,
        icon: sc.icon || '📦',
        categoryName: sc.categories?.name || 'Other',
        categoryType: (sc.categories?.type === 'income' ? 'income' : 'expense') as 'income' | 'expense',
      }));
      setAllSubCategories(subCatList);

      if (subCategories.length === 0) {
        setShowWelcome(true);
        await createDefaultExpenseTemplate(householdData.id);
        // Go to edit mode for first-time setup (no plan yet)
        setMode('edit');
        await loadEditData(householdData);
      } else {
        const welcomeDismissed = localStorage.getItem('my2cents_welcome_dismissed');
        setShowWelcome(!welcomeDismissed);

        // Always default to view mode - user clicks Edit to enter edit mode
        setMode('view');
        await loadViewData(householdData);
      }
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

      // Get sub-categories
      const subCategoriesResult = await getHouseholdSubCategories(hh.id);
      let subCategories = subCategoriesResult.subCategories || [];

      // Get allocations for selected month
      const allocationsResult = await getAllocations(hh.id, planMonth);
      const allocations = allocationsResult.allocations || [];

      // Clean up orphaned sub-categories (ones with no allocations in ANY month)
      // This happens when user adds an item but closes tab before entering amount
      const orphanedSubCats = subCategories.filter(subCat => {
        // Check if this sub-category has ANY allocation in the current month
        const hasAllocation = allocations.some(a => a.sub_category_id === subCat.id);
        return !hasAllocation;
      });

      // Delete orphaned sub-categories
      for (const orphan of orphanedSubCats) {
        console.log('[loadEditData] Deleting orphaned sub-category:', orphan.name);
        await deleteSubCategory(orphan.id);
      }

      // Filter out orphaned sub-categories from the list
      subCategories = subCategories.filter(subCat =>
        !orphanedSubCats.some(o => o.id === subCat.id)
      );

      // Map sub-categories to budget items with allocations
      const income: BudgetItem[] = [];
      const expenses: BudgetItem[] = [];

      subCategories.forEach((subCat: HouseholdSubCategory & { categories?: { type: string; name: string; icon: string } }) => {
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

        const categoryType = subCat.categories?.type;
        if (categoryType === 'income') {
          income.push(item);
        } else {
          expenses.push(item);
        }
      });

      setIncomeItems(income);
      setExpenseItems(expenses);

      // Ensure monthly plan exists and get status
      const totalIncome = income.reduce((sum, item) => sum + item.monthlyAmount, 0);
      const totalExpenses = expenses.reduce((sum, item) => sum + item.monthlyAmount, 0);
      const planResult = await upsertMonthlyPlan(hh.id, planMonth, totalIncome, totalExpenses);

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
    // Reset to view mode when changing months (unless it's current month with draft)
    if (month !== currentMonth) {
      setMode('view');
    }
  };

  const handleEnterEditMode = () => {
    setMode('edit');
    loadEditData();
  };

  const handleCancelEdit = () => {
    setMode('view');
    loadViewData();
    setShowIncompleteWarning(false);
    setIncompleteItemIds(new Set());
  };

  const handleDismissWelcome = () => {
    localStorage.setItem('my2cents_welcome_dismissed', 'true');
    setShowWelcome(false);
  };

  // Income add handlers
  const handleStartAddIncome = () => {
    setIncomeAddingState({ active: true });
    setExpenseAddingState({ active: false });
  };

  const handleConfirmAddIncome = async (name: string, icon: string) => {
    if (!household) return;

    const incomeCategory = categories.find(c => c.type === 'income');
    if (!incomeCategory) return;

    const result = await createSubCategory(household.id, incomeCategory.id, name, icon);
    if (result.success && result.subCategory) {
      const newItem: BudgetItem = {
        id: result.subCategory.id,
        name: result.subCategory.name,
        icon: result.subCategory.icon || icon,
        categoryId: incomeCategory.id,
        categoryName: incomeCategory.name,
        categoryIcon: incomeCategory.icon,
        amount: 0,
        period: 'monthly',
        monthlyAmount: 0,
      };
      setIncomeItems([...incomeItems, newItem]);
    }

    setIncomeAddingState({ active: false });
  };

  const handleCancelAddIncome = () => {
    setIncomeAddingState({ active: false });
  };

  // Expense add handlers
  const handleStartAddExpense = (categoryId?: string, categoryName?: string) => {
    setExpenseAddingState({ active: true, categoryId, categoryName });
    setIncomeAddingState({ active: false });
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

  // REMOVED - Custom category creation disabled for now
  // const handleAddCustomCategory = async (name: string, icon: string): Promise<{ success: boolean; error?: string; category?: any }> => {
  //   if (!household) return { success: false, error: 'No household found' };
  //   const result = await createCustomCategory(household.id, name, icon);
  //   if (result.success && result.category) {
  //     const categoriesResult = await getCategoryList(household.id);
  //     if (categoriesResult.categories) {
  //       setCategories(categoriesResult.categories);
  //     }
  //     return { success: true, category: result.category };
  //   } else {
  //     return { success: false, error: result.error || 'Failed to create category' };
  //   }
  // };

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

    const newIncomeItems = updateItems(incomeItems);
    const newExpenseItems = updateItems(expenseItems);
    setIncomeItems(newIncomeItems);
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

        const totalIncome = newIncomeItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
        const totalExpenses = newExpenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
        await upsertMonthlyPlan(household.id, planMonth, totalIncome, totalExpenses);

        setLastSaved(new Date());
        console.log('[Budget] Draft auto-saved');
      } catch (e) {
        console.error('Failed to save allocation:', e);
      }
    }, 1000); // Wait 1 second after last change before saving
  }, [household, selectedMonth, incomeItems, expenseItems]);

  const handleDeleteItem = async (item: BudgetItem) => {
    setIncomeItems(incomeItems.filter(i => i.id !== item.id));
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

    setIncomeItems(updateItems(incomeItems));
    setExpenseItems(updateItems(expenseItems));

    try {
      await renameSubCategory(id, newName);
    } catch (e) {
      console.error('Failed to rename item:', e);
    }
  };

  const handleReorderIncome = async (startIndex: number, endIndex: number) => {
    const newItems = Array.from(incomeItems);
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);
    setIncomeItems(newItems);

    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));
      await updateSubCategoryOrder(updates);
    } catch (e) {
      console.error('Failed to reorder items:', e);
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

      // Save all allocations immediately
      if (household) {
        const planMonth = `${selectedMonth}-01`;
        const allAllocations = [...incomeItems, ...expenseItems].map(item => ({
          subCategoryId: item.id,
          amount: item.amount,
          period: item.period,
        }));

        await saveAllocations(household.id, planMonth, allAllocations);

        const totalIncome = incomeItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
        const totalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
        await upsertMonthlyPlan(household.id, planMonth, totalIncome, totalExpenses);
      }
    }

    // Check for over-allocation FIRST (before incomplete check)
    const currentTotalIncome = incomeItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
    const currentTotalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);

    if (currentTotalExpenses > currentTotalIncome) {
      alert(`Cannot freeze plan: Your expenses (₹${formatNumber(currentTotalExpenses)}) exceed your income (₹${formatNumber(currentTotalIncome)}). Please reduce expenses or increase income before freezing.`);
      return;
    }

    const incompleteIncome = incomeItems.filter(item => item.amount === 0).map(item => item.id);
    const incompleteExpenses = expenseItems.filter(item => item.amount === 0).map(item => item.id);
    const allIncomplete = [...incompleteIncome, ...incompleteExpenses];

    if (allIncomplete.length > 0) {
      setIncompleteItemIds(new Set(allIncomplete));
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
    // Check if the current plan has ever been frozen before by looking at frozen_at timestamp
    let isFirstBudget = false;
    if (planStatus === 'draft') {
      console.log('[handleFreeze] Current plan is draft - checking for first freeze');

      // First, check if THIS plan was previously frozen (has frozen_at timestamp)
      const { data: currentPlan } = await supabase
        .from('monthly_plans')
        .select('id, frozen_at')
        .eq('id', planId)
        .single();

      console.log('[handleFreeze] Current plan frozen_at:', currentPlan?.frozen_at);

      if (currentPlan?.frozen_at) {
        // This plan was already frozen before - not first budget
        console.log('[handleFreeze] This plan was previously frozen - not first budget');
        isFirstBudget = false;
      } else {
        // This plan was never frozen - check if ANY other plans exist
        const { data: anyPlans, error: checkError } = await supabase
          .from('monthly_plans')
          .select('id')
          .eq('household_id', household.id)
          .not('frozen_at', 'is', null) // Has been frozen at some point
          .limit(1);

        console.log('[handleFreeze] Other frozen plans query result:', {
          anyPlans,
          count: anyPlans?.length || 0,
          error: checkError
        });

        isFirstBudget = !anyPlans || anyPlans.length === 0;
        console.log('[handleFreeze] First budget check result:', {
          planStatus,
          isFirstBudget,
          planId
        });
      }
    } else {
      console.log('[handleFreeze] Plan status is already frozen - skipping first budget check');
    }

    console.log('[handleFreeze] Calling freezePlan for planId:', planId);
    const result = await freezePlan(planId);
    console.log('[handleFreeze] freezePlan result:', result);

    if (result.success) {
      console.log('[handleFreeze] Freeze successful - updating UI state');
      setPlanStatus('frozen');
      setShowIncompleteWarning(false);
      setIncompleteItemIds(new Set());
      setMode('view');
      loadViewData();

      // Update available months if needed
      if (!availableMonths.includes(selectedMonth)) {
        setAvailableMonths([selectedMonth, ...availableMonths]);
      }

      // Show modal for first budget freeze
      if (isFirstBudget) {
        console.log('[handleFreeze] This is first budget - showing modal');
        setIsFirstFreeze(true);
        // Refetch will happen when modal closes
      } else {
        // Not first budget - refetch immediately to unlock tabs
        console.log('[handleFreeze] Not first budget - refetching status to unlock tabs');
        // Use async IIFE to call refetch immediately without setTimeout
        (async () => {
          console.log('[handleFreeze] Calling refetchBudgetStatus...');
          await refetchBudgetStatus();
          console.log('[handleFreeze] Budget status refetch complete');
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

  // Calculate totals
  const totalIncome = incomeItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const remaining = totalIncome - totalExpenses;

  // Suggestions
  const incomeSuggestions = INCOME_CATEGORY.sub_category_templates
    .map(t => ({ name: t.name, icon: t.icon || '📦' }))
    .filter(s => !incomeItems.some(i => i.name.toLowerCase() === s.name.toLowerCase()));

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header - Mobile only */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <h1 className="text-xl font-semibold text-gray-900">Budget</h1>
      </header>

      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">Budget</h1>

        <div className="flex items-center gap-4">
          <MonthSelector
            selectedMonth={selectedMonth}
            availableMonths={monthOptions}
            onMonthChange={handleMonthChange}
          />

          {mode === 'view' && canEdit && (
            <button
              onClick={handleEnterEditMode}
              className="px-4 py-2 text-sm text-purple-700 font-medium border border-purple-200 rounded-lg hover:bg-purple-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </header>

      {/* Mobile Month Selector + Edit Button */}
      <div className="md:hidden px-4 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
        <MonthSelector
          selectedMonth={selectedMonth}
          availableMonths={monthOptions}
          onMonthChange={handleMonthChange}
        />
        {mode === 'view' && canEdit && (
          <button
            onClick={handleEnterEditMode}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            aria-label="Edit budget"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Welcome Card (only in edit mode, first time) */}
          {showWelcome && mode === 'edit' && (
            <WelcomeCard
              userName={household?.name || 'there'}
              onDismiss={handleDismissWelcome}
            />
          )}

          {/* VIEW MODE */}
          {mode === 'view' && (
            <BudgetViewMode
              plan={viewPlan}
              items={viewItems}
              onEdit={handleEnterEditMode}
              canEdit={canEdit}
            />
          )}

          {/* EDIT MODE */}
          {mode === 'edit' && (
            <>
              {/* Status Badges */}
              <div className="flex items-center gap-2">
                {planStatus === 'frozen' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-yellow-100 text-yellow-700">
                    <span>✏️</span>
                    <span>Editing Mode</span>
                  </div>
                )}
                {lastSaved && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-green-50 text-green-700">
                    <span>✓</span>
                    <span>Draft saved</span>
                  </div>
                )}
              </div>

              {/* Income Section */}
              <BudgetSection
                type="income"
                title="Income"
                icon="💰"
                items={incomeItems}
                total={totalIncome}
                addingState={incomeAddingState}
                suggestions={incomeSuggestions}
                onStartAdd={handleStartAddIncome}
                onConfirmAdd={handleConfirmAddIncome}
                onCancelAdd={handleCancelAddIncome}
                onSave={handleSaveItem}
                onDelete={handleDeleteItem}
                onRename={handleRenameItem}
                onReorder={handleReorderIncome}
                incompleteItemIds={incompleteItemIds}
                isEditable={true}
              />

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
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🚫</span>
                    <div>
                      <p className="font-medium text-red-800">Expenses exceed income</p>
                      <p className="text-sm text-red-600 mt-1">
                        You've allocated ₹{formatNumber(Math.abs(remaining))} more than your income. Reduce expenses or increase income to freeze this plan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Incomplete items warning */}
              {showIncompleteWarning && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
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

      {/* Bottom Bar - Edit Mode */}
      {mode === 'edit' && (
        <div className={`fixed bottom-16 md:bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg z-20 transition-all duration-200 ${sidebarCollapsed ? 'md:left-20' : 'md:left-64'}`}>
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1">
              <span className="text-xs text-gray-400">Remaining</span>
              <p className={`text-base font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{formatNumber(remaining)}<span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
            </div>
            {planStatus === 'frozen' ? (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2.5 text-gray-600 text-sm font-medium rounded-xl border border-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleFreezePlan}
                  className="px-5 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <button
                onClick={handleFreezePlan}
                className="px-5 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 transition-colors whitespace-nowrap"
              >
                Freeze Plan
              </button>
            )}
          </div>
        </div>
      )}

      {/* FAB - Quick Add Transaction (Web only - mobile uses bottom nav center button) */}
      {household && mode === 'view' && (
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
          currentUserId={currentUserId}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={() => {
            // Refresh view data after adding transaction
            if (mode === 'view') {
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
            if (mode === 'view') {
              loadViewData();
            }
          }}
        />
      )}

      {/* Desktop - Secondary FAB for Fund Transfer (only visible if there are other household members) */}
      {hasOtherMembers && mode === 'view' && (
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

      {/* Success Message for First Freeze */}
      {isFirstFreeze && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md text-center space-y-4 shadow-2xl animate-scale-in">
            <div className="text-6xl mb-2">🎉</div>
            <h2 className="text-2xl font-bold text-gray-900">Budget Locked!</h2>
            <p className="text-gray-600">
              Your app is now ready to use. You can start tracking expenses and see your financial progress!
            </p>
            <button
              onClick={async () => {
                console.log('[BudgetTab] Let\'s Go clicked - refetching budget status');
                await refetchBudgetStatus();
                console.log('[BudgetTab] Budget status refetch complete after first freeze');
                setIsFirstFreeze(false);
                loadViewData(); // Reload the view data to show updated amounts
              }}
              className="w-full py-3 px-6 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
            >
              Let's Go! 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
