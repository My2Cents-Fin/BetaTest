import { useRef } from 'react';

export type TabId = 'dashboard' | 'budget' | 'transactions';

interface Tab {
  id: TabId;
  icon: string;
  label: string;
}

const tabs: Tab[] = [
  { id: 'dashboard', icon: '🏠', label: 'Home' },
  { id: 'budget', icon: '💰', label: 'Budget' },
  { id: 'transactions', icon: '📋', label: 'Transactions' },
];

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onAddTransaction?: () => void;
  onFundTransfer?: () => void;
  onOpenSettings?: () => void;
  hasFrozenBudget?: boolean;
  hasOtherMembers?: boolean;
  className?: string;
}

export function BottomNav({ activeTab, onTabChange, onAddTransaction, onFundTransfer, onOpenSettings, hasFrozenBudget = false, hasOtherMembers = false, className = '' }: BottomNavProps) {
  const isDashboardLocked = !hasFrozenBudget;
  const isTransactionsLocked = !hasFrozenBudget;
  const isFabDisabled = !hasFrozenBudget;

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const isTouchEvent = useRef(false);

  const handleTouchStart = () => {
    if (isFabDisabled) return;

    isTouchEvent.current = true;
    isLongPress.current = false;

    // Only set up long press timer if there are other members
    if (hasOtherMembers) {
      longPressTimer.current = setTimeout(() => {
        isLongPress.current = true;
        // Trigger haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        if (onFundTransfer) {
          onFundTransfer();
        }
      }, 500); // 500ms for long press
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!isLongPress.current && !isFabDisabled && onAddTransaction) {
      // Prevent the onClick from also firing
      e.preventDefault();
      // Short press - regular transaction
      onAddTransaction();
    }

    // Reset after a short delay
    setTimeout(() => {
      isTouchEvent.current = false;
    }, 100);
  };

  const handleTouchCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isTouchEvent.current = false;
  };

  const handleClick = () => {
    // Only handle click if it wasn't a touch event
    if (!isTouchEvent.current && !isFabDisabled && onAddTransaction) {
      onAddTransaction();
    }
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-16 z-40 ${className}`}>
      {/* Center FAB - positioned absolutely to sit above nav */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClick={handleClick}
          disabled={isFabDisabled}
          className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition-colors border-4 border-white
            ${isFabDisabled
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-purple-600 active:bg-purple-700'}
          `}
          aria-label={hasOtherMembers ? "Add transaction (long press for fund transfer)" : "Add transaction"}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex h-full max-w-md mx-auto items-center px-4">
        {/* Home */}
        <button
          onClick={isDashboardLocked ? undefined : () => onTabChange('dashboard')}
          disabled={isDashboardLocked}
          className={`
            flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors h-full relative
            ${isDashboardLocked
              ? 'text-gray-300 cursor-not-allowed'
              : activeTab === 'dashboard'
                ? 'text-purple-600'
                : 'text-gray-400 active:text-gray-600'}
          `}
        >
          <span className="text-xl relative">
            {tabs[0].icon}
            {isDashboardLocked && (
              <span className="absolute -top-1 -right-1 text-xs">🔒</span>
            )}
          </span>
          <span className="text-xs font-medium">{tabs[0].label}</span>
        </button>

        {/* Budget */}
        <button
          onClick={() => onTabChange('budget')}
          className={`
            flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors h-full
            ${activeTab === 'budget'
              ? 'text-purple-600'
              : 'text-gray-400 active:text-gray-600'}
          `}
        >
          <span className="text-xl">{tabs[1].icon}</span>
          <span className="text-xs font-medium">{tabs[1].label}</span>
        </button>

        {/* Center spacer for FAB */}
        <div className="w-16" />

        {/* Transactions */}
        <button
          onClick={isTransactionsLocked ? undefined : () => onTabChange('transactions')}
          disabled={isTransactionsLocked}
          className={`
            flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors h-full relative
            ${isTransactionsLocked
              ? 'text-gray-300 cursor-not-allowed'
              : activeTab === 'transactions'
                ? 'text-purple-600'
                : 'text-gray-400 active:text-gray-600'}
          `}
        >
          <span className="text-xl relative">
            {tabs[2].icon}
            {isTransactionsLocked && (
              <span className="absolute -top-1 -right-1 text-xs">🔒</span>
            )}
          </span>
          <span className="text-xs font-medium">{tabs[2].label}</span>
        </button>

        {/* Settings/Profile */}
        <button
          onClick={onOpenSettings}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors h-full text-gray-400 active:text-gray-600"
        >
          <span className="text-xl">👤</span>
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}
