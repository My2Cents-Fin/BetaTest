/**
 * CategoryMultiSelect — Unified sub-category filter for Transactions tab.
 * Replaces the previous Type filter (Income/Expense/Transfer toggle buttons).
 * Previous implementation: see git commit 71d3c01, TransactionsTab.tsx lines 663-698.
 * To revert: restore filterTypes state and FilterContent type pills from that commit.
 */
import { useState, useRef, useEffect, useMemo } from 'react';

interface CategoryMultiSelectProps {
  label: string;
  subCategories: { id: string; name: string; icon: string; categoryName: string; categoryType: 'income' | 'expense' }[];
  selectedIds: Set<string>;
  includeTransfers: boolean;
  hasTransfers: boolean;
  onToggleSubCategory: (id: string) => void;
  onToggleTransfers: () => void;
  onToggleAllOfType: (type: 'income' | 'expense' | 'transfer') => void;
}

export function CategoryMultiSelect({
  label,
  subCategories,
  selectedIds,
  includeTransfers,
  hasTransfers,
  onToggleSubCategory,
  onToggleTransfers,
  onToggleAllOfType,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Refs for indeterminate checkbox state
  const incomeCheckRef = useRef<HTMLInputElement>(null);
  const expenseCheckRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear search when dropdown closes
  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  // Group sub-categories by categoryName, preserving order
  const grouped = useMemo(() => {
    const map = new Map<string, { categoryType: 'income' | 'expense'; items: typeof subCategories }>();
    subCategories.forEach(sc => {
      if (!map.has(sc.categoryName)) {
        map.set(sc.categoryName, { categoryType: sc.categoryType, items: [] });
      }
      map.get(sc.categoryName)!.items.push(sc);
    });
    return map;
  }, [subCategories]);

  // Compute income/expense shortcut states
  const incomeIds = useMemo(() => subCategories.filter(sc => sc.categoryType === 'income').map(sc => sc.id), [subCategories]);
  const expenseIds = useMemo(() => subCategories.filter(sc => sc.categoryType === 'expense').map(sc => sc.id), [subCategories]);

  const incomeSelectedCount = incomeIds.filter(id => selectedIds.has(id)).length;
  const expenseSelectedCount = expenseIds.filter(id => selectedIds.has(id)).length;

  const allIncomeSelected = incomeIds.length > 0 && incomeSelectedCount === incomeIds.length;
  const someIncomeSelected = incomeSelectedCount > 0 && !allIncomeSelected;

  const allExpenseSelected = expenseIds.length > 0 && expenseSelectedCount === expenseIds.length;
  const someExpenseSelected = expenseSelectedCount > 0 && !allExpenseSelected;

  // Filter grouped results by search term
  const filteredGrouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return grouped;
    const result = new Map<string, { categoryType: 'income' | 'expense'; items: typeof subCategories }>();
    grouped.forEach((val, key) => {
      const catMatch = key.toLowerCase().includes(q);
      const matchingItems = catMatch ? val.items : val.items.filter(sc => sc.name.toLowerCase().includes(q));
      if (matchingItems.length > 0) {
        result.set(key, { categoryType: val.categoryType, items: matchingItems });
      }
    });
    return result;
  }, [grouped, search]);

  // Show type shortcuts based on search
  const showIncomeShortcut = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return incomeIds.length > 0;
    return incomeIds.length > 0 && ('income'.includes(q) || 'all income'.includes(q));
  }, [search, incomeIds]);

  const showExpenseShortcut = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return expenseIds.length > 0;
    return expenseIds.length > 0 && ('expense'.includes(q) || 'all expenses'.includes(q) || 'expenses'.includes(q));
  }, [search, expenseIds]);

  const showTransferShortcut = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hasTransfers;
    return hasTransfers && ('transfer'.includes(q) || 'all transfers'.includes(q) || 'transfers'.includes(q));
  }, [search, hasTransfers]);

  // Show transfer entry in the grouped list based on search
  const showTransferEntry = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return hasTransfers;
    return hasTransfers && ('transfer'.includes(q) || 'fund transfer'.includes(q) || 'transfers'.includes(q));
  }, [search, hasTransfers]);

  const hasAnyShortcut = showIncomeShortcut || showExpenseShortcut || showTransferShortcut;

  // Set indeterminate state on shortcut checkboxes
  useEffect(() => {
    if (incomeCheckRef.current) {
      incomeCheckRef.current.indeterminate = someIncomeSelected;
    }
  }, [someIncomeSelected]);

  useEffect(() => {
    if (expenseCheckRef.current) {
      expenseCheckRef.current.indeterminate = someExpenseSelected;
    }
  }, [someExpenseSelected]);

  // Display text
  const totalSelected = selectedIds.size + (includeTransfers ? 1 : 0);
  const displayText = totalSelected === 0 ? 'All categories' : `${totalSelected} selected`;

  // No results check
  const hasNoResults = filteredGrouped.size === 0 && !showTransferEntry && !hasAnyShortcut;

  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5 block">
        {label}{totalSelected > 0 && <span className="text-[var(--color-primary)] ml-1">· {totalSelected} selected</span>}
      </label>
      <div className="relative" ref={ref}>
        {/* Search-select trigger — matches MemberMultiSelect button size exactly */}
        <div className="relative">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!open) setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search categories"
            className="w-full h-[34px] px-3 pr-7 text-xs leading-none border border-[rgba(124,58,237,0.15)] rounded-xl bg-white/75 hover:border-[var(--color-primary)]/50 focus:outline-none focus:border-[var(--color-primary)] text-gray-700 placeholder-gray-700"
            style={{ fontSize: '12px' }}
          />
          <svg
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {open && (
          <div
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-[rgba(124,58,237,0.1)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Scrollable content */}
            <div className="max-h-56 overflow-y-auto">
              {/* Type shortcuts — vertical list, no color dots */}
              {hasAnyShortcut && (
                <div className="px-3 pt-2.5 pb-1">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Quick Select</p>

                  {showIncomeShortcut && (
                    <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg">
                      <input
                        ref={incomeCheckRef}
                        type="checkbox"
                        checked={allIncomeSelected}
                        onChange={() => onToggleAllOfType('income')}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-xs font-medium text-gray-700">All Income</span>
                    </label>
                  )}

                  {showExpenseShortcut && (
                    <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg">
                      <input
                        ref={expenseCheckRef}
                        type="checkbox"
                        checked={allExpenseSelected}
                        onChange={() => onToggleAllOfType('expense')}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-xs font-medium text-gray-700">All Expenses</span>
                    </label>
                  )}

                  {showTransferShortcut && (
                    <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer rounded-lg">
                      <input
                        type="checkbox"
                        checked={includeTransfers}
                        onChange={() => onToggleTransfers()}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-xs font-medium text-gray-700">All Transfers</span>
                    </label>
                  )}
                </div>
              )}

              {/* Grouped sub-categories (filtered by search) */}
              {Array.from(filteredGrouped.entries()).map(([categoryName, { items }]) => (
                <div key={categoryName}>
                  <div className="sticky top-0 bg-white px-3 pt-2.5 pb-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{categoryName}</p>
                  </div>
                  {items.map(sc => (
                    <label
                      key={sc.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(sc.id)}
                        onChange={() => onToggleSubCategory(sc.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-sm">{sc.icon}</span>
                      <span className="text-xs text-gray-700">{sc.name}</span>
                    </label>
                  ))}
                </div>
              ))}

              {/* Fund Transfer entry */}
              {showTransferEntry && (
                <div>
                  <div className="sticky top-0 bg-white px-3 pt-2.5 pb-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Transfers</p>
                  </div>
                  <label className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTransfers}
                      onChange={() => onToggleTransfers()}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm">💸</span>
                    <span className="text-xs text-gray-700">Fund Transfer</span>
                  </label>
                </div>
              )}

              {/* No results */}
              {hasNoResults && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-gray-400">No categories match "{search}"</p>
                </div>
              )}

              {/* Bottom padding */}
              <div className="h-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
