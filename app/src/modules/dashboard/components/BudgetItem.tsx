import { useState, useRef, useEffect, useCallback } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { formatNumber } from '../../budget/components/AmountInput';
import { PERIOD_LABELS } from '../../budget/data/defaultCategories';
import type { Period } from '../../budget/types';

// Swipe threshold in pixels
const SWIPE_THRESHOLD = 80;

interface BudgetItemData {
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

interface BudgetItemProps {
  item: BudgetItemData;
  index: number;
  onSave: (id: string, amount: number, period: Period) => void;
  onDelete: () => void;
  onRename?: (id: string, newName: string) => void;
  indented?: boolean;
  isDragDisabled?: boolean;
  isIncomplete?: boolean;
  isEditable?: boolean;
}

export function BudgetItem({ item, index, onSave, onDelete, onRename, indented = false, isDragDisabled = false, isIncomplete = false, isEditable = true }: BudgetItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editAmount, setEditAmount] = useState(item.amount);
  const [editPeriod, setEditPeriod] = useState<Period>(item.period);
  const [editName, setEditName] = useState(item.name);
  const [displayValue, setDisplayValue] = useState(item.amount > 0 ? formatNumber(item.amount) : '');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Swipe-to-delete state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const swipeContainerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isEditable || isEditing || isEditingName) return;
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  }, [isEditable, isEditing, isEditingName]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = touchStartX.current - currentX;
    // Only allow swiping left (positive diff), max 120px
    const offset = Math.max(0, Math.min(diff, 120));
    setSwipeOffset(offset);
  }, [isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (swipeOffset >= SWIPE_THRESHOLD) {
      // Swiped enough - delete
      onDelete();
    }
    // Reset swipe
    setSwipeOffset(0);
  }, [isSwiping, swipeOffset, onDelete]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Focus name input when editing name
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Sync with prop changes
  useEffect(() => {
    setEditAmount(item.amount);
    setEditPeriod(item.period);
    setEditName(item.name);
    setDisplayValue(item.amount > 0 ? formatNumber(item.amount) : '');
  }, [item.amount, item.period, item.name]);

  const handleClick = () => {
    if (!isEditing && !isEditingName) {
      setIsEditing(true);
      setDisplayValue(item.amount > 0 ? item.amount.toString() : '');
    }
  };

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRename) {
      setIsEditingName(true);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(raw, 10) || 0;
    setEditAmount(numValue);
    setDisplayValue(raw);
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditPeriod(e.target.value as Period);
  };

  const handleSave = () => {
    if (editAmount !== item.amount || editPeriod !== item.period) {
      onSave(item.id, editAmount, editPeriod);
    }
    setIsEditing(false);
    setDisplayValue(editAmount > 0 ? formatNumber(editAmount) : '');
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Check if focus is moving to another element within the edit container
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (editContainerRef.current?.contains(relatedTarget)) {
      // Focus is staying within the edit row, don't save yet
      return;
    }
    // Focus is leaving the edit row, save
    handleSave();
  };

  const handleNameSave = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== item.name && onRename) {
      onRename(item.id, trimmed);
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditAmount(item.amount);
      setEditPeriod(item.period);
      setDisplayValue(item.amount > 0 ? formatNumber(item.amount) : '');
      setIsEditing(false);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(item.name);
      setIsEditingName(false);
    }
  };

  return (
    <Draggable draggableId={item.id} index={index} isDragDisabled={isDragDisabled || isEditing || isEditingName || !isEditable}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={snapshot.isDragging ? 'shadow-lg rounded-lg bg-white' : ''}
        >
          {isEditing ? (
            // Edit mode UI
            <div
              ref={editContainerRef}
              className={`
                px-4 py-3 flex items-center gap-3 bg-[var(--color-primary-bg)] border-l-4 border-[var(--color-primary)]
                ${indented ? 'pl-10' : ''}
              `}
            >
              {/* Drag handle (disabled in edit mode) */}
              <span className="text-gray-300 shrink-0 cursor-not-allowed">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                </svg>
              </span>

              {/* Icon */}
              <span className="text-lg shrink-0">{item.icon}</span>

              {/* Name */}
              <span className="flex-1 text-gray-900 font-medium truncate">{item.name}</span>

              {/* Amount input */}
              <div className="relative shrink-0 w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  value={displayValue}
                  onChange={handleAmountChange}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="0"
                  className="
                    w-full pl-6 pr-2 py-1.5
                    border border-[var(--color-primary)]/30 rounded-xl
                    text-sm text-gray-900 font-medium text-right
                    placeholder:text-gray-300
                    focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.1)]
                  "
                />
              </div>

              {/* Period dropdown */}
              <div className="relative shrink-0">
                <select
                  value={editPeriod}
                  onChange={handlePeriodChange}
                  onBlur={handleBlur}
                  className="
                    appearance-none
                    pl-2 pr-7 py-1.5
                    border border-[var(--color-primary)]/30 rounded-xl
                    text-sm text-gray-700
                    bg-white
                    focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[rgba(124,58,237,0.1)]
                    cursor-pointer
                  "
                >
                  {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <svg
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          ) : (
            // Display mode UI with swipe-to-delete
            <div className="relative overflow-hidden">
              {/* Delete background (revealed on swipe) */}
              {isEditable && (
                <div className="absolute inset-y-0 right-0 w-24 bg-red-500 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              )}
              {/* Swipeable content */}
              <div
                ref={swipeContainerRef}
                className={`
                  relative bg-white group px-4 py-3 flex items-center gap-3 transition-colors
                  ${indented ? 'pl-10' : ''}
                  ${isIncomplete ? 'bg-orange-50 border-l-4 border-orange-400' : ''}
                  ${isEditable ? 'hover:bg-gray-50 cursor-pointer' : ''}
                  ${!isSwiping ? 'transition-transform duration-200' : ''}
                `}
                style={{ transform: `translateX(-${swipeOffset}px)` }}
                onClick={isEditable && swipeOffset === 0 ? handleClick : undefined}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
              {/* Drag handle (only when editable) */}
              {isEditable ? (
                <span
                  {...provided.dragHandleProps}
                  className="text-gray-300 hover:text-gray-500 shrink-0 cursor-grab active:cursor-grabbing"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                  </svg>
                </span>
              ) : (
                <span className="w-4 shrink-0" /> // Spacer when not editable
              )}

              {/* Icon */}
              <span className={`shrink-0 ${indented ? 'text-base' : 'text-lg'}`}>{item.icon}</span>

              {/* Name - clickable for rename */}
              {isEditingName ? (
                <input
                  ref={nameInputRef}
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={handleNameSave}
                  onKeyDown={handleNameKeyDown}
                  onClick={(e) => e.stopPropagation()}
                  className={`flex-1 min-w-0 px-2 py-1 border border-[var(--color-primary)]/30 rounded-lg text-gray-900 font-medium focus:outline-none focus:border-[var(--color-primary)] ${indented ? 'text-sm' : ''}`}
                />
              ) : (
                <span
                  onClick={handleNameClick}
                  className={`flex-1 text-gray-900 truncate ${indented ? 'text-sm' : 'font-medium'} ${onRename ? 'hover:text-[var(--color-primary)] cursor-text' : ''}`}
                  title={onRename ? 'Click to rename' : item.name}
                >
                  {item.name}
                </span>
              )}

              {/* Amount display - primary monthly, secondary periodic */}
              <div className="text-right shrink-0">
                {item.monthlyAmount === 0 ? (
                  <span className={`tabular-nums text-gray-400 ${indented ? 'text-sm' : ''}`}>
                    Tap to add
                  </span>
                ) : (
                  <>
                    {/* Primary: Monthly amount */}
                    <div className={`tabular-nums text-gray-900 ${indented ? 'text-sm' : 'font-medium'}`}>
                      ₹{formatNumber(item.monthlyAmount)}
                    </div>
                    {/* Secondary: Periodic amount (only if not monthly) */}
                    {item.period !== 'monthly' && (
                      <div className="text-xs text-gray-400 tabular-nums">
                        ₹{formatNumber(item.amount)}/{item.period === 'quarterly' ? 'qtr' : item.period === 'yearly' ? 'yr' : '1x'}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Delete button - visible on desktop, hidden on mobile (swipe works there) */}
              {isEditable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  className="hidden sm:block p-1.5 text-gray-300 hover:text-red-500 transition-all shrink-0"
                  aria-label="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
              </div>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
