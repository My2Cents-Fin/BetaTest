import { useState, useEffect } from 'react';
import { NavItem } from './NavItem';

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

interface SideNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onOpenMenu: () => void;
  onCollapsedChange?: (collapsed: boolean) => void;
  hasFrozenBudget?: boolean;
  className?: string;
}

const COLLAPSED_KEY = 'my2cents_sidebar_collapsed';

export function SideNav({ activeTab, onTabChange, onOpenMenu, onCollapsedChange, hasFrozenBudget = false, className = '' }: SideNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    // Default to collapsed (true) if no preference is stored
    return stored !== null ? stored === 'true' : true;
  });

  const isDashboardLocked = !hasFrozenBudget;
  const isTransactionsLocked = !hasFrozenBudget;

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
    onCollapsedChange?.(isCollapsed);
  }, [isCollapsed, onCollapsedChange]);

  // Notify parent on mount
  useEffect(() => {
    onCollapsedChange?.(isCollapsed);
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex-col z-40 transition-all duration-200 ${isCollapsed ? 'w-20' : 'w-64'} ${className}`}>
      {/* Logo + Toggle */}
      <div className={`border-b border-gray-200 flex items-center ${isCollapsed ? 'p-3 justify-center' : 'p-4 justify-between'}`}>
        {isCollapsed ? (
          <span className="text-xl font-bold text-purple-800">M2C</span>
        ) : (
          <span className="text-xl font-bold text-purple-800">My2Cents</span>
        )}
        <button
          onClick={toggleCollapsed}
          className={`p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ${isCollapsed ? 'hidden' : ''}`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Expand button when collapsed */}
      {isCollapsed && (
        <button
          onClick={toggleCollapsed}
          className="mx-auto mt-2 p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Nav Items */}
      <nav className={`flex-1 space-y-1 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {tabs.map(tab => {
          const isLocked = (tab.id === 'dashboard' && isDashboardLocked) || (tab.id === 'transactions' && isTransactionsLocked);
          return (
            <NavItem
              key={tab.id}
              icon={tab.icon}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={isLocked ? undefined : () => onTabChange(tab.id)}
              collapsed={isCollapsed}
              locked={isLocked}
            />
          );
        })}
      </nav>

      {/* Profile at bottom */}
      <div className={`border-t border-gray-200 ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {isCollapsed ? (
          <button
            onClick={onOpenMenu}
            className="w-full flex flex-col items-center justify-center py-2.5 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
            title="Profile"
          >
            <span className="text-xl">⚙️</span>
            <span className="text-[10px] font-medium mt-0.5">Profile</span>
          </button>
        ) : (
          <button
            onClick={onOpenMenu}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xl">⚙️</span>
            <span className="font-medium">Profile</span>
          </button>
        )}
      </div>
    </aside>
  );
}
