import { useState, useRef, useEffect } from 'react';
import type { Period } from '../types';
import { PERIOD_LABELS } from '../data/defaultCategories';

interface AmountInputProps {
  name: string;
  icon: string | null;
  amount: number;
  period: Period;
  onAmountChange: (amount: number) => void;
  onPeriodChange: (period: Period) => void;
  onNameChange?: (name: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

/**
 * Compact amount input with period dropdown
 * Supports inline name editing and removal
 */
export function AmountInput({
  name,
  icon,
  amount,
  period,
  onAmountChange,
  onPeriodChange,
  onNameChange,
  onRemove,
  disabled = false,
  autoFocus = false,
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(amount > 0 ? formatNumber(amount) : '');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Focus name input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  // Handle amount input
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    const numValue = parseInt(raw, 10) || 0;

    setDisplayValue(raw ? formatNumber(numValue) : '');
    onAmountChange(numValue);
  };

  // Handle focus - show raw number for editing
  const handleFocus = () => {
    if (amount > 0) {
      setDisplayValue(amount.toString());
    }
  };

  // Handle blur - format the number
  const handleBlur = () => {
    if (amount > 0) {
      setDisplayValue(formatNumber(amount));
    } else {
      setDisplayValue('');
    }
  };

  // Handle name edit
  const startEditingName = () => {
    if (onNameChange) {
      setEditedName(name);
      setIsEditingName(true);
    }
  };

  const saveNameEdit = () => {
    const trimmed = editedName.trim();
    if (trimmed && trimmed !== name && onNameChange) {
      onNameChange(trimmed);
    }
    setIsEditingName(false);
  };

  const cancelNameEdit = () => {
    setEditedName(name);
    setIsEditingName(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-3">
      {/* Icon */}
      <span className="text-lg flex-shrink-0" role="img" aria-hidden="true">
        {icon || '📋'}
      </span>

      {/* Name - editable or static */}
      {isEditingName ? (
        <input
          ref={nameInputRef}
          type="text"
          value={editedName}
          onChange={(e) => setEditedName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveNameEdit();
            if (e.key === 'Escape') cancelNameEdit();
          }}
          onBlur={saveNameEdit}
          className="flex-1 min-w-0 px-1.5 py-0.5 border border-purple-300 rounded text-sm text-gray-900 font-medium focus:outline-none focus:border-purple-800"
        />
      ) : (
        <button
          type="button"
          onClick={onNameChange ? startEditingName : undefined}
          className={`flex-1 min-w-0 text-left text-sm font-medium text-gray-900 truncate ${onNameChange ? 'hover:text-purple-700 cursor-pointer' : ''}`}
          title={onNameChange ? 'Click to rename' : name}
        >
          {name}
        </button>
      )}

      {/* Amount input */}
      <div className="relative flex-shrink-0 w-28">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
          ₹
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleAmountChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="0"
          disabled={disabled}
          className="
            w-full pl-6 pr-2 py-1.5
            border border-gray-200 rounded
            text-sm text-gray-900 font-medium text-right
            placeholder:text-gray-300
            focus:outline-none focus:border-purple-800 focus:ring-1 focus:ring-purple-100
            disabled:opacity-50 disabled:bg-gray-50
          "
        />
      </div>

      {/* Period dropdown */}
      <div className="relative flex-shrink-0">
        <select
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as Period)}
          disabled={disabled}
          className="
            appearance-none
            pl-2 pr-6 py-1.5
            border border-gray-200 rounded
            text-sm text-gray-700
            bg-white
            focus:outline-none focus:border-purple-800 focus:ring-1 focus:ring-purple-100
            disabled:opacity-50 disabled:bg-gray-50
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
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Remove button */}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
          title="Remove"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Format number with Indian comma separators (lakhs/crores)
 */
export function formatNumber(num: number): string {
  // Split into integer and decimal parts
  const parts = num.toString().split('.');
  const integerPart = parts[0];
  const decimalPart = parts.length > 1 ? parts[1] : '';

  const len = integerPart.length;

  if (len <= 3) {
    return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
  }

  let result = integerPart.slice(-3);
  let remaining = integerPart.slice(0, -3);

  while (remaining.length > 0) {
    const chunk = remaining.slice(-2);
    result = chunk + ',' + result;
    remaining = remaining.slice(0, -2);
  }

  return decimalPart ? `${result}.${decimalPart}` : result;
}

/**
 * Compact version for showing totals
 */
interface AmountDisplayProps {
  label: string;
  amount: number;
  period?: Period;
  className?: string;
}

export function AmountDisplay({ label, amount, period, className = '' }: AmountDisplayProps) {
  const periodSuffix = period === 'monthly' ? '/mo' : period ? ` (${PERIOD_LABELS[period]})` : '/mo';

  return (
    <div className={`flex justify-between items-center ${className}`}>
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="font-semibold text-gray-900">
        ₹{formatNumber(amount)}{periodSuffix}
      </span>
    </div>
  );
}
