import { useState, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BottomNav, SideNav, type TabId } from '../modules/navigation';
import { DashboardTab } from '../modules/dashboard/components/DashboardTab';
import { BudgetTab } from '../modules/budget/components/BudgetTab';
import { TransactionsTab } from '../modules/transactions/components/TransactionsTab';
import { ProfilePanel } from '../shared/components/ProfilePanel';
import { useBudget } from './providers/BudgetProvider';

const COLLAPSED_KEY = 'my2cents_sidebar_collapsed';

export function AppLayout() {
  const { hasFrozenBudget } = useBudget();
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for tab query parameter on mount
  const initialTab = (searchParams.get('tab') as TabId) || 'dashboard';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Clear query param after reading it
  useEffect(() => {
    if (searchParams.has('tab')) {
      setSearchParams({}, { replace: true });
    }
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem(COLLAPSED_KEY);
    return stored === 'true';
  });

  // Quick add trigger - increments to signal tabs to open quick add
  const [quickAddTrigger, setQuickAddTrigger] = useState(0);
  // Fund transfer trigger - increments to signal tabs to open fund transfer
  const [fundTransferTrigger, setFundTransferTrigger] = useState(0);
  // Track if household has other members
  const [hasOtherMembers, setHasOtherMembers] = useState(false);
  // Drill-down: initial sub-category filter when navigating from Dashboard → Transactions
  const [drillDownSubCategoryId, setDrillDownSubCategoryId] = useState<string | null>(null);
  // Drill-down: show only uncategorized transactions
  const [drillDownUncategorized, setDrillDownUncategorized] = useState(false);

  // Dashboard drill-down: navigate to Transactions tab with a pre-applied sub-category filter
  const handleCategoryDrillDown = useCallback((subCategoryId: string) => {
    setDrillDownSubCategoryId(subCategoryId);
    setActiveTab('transactions');
  }, []);

  // Dashboard drill-down: navigate to Transactions tab filtered to uncategorized only
  const handleUncategorizedDrillDown = useCallback(() => {
    setDrillDownUncategorized(true);
    setActiveTab('transactions');
  }, []);

  // Called by TransactionsTab after it consumes the drill-down filter
  const handleDrillDownConsumed = useCallback(() => {
    setDrillDownSubCategoryId(null);
    setDrillDownUncategorized(false);
  }, []);

  const handleAddTransaction = useCallback(() => {
    setQuickAddTrigger(prev => prev + 1);
  }, []);

  const handleFundTransfer = useCallback(() => {
    setFundTransferTrigger(prev => prev + 1);
  }, []);

  // Reset fund transfer trigger after it's been consumed
  const handleFundTransferConsumed = useCallback(() => {
    setFundTransferTrigger(0);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-page-bg)]">
      {/* Web: Sidebar */}
      <SideNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenMenu={() => setIsMenuOpen(true)}
        onCollapsedChange={setSidebarCollapsed}
        hasFrozenBudget={hasFrozenBudget}
        className="hidden md:flex"
      />

      {/* Content Area - dynamic margin based on sidebar state */}
      <div className={`pb-20 md:pb-0 min-h-screen transition-all duration-200 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {activeTab === 'dashboard' && (
          <DashboardTab
            onOpenMenu={() => setIsMenuOpen(true)}
            quickAddTrigger={quickAddTrigger}
            fundTransferTrigger={fundTransferTrigger}
            onFundTransferConsumed={handleFundTransferConsumed}
            onHasOtherMembersChange={setHasOtherMembers}
            onCategoryDrillDown={handleCategoryDrillDown}
            onUncategorizedDrillDown={handleUncategorizedDrillDown}
            onNavigateToBudget={() => setActiveTab('budget')}
          />
        )}
        {activeTab === 'budget' && (
          <BudgetTab
            onOpenMenu={() => setIsMenuOpen(true)}
            sidebarCollapsed={sidebarCollapsed}
            quickAddTrigger={quickAddTrigger}
            fundTransferTrigger={fundTransferTrigger}
            onFundTransferConsumed={handleFundTransferConsumed}
            onHasOtherMembersChange={setHasOtherMembers}
          />
        )}
        {activeTab === 'transactions' && (
          <TransactionsTab
            quickAddTrigger={quickAddTrigger}
            fundTransferTrigger={fundTransferTrigger}
            onFundTransferConsumed={handleFundTransferConsumed}
            onHasOtherMembersChange={setHasOtherMembers}
            drillDownSubCategoryId={drillDownSubCategoryId}
            drillDownUncategorized={drillDownUncategorized}
            onDrillDownConsumed={handleDrillDownConsumed}
          />
        )}
      </div>

      {/* Mobile: Bottom Nav */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddTransaction={handleAddTransaction}
        onFundTransfer={handleFundTransfer}
        onOpenSettings={() => setIsMenuOpen(true)}
        hasFrozenBudget={hasFrozenBudget}
        hasOtherMembers={hasOtherMembers}
        className="md:hidden"
      />

      {/* Profile Panel (shared across all tabs) */}
      <ProfilePanel isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
    </div>
  );
}
