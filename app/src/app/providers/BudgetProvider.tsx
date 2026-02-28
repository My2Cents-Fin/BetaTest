import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { useHousehold } from './HouseholdProvider';

interface BudgetContextValue {
  hasFrozenBudget: boolean;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

interface BudgetProviderProps {
  children: ReactNode;
}

export function BudgetProvider({ children }: BudgetProviderProps) {
  const { household, isLoading: householdLoading } = useHousehold();
  const [hasFrozenBudget, setHasFrozenBudget] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkBudgetStatus = useCallback(async () => {
    if (!household) {
      setHasFrozenBudget(false);
      setIsLoading(false);
      return;
    }

    try {
      // Check if there's a frozen budget for current month
      // Format as YYYY-MM-01 to match how budgets are stored
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01'; // YYYY-MM-01 format

      const { data: plan, error } = await supabase
        .from('monthly_plans')
        .select('id, status, plan_month')
        .eq('household_id', household.id)
        .eq('plan_month', currentMonth)
        .eq('status', 'frozen')
        .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 error

      console.log('[BudgetProvider] Frozen budget check:', {
        currentMonth,
        plan,
        error,
        hasFrozen: !!plan
      });
      setHasFrozenBudget(!!plan);
      setIsLoading(false);
    } catch (error) {
      console.error('[BudgetProvider] Error checking budget status:', error);
      setHasFrozenBudget(false);
      setIsLoading(false);
    }
  }, [household]);

  useEffect(() => {
    if (!householdLoading) {
      checkBudgetStatus();
    }
  }, [householdLoading, checkBudgetStatus]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await checkBudgetStatus();
  }, [checkBudgetStatus]);

  return (
    <BudgetContext.Provider
      value={{
        hasFrozenBudget,
        isLoading,
        refetch,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget() {
  const context = useContext(BudgetContext);
  if (context === undefined) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
