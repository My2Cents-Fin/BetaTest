import { useState, useRef, useEffect } from 'react';

interface MonthOption {
  value: string; // Format: YYYY-MM
  label: string; // Format: "Feb 2026"
  isCurrent: boolean;
}

interface MonthSelectorProps {
  selectedMonth: string; // Format: YYYY-MM
  availableMonths: MonthOption[];
  onMonthChange: (month: string) => void;
  onCreateBudget?: () => void;
}

export function MonthSelector({
  selectedMonth,
  availableMonths,
  onMonthChange,
  onCreateBudget,
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Find current selection
  const currentOption = availableMonths.find(m => m.value === selectedMonth);
  const currentIndex = availableMonths.findIndex(m => m.value === selectedMonth);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to previous month
  const goToPrevious = () => {
    if (currentIndex < availableMonths.length - 1) {
      onMonthChange(availableMonths[currentIndex + 1].value);
    }
  };

  // Navigate to next month
  const goToNext = () => {
    if (currentIndex > 0) {
      onMonthChange(availableMonths[currentIndex - 1].value);
    }
  };

  const hasPrevious = currentIndex < availableMonths.length - 1;
  const hasNext = currentIndex > 0;

  return (
    <div className="flex items-center gap-1" ref={dropdownRef}>
      {/* Previous Arrow */}
      <button
        onClick={goToPrevious}
        disabled={!hasPrevious}
        className={`p-1.5 rounded-md transition-colors ${
          hasPrevious
            ? 'text-gray-500 hover:bg-white/60 hover:text-gray-700'
            : 'text-gray-200 cursor-not-allowed'
        }`}
        aria-label="Previous month"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Month Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/60 hover:bg-white/80 rounded-xl transition-colors text-sm font-medium text-gray-700"
        >
          <span>{currentOption?.label || 'Select'}</span>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-36 bg-white/90 backdrop-blur-xl border border-[rgba(124,58,237,0.1)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] z-50 py-1 max-h-56 overflow-y-auto">
            {availableMonths.map((month) => (
              <button
                key={month.value}
                onClick={() => {
                  onMonthChange(month.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-sm transition-colors flex items-center justify-between ${
                  month.value === selectedMonth
                    ? 'bg-[var(--color-primary-bg)] text-[var(--color-primary)] font-medium'
                    : 'text-gray-600 hover:bg-white/60'
                }`}
              >
                <span>{month.label}</span>
                {month.value === selectedMonth && (
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
                {month.isCurrent && month.value !== selectedMonth && (
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">now</span>
                )}
              </button>
            ))}

            {/* Create Budget Option */}
            {onCreateBudget && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => {
                    onCreateBudget();
                    setIsOpen(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm text-[var(--color-primary)] hover:bg-[var(--color-primary-bg)] transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>New Budget</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Next Arrow */}
      <button
        onClick={goToNext}
        disabled={!hasNext}
        className={`p-1.5 rounded-md transition-colors ${
          hasNext
            ? 'text-gray-500 hover:bg-white/60 hover:text-gray-700'
            : 'text-gray-200 cursor-not-allowed'
        }`}
        aria-label="Next month"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Helper to format a date string to month option
 */
export function formatMonthOption(dateStr: string, currentMonth: string): MonthOption {
  const date = new Date(dateStr + '-01');
  const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  return {
    value: dateStr,
    label,
    isCurrent: dateStr === currentMonth,
  };
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
