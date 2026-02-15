import { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { formatNumber } from '../../budget/components/AmountInput';
import { BudgetItem } from './BudgetItem';
import { InlineAddItem } from './InlineAddItem';

export interface BudgetItemData {
  id: string;
  name: string;
  icon: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  amount: number;
  period: 'monthly' | 'quarterly' | 'yearly' | 'one-time';
  monthlyAmount: number;
}

export interface AddingState {
  active: boolean;
  categoryId?: string;
  categoryName?: string;
}

interface CategoryOption {
  id: string;
  name: string;
  icon: string;
}

interface BudgetSectionProps {
  type: 'income' | 'expense';
  title: string;
  icon: string;
  items: BudgetItemData[];
  total: number;
  addingState?: AddingState;
  suggestions?: { name: string; icon: string }[];
  getSuggestions?: (categoryName?: string) => { name: string; icon: string }[]; // Category-specific suggestions
  expenseCategories?: CategoryOption[]; // For category selection when adding expense
  existingNames?: string[]; // All existing item names for duplicate prevention
  onStartAdd: (categoryId?: string, categoryName?: string) => void;
  onConfirmAdd: (name: string, icon: string, categoryId?: string) => void;
  onCancelAdd: () => void;
  onSave: (id: string, amount: number, period: BudgetItemData['period']) => void;
  onDelete: (item: BudgetItemData) => void;
  onRename?: (id: string, newName: string) => void;
  onReorder?: (startIndex: number, endIndex: number, categoryName?: string) => void;
  incompleteItemIds?: Set<string>;
  isEditable?: boolean;
  // showCategoryOption?: boolean; // REMOVED - custom categories disabled for now
  // onAddCategory?: (name: string, icon: string) => Promise<{ success: boolean; error?: string; category?: any }>; // REMOVED
}

// Group expense items by category name and calculate totals
function groupByCategory(items: BudgetItemData[]) {
  const groups: Record<string, { name: string; icon: string; items: BudgetItemData[]; total: number }> = {};

  // Define category order
  const categoryOrder = ['Fixed', 'Variable', 'EMI', 'Insurance', 'Savings', 'One-time'];

  items.forEach(item => {
    const categoryName = item.categoryName || 'Other';
    if (!groups[categoryName]) {
      groups[categoryName] = {
        name: categoryName,
        icon: item.categoryIcon || '📁',
        items: [],
        total: 0,
      };
    }
    groups[categoryName].items.push(item);
    groups[categoryName].total += item.monthlyAmount;
  });

  // Sort groups by predefined order
  const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
    const aIndex = categoryOrder.indexOf(a);
    const bIndex = categoryOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return Object.fromEntries(sortedEntries);
}

export function BudgetSection({
  type,
  title,
  icon,
  items,
  total,
  addingState,
  suggestions = [],
  getSuggestions,
  expenseCategories = [],
  existingNames,
  onStartAdd,
  onConfirmAdd,
  onCancelAdd,
  onSave,
  onDelete,
  onRename,
  onReorder,
  incompleteItemIds = new Set(),
  isEditable = true,
  // showCategoryOption = false, // REMOVED
  // onAddCategory, // REMOVED
}: BudgetSectionProps) {
  // Derive existing names from items if not provided
  const itemNames = existingNames || items.map(item => item.name);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const isEmpty = items.length === 0;
  const isIncome = type === 'income';
  const isAdding = addingState?.active ?? false;

  const toggleCategory = (categoryName: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  };

  // For expenses, group by category
  const groupedItems = isIncome ? null : groupByCategory(items);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !onReorder) return;
    if (result.source.index === result.destination.index) return;

    // For expenses with categories, extract category name from droppableId
    const categoryName = result.source.droppableId !== type ? result.source.droppableId : undefined;
    onReorder(result.source.index, result.destination.index, categoryName);
  };

  return (
    <div className="glass-card overflow-hidden">
      {/* Section Header - Clickable to collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/40 transition-colors border-l-4 border-[var(--color-primary)]"
      >
        <div className="flex items-center gap-1 min-w-0">
          {/* Chevron */}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate">{icon} {title}</h2>
            {type === 'expense' && <p className="text-[11px] text-gray-400">These are your targets</p>}
          </div>
        </div>
        <span className="text-base md:text-lg text-gray-500 font-semibold shrink-0">
          ₹{formatNumber(total)}<span className="md:hidden">/mo</span><span className="hidden md:inline"> / month</span>
        </span>
      </button>

      {/* Divider */}
      {!isCollapsed && <div className="h-px bg-gray-100" />}

      {/* Content - Hidden when collapsed */}
      {!isCollapsed && (
        <div>
          {isEmpty ? (
          // Empty State
          isAdding ? (
            // Show inline add when adding (no centering)
            <InlineAddItem
              type={type}
              suggestions={suggestions}
              getSuggestions={type === 'expense' ? getSuggestions : undefined}
              categories={type === 'expense' ? expenseCategories : undefined}
              existingNames={itemNames}
              onAdd={onConfirmAdd}
              onCancel={onCancelAdd}
            />
          ) : (
            <div className="px-4 py-8 text-center">
              <p className="text-gray-400 mb-4">
                {isIncome ? 'No income sources yet' : 'No expenses added'}
              </p>
              {isEditable && (
                <button
                  onClick={() => onStartAdd()}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-bg)] rounded-xl transition-colors"
                >
                  <span className="text-lg">+</span>
                  <span>Add {isIncome ? 'your first income' : 'expense'}</span>
                </button>
              )}
            </div>
          )
        ) : isIncome ? (
          // Income items (flat list with drag-drop)
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={type}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {items.map((item, index) => (
                    <BudgetItem
                      key={item.id}
                      item={item}
                      index={index}
                      onSave={onSave}
                      onDelete={() => onDelete(item)}
                      onRename={isEditable ? onRename : undefined}
                      isIncomplete={incompleteItemIds.has(item.id)}
                      isEditable={isEditable}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
            {/* Inline add or add button */}
            {isEditable && (
              isAdding && !addingState?.categoryId ? (
                <InlineAddItem
                  type="income"
                  suggestions={suggestions}
                  existingNames={itemNames}
                  onAdd={onConfirmAdd}
                  onCancel={onCancelAdd}
                />
              ) : (
                <button
                  onClick={() => onStartAdd()}
                  className="w-full px-4 py-3 flex items-center gap-2 text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-bg)] transition-colors border-t border-[rgba(124,58,237,0.06)]"
                >
                  <span className="text-lg">+</span>
                  <span>Add income</span>
                </button>
              )
            )}
          </DragDropContext>
        ) : (
          // Expense items (grouped by category with drag-drop per category)
          <DragDropContext onDragEnd={handleDragEnd}>
            {Object.entries(groupedItems!).map(([catName, group]) => {
              // Check if adding to this specific category
              const isAddingToThisCategory = isAdding && addingState?.categoryName === catName;
              // Get category ID from first item
              const catId = group.items[0]?.categoryId;

              const isCategoryCollapsed = collapsedCategories.has(catName);

              return (
                <div key={catName}>
                  {/* Category Header - clickable to collapse */}
                  <button
                    onClick={() => toggleCategory(catName)}
                    className="w-full px-4 py-2.5 bg-[var(--color-primary-bg)]/50 flex items-center gap-2 border-t border-[rgba(124,58,237,0.06)] hover:bg-[var(--color-primary-bg)] transition-colors"
                  >
                    {/* Chevron */}
                    <svg
                      className={`w-3 h-3 text-[var(--color-primary)]/60 transition-transform ${isCategoryCollapsed ? '' : 'rotate-90'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-lg">{group.icon}</span>
                    <span className="text-base font-semibold text-[var(--color-primary)] flex-1 text-left">{group.name}</span>
                    <span className="text-sm text-[var(--color-primary)] font-medium tabular-nums">
                      ₹{formatNumber(group.total)}
                    </span>
                  </button>
                  {/* Category Items - Hidden when collapsed */}
                  {!isCategoryCollapsed && (
                    <>
                      <Droppable droppableId={catName}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}>
                            {group.items.map((item, index) => (
                              <BudgetItem
                                key={item.id}
                                item={item}
                                index={index}
                                onSave={onSave}
                                onDelete={() => onDelete(item)}
                                onRename={isEditable ? onRename : undefined}
                                indented
                                isIncomplete={incompleteItemIds.has(item.id)}
                                isEditable={isEditable}
                              />
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                      {/* Inline add or add button within category */}
                      {isEditable && (
                        isAddingToThisCategory ? (
                          <InlineAddItem
                            type="expense"
                            categoryId={catId}
                            categoryName={catName}
                            suggestions={suggestions}
                            getSuggestions={getSuggestions}
                            existingNames={itemNames}
                            onAdd={onConfirmAdd}
                            onCancel={onCancelAdd}
                            indented
                          />
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartAdd(catId, catName);
                            }}
                            className="w-full pl-10 pr-4 py-2 flex items-center gap-2 text-gray-400 text-sm hover:text-[var(--color-primary)] hover:bg-white/40 transition-colors"
                          >
                            <span>+</span>
                            <span>Add item</span>
                          </button>
                        )
                      )}
                    </>
                  )}
                </div>
              );
            })}
            {/* Add expense button or inline add */}
            {isEditable && (
              isAdding && !addingState?.categoryId ? (
                <InlineAddItem
                  type="expense"
                  suggestions={suggestions}
                  getSuggestions={getSuggestions}
                  categories={expenseCategories}
                  existingNames={itemNames}
                  onAdd={onConfirmAdd}
                  onCancel={onCancelAdd}
                />
              ) : (
                <button
                  onClick={() => onStartAdd()}
                  className="w-full px-4 py-3 flex items-center gap-2 text-[var(--color-primary)] font-medium hover:bg-[var(--color-primary-bg)] transition-colors border-t border-[rgba(124,58,237,0.06)]"
                >
                  <span className="text-lg">+</span>
                  <span>Add expense</span>
                </button>
              )
            )}
          </DragDropContext>
        )}
        </div>
      )}
    </div>
  );
}
