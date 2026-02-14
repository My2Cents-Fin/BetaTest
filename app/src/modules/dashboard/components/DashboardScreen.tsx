import { useState, useEffect, useRef } from 'react';
import { ProfilePanel, MenuButton } from '../../../shared/components/ProfilePanel';
import { getUserHousehold } from '../../onboarding/services/onboarding';
import { getHouseholdSubCategories, getAllocations, createDefaultExpenseTemplate, upsertMonthlyPlan, saveAllocations, renameSubCategory, updateSubCategoryOrder, createSubCategory, getCategoryList, deleteSubCategory, getMonthlyPlan, freezePlan } from '../../budget/services/budget';
import { getRecentSubCategories, getCurrentMonthTransactions } from '../../budget/services/transactions';
import { calculateMonthlyAmount, EXPENSE_CATEGORIES } from '../../budget/data/defaultCategories';
import { formatNumber } from '../../budget/components/AmountInput';
import { WelcomeCard } from './WelcomeCard';
import { BudgetSection } from './BudgetSection';
import { QuickAddTransaction } from './QuickAddTransaction';
import type { AddingState } from './BudgetSection';
import type { HouseholdSubCategory, BudgetAllocation, Period, PlanStatus } from '../../budget/types';

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

export function DashboardScreen() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [household, setHousehold] = useState<Household | null>(null);
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

  // Transaction recording
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [recentSubCategoryIds, setRecentSubCategoryIds] = useState<string[]>([]);
  const [totalSpentThisMonth, setTotalSpentThisMonth] = useState(0);

  // Prevent double-execution in React StrictMode
  const hasLoadedRef = useRef(false);

  // Current month for budget
  const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
  const monthDisplay = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setIsLoading(true);
    try {
      // Get household
      const householdData = await getUserHousehold();
      console.log('[Dashboard] Household:', householdData);
      if (!householdData) {
        console.error('[Dashboard] No household found');
        return;
      }
      setHousehold(householdData);

      // Get categories for adding new items
      const categoriesResult = await getCategoryList();
      if (categoriesResult.categories) {
        setCategories(categoriesResult.categories);
      }

      // Get sub-categories
      let subCategoriesResult = await getHouseholdSubCategories(householdData.id);
      console.log('[Dashboard] Initial subCategories:', subCategoriesResult);
      let subCategories = subCategoriesResult.subCategories || [];

      // First visit - create default template
      if (subCategories.length === 0) {
        console.log('[Dashboard] No subcategories, creating default template...');
        setShowWelcome(true);
        const templateResult = await createDefaultExpenseTemplate(householdData.id);
        console.log('[Dashboard] Template creation result:', templateResult);
        subCategoriesResult = await getHouseholdSubCategories(householdData.id);
        console.log('[Dashboard] SubCategories after template:', subCategoriesResult);
        subCategories = subCategoriesResult.subCategories || [];
      } else {
        // Check localStorage for welcome dismissal
        const welcomeDismissed = localStorage.getItem('my2cents_welcome_dismissed');
        setShowWelcome(!welcomeDismissed);
      }

      // Get allocations for current month
      const allocationsResult = await getAllocations(householdData.id, currentMonth);
      const allocations = allocationsResult.allocations || [];

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

        // Categorize based on category type (from join)
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
      const planResult = await upsertMonthlyPlan(householdData.id, currentMonth, totalIncome, totalExpenses);

      // Check plan status
      if (planResult.plan) {
        setPlanId(planResult.plan.id);
        setPlanStatus(planResult.plan.status);
      } else {
        // Try to get existing plan
        const existingPlan = await getMonthlyPlan(householdData.id, currentMonth);
        if (existingPlan.plan) {
          setPlanId(existingPlan.plan.id);
          setPlanStatus(existingPlan.plan.status);
        }
      }

      // Load recent sub-categories for quick add
      const recentResult = await getRecentSubCategories(householdData.id, 5);
      if (recentResult.success && recentResult.recentIds) {
        setRecentSubCategoryIds(recentResult.recentIds);
      }

      // Load this month's transactions to calculate spent
      const transactionsResult = await getCurrentMonthTransactions(householdData.id);
      if (transactionsResult.success && transactionsResult.transactions) {
        const spent = transactionsResult.transactions
          .filter(t => t.transaction_type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);
        setTotalSpentThisMonth(spent);
      }

    } catch (e) {
      console.error('Error loading dashboard:', e);
    } finally {
      setIsLoading(false);
    }
  }

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

    // Find income category
    const incomeCategory = categories.find(c => c.type === 'income');
    if (!incomeCategory) {
      console.error('No income category found');
      return;
    }

    // Create the sub-category
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

    // Use provided category or find first expense category
    let targetCategoryId = categoryId;
    if (!targetCategoryId) {
      const expenseCategory = categories.find(c => c.type === 'expense');
      targetCategoryId = expenseCategory?.id;
    }

    if (!targetCategoryId) {
      console.error('No expense category found');
      return;
    }

    // Find category details
    const category = categories.find(c => c.id === targetCategoryId);

    // Create the sub-category
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

  const handleSaveItem = async (id: string, amount: number, period: Period) => {
    if (!household) return;

    // Clear incomplete highlight if amount is now > 0
    if (amount > 0) {
      clearIncompleteHighlight(id);
    }

    // Update local state immediately for responsiveness (spread preserves categoryName/categoryIcon)
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

    // Save to database
    try {
      await saveAllocations(household.id, currentMonth, [
        { subCategoryId: id, amount, period }
      ]);

      // Update monthly plan totals
      const totalIncome = newIncomeItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
      const totalExpenses = newExpenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
      await upsertMonthlyPlan(household.id, currentMonth, totalIncome, totalExpenses);
    } catch (e) {
      console.error('Failed to save allocation:', e);
      // Could show an error toast here
    }
  };

  const handleDeleteItem = async (item: BudgetItem) => {
    // Remove from local state immediately
    setIncomeItems(incomeItems.filter(i => i.id !== item.id));
    setExpenseItems(expenseItems.filter(i => i.id !== item.id));

    // Delete from database
    try {
      await deleteSubCategory(item.id);
    } catch (e) {
      console.error('Failed to delete item:', e);
      // Could show an error toast and restore the item
    }
  };

  const handleRenameItem = async (id: string, newName: string) => {
    // Update local state immediately for responsiveness
    const updateItems = (items: BudgetItem[]): BudgetItem[] =>
      items.map(item =>
        item.id === id ? { ...item, name: newName } : item
      );

    setIncomeItems(updateItems(incomeItems));
    setExpenseItems(updateItems(expenseItems));

    // Save to database
    try {
      await renameSubCategory(id, newName);
    } catch (e) {
      console.error('Failed to rename item:', e);
      // Could show an error toast and revert
    }
  };

  const handleReorderIncome = async (startIndex: number, endIndex: number) => {
    // Reorder locally
    const newItems = Array.from(incomeItems);
    const [removed] = newItems.splice(startIndex, 1);
    newItems.splice(endIndex, 0, removed);
    setIncomeItems(newItems);

    // Save new order to database
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

    // Filter items by category and reorder within that category
    const categoryItems = expenseItems.filter(item => item.categoryName === categoryName);
    const otherItems = expenseItems.filter(item => item.categoryName !== categoryName);

    // Reorder within category
    const [removed] = categoryItems.splice(startIndex, 1);
    categoryItems.splice(endIndex, 0, removed);

    // Rebuild full expense list maintaining category order
    const categoryOrder = ['Fixed', 'Variable', 'EMI', 'Insurance', 'Savings', 'One-time'];
    const grouped: Record<string, BudgetItem[]> = {};

    // Group other items
    otherItems.forEach(item => {
      const cat = item.categoryName || 'Other';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    // Add reordered category
    grouped[categoryName] = categoryItems;

    // Flatten in order
    const newExpenseItems: BudgetItem[] = [];
    categoryOrder.forEach(cat => {
      if (grouped[cat]) {
        newExpenseItems.push(...grouped[cat]);
        delete grouped[cat];
      }
    });
    // Add any remaining categories
    Object.values(grouped).forEach(items => newExpenseItems.push(...items));

    setExpenseItems(newExpenseItems);

    // Save new order to database (just update the reordered category)
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

  // Freeze plan handler
  const handleFreezePlan = async () => {
    // Find all items with amount = 0
    const incompleteIncome = incomeItems.filter(item => item.amount === 0).map(item => item.id);
    const incompleteExpenses = expenseItems.filter(item => item.amount === 0).map(item => item.id);
    const allIncomplete = [...incompleteIncome, ...incompleteExpenses];

    if (allIncomplete.length > 0) {
      // Show warning and highlight incomplete items
      setIncompleteItemIds(new Set(allIncomplete));
      setShowIncompleteWarning(true);
      return;
    }

    // All items have amounts - proceed with freeze
    if (!planId) {
      console.error('No plan ID found');
      return;
    }

    const result = await freezePlan(planId);
    if (result.success) {
      setPlanStatus('frozen');
      setShowIncompleteWarning(false);
      setIncompleteItemIds(new Set());
    } else {
      console.error('Failed to freeze plan:', result.error);
    }
  };

  // Clear incomplete highlight when item is updated
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

  // Reload transactions after adding one
  const handleTransactionAdded = async () => {
    if (!household) return;

    // Reload recent sub-categories
    const recentResult = await getRecentSubCategories(household.id, 5);
    if (recentResult.success && recentResult.recentIds) {
      setRecentSubCategoryIds(recentResult.recentIds);
    }

    // Reload this month's transactions
    const transactionsResult = await getCurrentMonthTransactions(household.id);
    if (transactionsResult.success && transactionsResult.transactions) {
      const spent = transactionsResult.transactions
        .filter(t => t.transaction_type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      setTotalSpentThisMonth(spent);
    }
  };

  // Calculate totals
  const totalIncome = incomeItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const totalExpenses = expenseItems.reduce((sum, item) => sum + item.monthlyAmount, 0);
  const remaining = totalIncome - totalExpenses;
  const totalBudgeted = totalExpenses; // For post-freeze metrics (total budgeted expenses)
  const totalSpent = totalSpentThisMonth; // From transactions

  // Prepare sub-categories for QuickAddTransaction
  const allSubCategories = [
    ...incomeItems.map(item => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      categoryName: item.categoryName,
      categoryType: 'income' as const,
    })),
    ...expenseItems.map(item => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      categoryName: item.categoryName,
      categoryType: 'expense' as const,
    })),
  ];

  // Income suggestions from templates
  const incomeSuggestions = INCOME_CATEGORY.sub_category_templates
    .map(t => ({ name: t.name, icon: t.icon || '📦' }))
    .filter(s => !incomeItems.some(i => i.name.toLowerCase() === s.name.toLowerCase()));

  // Category-specific expense suggestions from templates
  const expenseSuggestionsByCategory: Record<string, { name: string; icon: string }[]> = {};
  EXPENSE_CATEGORIES.forEach(cat => {
    expenseSuggestionsByCategory[cat.name] = cat.sub_category_templates
      .map(t => ({ name: t.name, icon: t.icon || '📦' }))
      .filter(s => !expenseItems.some(i => i.name.toLowerCase() === s.name.toLowerCase()));
  });

  // Get suggestions for current adding context
  const getExpenseSuggestions = (categoryName?: string) => {
    if (categoryName && expenseSuggestionsByCategory[categoryName]) {
      return expenseSuggestionsByCategory[categoryName];
    }
    // Default: show all unused suggestions from all categories
    return EXPENSE_CATEGORIES.flatMap(cat =>
      cat.sub_category_templates.map(t => ({ name: t.name, icon: t.icon || '📦' }))
    ).filter(s => !expenseItems.some(i => i.name.toLowerCase() === s.name.toLowerCase()));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-purple-800 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          My<span className="font-bold">2Cents</span>
        </h1>
        <MenuButton onClick={() => setIsMenuOpen(true)} />
      </header>

      {/* Content */}
      <main className="p-4 pb-24">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Welcome Card */}
          {showWelcome && (
            <WelcomeCard
              userName={household?.name || 'there'}
              onDismiss={handleDismissWelcome}
            />
          )}

          {/* Month Display */}
          <div className="flex items-center gap-2 text-gray-500">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm font-medium">{monthDisplay}</span>
            <div className="flex-1 h-px bg-gray-200" />
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
            isEditable={planStatus === 'draft'}
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
            isEditable={planStatus === 'draft'}
          />

          {/* Incomplete items warning */}
          {showIncompleteWarning && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div>
                  <p className="font-medium text-orange-800">Add amounts to all items</p>
                  <p className="text-sm text-orange-600 mt-1">
                    {incompleteItemIds.size} item{incompleteItemIds.size > 1 ? 's' : ''} need amounts before you can freeze the plan.
                    Either add an amount or delete items you don't need.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Bar - Draft mode: Compact Summary + Freeze Button */}
      {planStatus === 'draft' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 shadow-lg">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            {/* Remaining */}
            <div className="flex-1">
              <span className="text-xs text-gray-400">Remaining</span>
              <p className={`text-base font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{formatNumber(remaining)}<span className="text-xs font-normal text-gray-400">/mo</span>
              </p>
            </div>
            {/* Freeze button */}
            <button
              onClick={handleFreezePlan}
              className="px-5 py-2.5 bg-purple-700 text-white text-sm font-semibold rounded-xl hover:bg-purple-800 transition-colors whitespace-nowrap"
            >
              Freeze Plan
            </button>
          </div>
        </div>
      )}

      {/* Bottom Bar - Frozen mode: Metrics + Navigation */}
      {planStatus === 'frozen' && (
        <>
          {/* Metrics Summary Card */}
          <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4">
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Budgeted</p>
                  <p className="text-lg font-bold text-gray-900">₹{formatNumber(totalBudgeted)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Spent</p>
                  <p className="text-lg font-bold text-purple-700">₹{formatNumber(totalSpent)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Remaining</p>
                  <p className={`text-lg font-bold ${totalBudgeted - totalSpent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{formatNumber(totalBudgeted - totalSpent)}
                  </p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 text-center mt-1">
                {totalBudgeted > 0 ? Math.ceil((totalSpent / totalBudgeted) * 100) : 0}% of budget used
              </p>
            </div>
          </div>

          {/* Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
            <div className="max-w-2xl mx-auto flex">
              <button className="flex-1 py-3 flex flex-col items-center gap-1 text-purple-700">
                <span className="text-xl">🏠</span>
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setPlanStatus('draft')}
                className="flex-1 py-3 flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600"
              >
                <span className="text-xl">💰</span>
                <span className="text-xs font-medium">Budget</span>
              </button>
            </div>
          </nav>
        </>
      )}

      {/* Profile Panel */}
      <ProfilePanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* FAB - Quick Add Transaction (only when plan is frozen) */}
      {planStatus === 'frozen' && household && (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="fixed bottom-20 right-4 w-14 h-14 bg-purple-600 text-white rounded-full shadow-lg hover:bg-purple-700 active:bg-purple-800 transition-colors flex items-center justify-center z-40"
          aria-label="Add transaction"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Quick Add Transaction Modal */}
      {showQuickAdd && household && (
        <QuickAddTransaction
          householdId={household.id}
          subCategories={allSubCategories}
          recentSubCategoryIds={recentSubCategoryIds}
          onClose={() => setShowQuickAdd(false)}
          onSuccess={handleTransactionAdded}
        />
      )}
    </div>
  );
}
