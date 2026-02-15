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
    <nav className={`fixed bottom-0 left-0 right-0 glass-nav h-16 z-40 ${className}`}>
      {/* Center FAB - positioned absolutely to sit above nav */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-6">
        <button
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          onClick={handleClick}
          disabled={isFabDisabled}
          className={`
            w-14 h-14 rounded-2xl shadow-[0_4px_16px_rgba(124,58,237,0.35)] flex items-center justify-center text-white transition-all border-4 border-white/80
            ${isFabDisabled
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-primary-gradient active:scale-95'}
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
            flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full relative rounded-xl
            ${isDashboardLocked
              ? 'text-gray-300 cursor-not-allowed'
              : activeTab === 'dashboard'
                ? 'text-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                : 'text-[var(--color-text-tertiary)] active:text-[var(--color-text-secondary)]'}
          `}
        >
          <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
          {isDashboardLocked && (
            <span className="absolute top-1.5 right-3 text-[10px]">🔒</span>
          )}
          <span className="text-[10px] font-medium">{tabs[0].label}</span>
        </button>

        {/* Budget */}
        <button
          onClick={() => onTabChange('budget')}
          className={`
            flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full rounded-xl
            ${activeTab === 'budget'
              ? 'text-[var(--color-primary)] bg-[var(--color-primary-bg)]'
              : 'text-[var(--color-text-tertiary)] active:text-[var(--color-text-secondary)]'}
          `}
        >
          <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2"/>
            <line x1="2" y1="7" x2="22" y2="7"/>
            <line x1="2" y1="11" x2="22" y2="11"/>
          </svg>
          <span className="text-[10px] font-medium">{tabs[1].label}</span>
        </button>

        {/* Center spacer for FAB */}
        <div className="w-16" />

        {/* Transactions */}
        <button
          onClick={isTransactionsLocked ? undefined : () => onTabChange('transactions')}
          disabled={isTransactionsLocked}
          className={`
            flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full relative rounded-xl
            ${isTransactionsLocked
              ? 'text-gray-300 cursor-not-allowed'
              : activeTab === 'transactions'
                ? 'text-[var(--color-primary)] bg-[var(--color-primary-bg)]'
                : 'text-[var(--color-text-tertiary)] active:text-[var(--color-text-secondary)]'}
          `}
        >
          <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/>
            <line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="4" cy="6" r="1" fill="currentColor"/>
            <circle cx="4" cy="12" r="1" fill="currentColor"/>
            <circle cx="4" cy="18" r="1" fill="currentColor"/>
          </svg>
          {isTransactionsLocked && (
            <span className="absolute top-1.5 right-3 text-[10px]">🔒</span>
          )}
          <span className="text-[10px] font-medium">{tabs[2].label}</span>
        </button>

        {/* Settings/Profile */}
        <button
          onClick={onOpenSettings}
          className="flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full text-[var(--color-text-tertiary)] active:text-[var(--color-text-secondary)] rounded-xl"
        >
          <svg className="w-[22px] h-[22px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="7" r="4"/>
            <path d="M5.5 21a8.38 8.38 0 0 1 13 0"/>
          </svg>
          <span className="text-[10px] font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );
}
