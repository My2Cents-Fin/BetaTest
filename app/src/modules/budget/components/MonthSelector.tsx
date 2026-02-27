import { useState, useRef, useEffect, useCallback } from 'react';

interface MonthOption {
  value: string; // Format: YYYY-MM
  label: string; // Format: "Feb 2026"
  isCurrent: boolean;
}

interface MonthSelectorProps {
  selectedMonth: string; // Format: YYYY-MM
  onMonthChange: (month: string) => void;
  /** Optional: list of months to show in the dropdown. If omitted, only arrows/swipe work. */
  availableMonths?: MonthOption[];
  /** Whether to show the dropdown on tap (default: true) */
  showDropdown?: boolean;
  /** Minimum swipe distance in px to trigger navigation (default: 50) */
  swipeThreshold?: number;
}

/**
 * Month navigation component with < > arrows and swipe gesture support.
 * Allows continuous navigation to any month (prev/next) regardless of plan existence.
 */
export function MonthSelector({
  selectedMonth,
  onMonthChange,
  availableMonths,
  showDropdown = true,
  swipeThreshold = 50,
}: MonthSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

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

  // Navigate to adjacent month by offset (-1 = prev, +1 = next)
  const navigateMonth = useCallback((offset: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + offset, 1);
    const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    onMonthChange(newMonth);
  }, [selectedMonth, onMonthChange]);

  const goToPrevious = () => navigateMonth(-1);
  const goToNext = () => navigateMonth(1);

  // Swipe gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    // Only trigger if horizontal swipe is dominant (not scrolling)
    if (Math.abs(deltaX) > swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY) * 1.5) {
      if (deltaX < 0) {
        // Swipe left → go to next month
        goToNext();
      } else {
        // Swipe right → go to previous month
        goToPrevious();
      }
    }

    touchStartX.current = null;
    touchStartY.current = null;
  }, [swipeThreshold, goToNext, goToPrevious]);

  // Format the current month label
  const currentLabel = formatMonthLabel(selectedMonth);

  return (
    <div
      className="flex items-center gap-1"
      ref={dropdownRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Previous Arrow */}
      <button
        onClick={goToPrevious}
        className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-white/60 hover:text-gray-700"
        aria-label="Previous month"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Month Label / Dropdown */}
      <div className="relative">
        <button
          onClick={() => showDropdown && availableMonths && availableMonths.length > 0 && setIsOpen(!isOpen)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors text-sm font-medium text-gray-700 ${
            showDropdown && availableMonths && availableMonths.length > 0
              ? 'bg-white/60 hover:bg-white/80 cursor-pointer'
              : 'cursor-default'
          }`}
        >
          <span>{currentLabel}</span>
          {showDropdown && availableMonths && availableMonths.length > 0 && (
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && availableMonths && availableMonths.length > 0 && (
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
          </div>
        )}
      </div>

      {/* Next Arrow */}
      <button
        onClick={goToNext}
        className="p-1.5 rounded-md transition-colors text-gray-500 hover:bg-white/60 hover:text-gray-700"
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
 * Format YYYY-MM to human-readable label like "Feb 2026"
 */
function formatMonthLabel(month: string): string {
  const date = new Date(month + '-01');
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
