import { useState } from 'react';
import { formatNumber } from './AmountInput';
import type { Period, MonthlyPlan } from '../types';

interface BudgetItem {
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
}

interface BudgetViewModeProps {
  plan: MonthlyPlan | undefined;
  items: BudgetItem[];
  onEdit: () => void;
  canEdit: boolean;
}

interface GroupedCategory {
  id: string;
  name: string;
  icon: string | null;
  type: 'income' | 'expense';
  items: BudgetItem[];
  totalPlanned: number;
  totalActual: number;
}

export function BudgetViewMode({ plan: _plan, items, onEdit: _onEdit, canEdit: _canEdit }: BudgetViewModeProps) {
  const [incomeCollapsed, setIncomeCollapsed] = useState(false);
  const [expenseCollapsed, setExpenseCollapsed] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Group items by category type and then by category
  const incomeItems = items.filter(i => i.categoryType === 'income');
  const expenseItems = items.filter(i => i.categoryType === 'expense');

  // Group expense items by category
  const expenseCategories = groupByCategory(expenseItems);

  // Calculate totals
  const totalPlannedIncome = incomeItems.reduce((sum, i) => sum + i.planned, 0);
  const totalActualIncome = incomeItems.reduce((sum, i) => sum + i.actual, 0);
  const totalPlannedExpense = expenseItems.reduce((sum, i) => sum + i.planned, 0);
  const totalActualExpense = expenseItems.reduce((sum, i) => sum + i.actual, 0);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Income Section */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setIncomeCollapsed(!incomeCollapsed)}
          className="w-full px-3 md:px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${incomeCollapsed ? '' : 'rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-lg md:text-xl">💰</span>
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Income</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
            <div className="w-16 md:w-20 text-right">
              <span className="text-gray-400 text-[10px] md:text-xs block">Planned</span>
              <span className="font-medium text-gray-700 tabular-nums">₹{formatNumber(totalPlannedIncome)}</span>
            </div>
            <div className="w-16 md:w-20 text-right">
              <span className="text-gray-400 text-[10px] md:text-xs block">Actual</span>
              <span className="font-medium text-green-600 tabular-nums">₹{formatNumber(totalActualIncome)}</span>
            </div>
          </div>
        </button>

        {!incomeCollapsed && <div className="h-px bg-gray-100" />}

        {!incomeCollapsed && (
          <div>
            {incomeItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                No income sources
              </div>
            ) : (
              incomeItems.map(item => (
                <BudgetRow key={item.id} item={item} />
              ))
            )}
          </div>
        )}
      </section>

      {/* Expenses Section */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <button
          onClick={() => setExpenseCollapsed(!expenseCollapsed)}
          className="w-full px-3 md:px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expenseCollapsed ? '' : 'rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-lg md:text-xl">📤</span>
            <h2 className="text-base md:text-lg font-semibold text-gray-900">Expenses</h2>
          </div>
          <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
            <div className="w-16 md:w-20 text-right">
              <span className="text-gray-400 text-[10px] md:text-xs block">Planned</span>
              <span className="font-medium text-gray-700 tabular-nums">₹{formatNumber(totalPlannedExpense)}</span>
            </div>
            <div className="w-16 md:w-20 text-right">
              <span className="text-gray-400 text-[10px] md:text-xs block">Actual</span>
              <span className="font-medium text-red-600 tabular-nums">₹{formatNumber(totalActualExpense)}</span>
            </div>
          </div>
        </button>

        {!expenseCollapsed && <div className="h-px bg-gray-100" />}

        {!expenseCollapsed && (
          <div>
            {expenseItems.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-400 text-sm">
                No expenses
              </div>
            ) : (
              expenseCategories.map(category => {
                const isCategoryExpanded = expandedCategories.has(category.id);
                const categoryPercentUsed = category.totalPlanned > 0 ? (category.totalActual / category.totalPlanned) * 100 : 0;

                // Apply color gradient only for Variable category
                const isVariableCategory = category.name === 'Variable';

                // Variable: red at >=100%, orange/yellow for approaching
                // Non-Variable: red only when strictly exceeding (>100%), not at exactly 100%
                const isCategoryOverBudget = isVariableCategory
                  ? categoryPercentUsed >= 100
                  : categoryPercentUsed > 100;
                const isCategoryHighRisk = categoryPercentUsed >= 90 && categoryPercentUsed < 100;
                const isCategoryMediumRisk = categoryPercentUsed >= 75 && categoryPercentUsed < 90;

                // Determine category actual color
                let categoryActualColor = 'text-purple-600'; // default
                if (isVariableCategory) {
                  if (isCategoryOverBudget) {
                    categoryActualColor = 'text-red-600';
                  } else if (isCategoryHighRisk) {
                    categoryActualColor = 'text-orange-600';
                  } else if (isCategoryMediumRisk) {
                    categoryActualColor = 'text-yellow-700';
                  }
                } else {
                  // For non-Variable categories, only show red if strictly over budget (>100%)
                  if (isCategoryOverBudget) {
                    categoryActualColor = 'text-red-600';
                  }
                }

                return (
                  <div key={category.id}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full px-3 md:px-4 py-2.5 bg-purple-50 flex items-center gap-2 border-t border-purple-100 hover:bg-purple-100 transition-colors"
                    >
                      <svg
                        className={`w-3 h-3 text-purple-400 transition-transform ${isCategoryExpanded ? 'rotate-90' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span className="text-base md:text-lg">{category.icon || '📁'}</span>
                      <span className="text-sm md:text-base font-semibold text-purple-800 flex-1 text-left truncate">{category.name}</span>
                      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
                        <span className="text-purple-600 font-medium tabular-nums w-16 md:w-20 text-right">
                          ₹{formatNumber(category.totalPlanned)}
                        </span>
                        <span className="font-medium tabular-nums w-16 md:w-20 text-right">
                          <span
                            className={`inline-block ${categoryActualColor}`}
                            style={isCategoryOverBudget ? {
                              borderBottom: '2px dotted #ef4444',
                              borderSpacing: '4px'
                            } : undefined}
                          >
                            ₹{formatNumber(category.totalActual)}
                          </span>
                        </span>
                      </div>
                    </button>

                    {/* Category Items - Only show when expanded */}
                    {isCategoryExpanded && (
                      <div>
                        {category.items.map(item => (
                          <BudgetRow key={item.id} item={item} indented />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </section>

    </div>
  );
}

function BudgetRow({ item, indented = false }: { item: BudgetItem; indented?: boolean }) {
  const percentUsed = item.planned > 0 ? (item.actual / item.planned) * 100 : 0;

  // Apply color gradient only for Variable category
  const isVariable = item.categoryName === 'Variable';
  const isIncome = item.categoryType === 'income';

  // Variable: red at >=100%, orange/yellow for approaching
  // Non-Variable: red only when strictly exceeding (>100%), not at exactly 100%
  const isOverBudget = isVariable || isIncome
    ? percentUsed >= 100
    : percentUsed > 100;
  const isHighRisk = percentUsed >= 90 && percentUsed < 100;
  const isMediumRisk = percentUsed >= 75 && percentUsed < 90;

  // Determine text color based on percentage
  let textColor = 'text-gray-700'; // default
  if (isIncome) {
    // For income, exceeding planned is good (green)
    if (isOverBudget) {
      textColor = 'text-green-600';
    }
  } else if (isVariable) {
    if (isOverBudget) {
      textColor = 'text-red-600';
    } else if (isHighRisk) {
      textColor = 'text-orange-600';
    } else if (isMediumRisk) {
      textColor = 'text-yellow-700';
    }
  } else {
    // For non-Variable expense categories, only show red if strictly over budget (>100%)
    if (isOverBudget) {
      textColor = 'text-red-600';
    }
  }

  return (
    <div className={`px-3 md:px-4 py-2 md:py-2.5 flex items-center justify-between hover:bg-gray-50 border-t border-gray-50 ${indented ? 'pl-8 md:pl-10' : ''}`}>
      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
        <span className="text-base md:text-lg flex-shrink-0">{item.icon || '📋'}</span>
        <span className="text-xs md:text-sm text-gray-900 truncate">{item.name}</span>
      </div>
      <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm">
        <span className="text-gray-500 font-medium tabular-nums w-16 md:w-20 text-right">
          ₹{formatNumber(item.planned)}
        </span>
        <span className="font-medium tabular-nums w-16 md:w-20 text-right">
          <span
            className={`inline-block ${textColor}`}
            style={isOverBudget && !isIncome ? {
              borderBottom: '2px dotted #ef4444',
              borderSpacing: '4px'
            } : undefined}
          >
            ₹{formatNumber(item.actual)}
          </span>
        </span>
      </div>
    </div>
  );
}

function groupByCategory(items: BudgetItem[]): GroupedCategory[] {
  const groups = new Map<string, GroupedCategory>();

  // Define category order
  const categoryOrder = ['Fixed', 'Variable', 'EMI', 'Insurance', 'Savings', 'One-time'];

  items.forEach(item => {
    if (!groups.has(item.categoryId)) {
      groups.set(item.categoryId, {
        id: item.categoryId,
        name: item.categoryName,
        icon: item.categoryIcon,
        type: item.categoryType,
        items: [],
        totalPlanned: 0,
        totalActual: 0,
      });
    }
    const group = groups.get(item.categoryId)!;
    group.items.push(item);
    group.totalPlanned += item.planned;
    group.totalActual += item.actual;
  });

  // Sort by predefined order
  const result = Array.from(groups.values()).sort((a, b) => {
    const aIndex = categoryOrder.indexOf(a.name);
    const bIndex = categoryOrder.indexOf(b.name);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return result;
}
