import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from './AuthProvider';

// Re-export HouseholdInfo shape so consumers don't need to import from onboarding
export interface HouseholdInfo {
  id: string;
  name: string;
  inviteCode: string;
  role: 'owner' | 'member';
  memberCount: number;
}

export interface HouseholdUser {
  id: string;
  displayName: string;
}

interface HouseholdContextValue {
  household: HouseholdInfo | null;
  householdUsers: HouseholdUser[];
  /** userId → displayName map (avoids repeated users table queries in services) */
  userMap: Map<string, string>;
  currentUserId: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const HouseholdContext = createContext<HouseholdContextValue | undefined>(undefined);

interface HouseholdProviderProps {
  children: ReactNode;
}

export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const { user } = useAuth();
  const [household, setHousehold] = useState<HouseholdInfo | null>(null);
  const [householdUsers, setHouseholdUsers] = useState<HouseholdUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const currentUserId = user?.id ?? null;

  const loadHouseholdData = useCallback(async () => {
    if (!user) {
      setHousehold(null);
      setHouseholdUsers([]);
      setIsLoading(false);
      return;
    }

    try {
      // Batch 1: Get membership (need household_id for everything else)
      const { data: membership, error: mError } = await supabase
        .from('household_members')
        .select('household_id, role')
        .eq('user_id', user.id)
        .single();

      if (mError || !membership) {
        // User not in any household (e.g. during onboarding)
        setHousehold(null);
        setHouseholdUsers([]);
        setIsLoading(false);
        return;
      }

      // Batch 2: Everything that needs household_id — run in parallel
      const [householdResult, countResult, membersResult] = await Promise.all([
        supabase
          .from('households')
          .select('id, name, invite_code')
          .eq('id', membership.household_id)
          .single(),
        supabase
          .from('household_members')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', membership.household_id),
        supabase
          .from('household_members')
          .select('user_id')
          .eq('household_id', membership.household_id),
      ]);

      const { data: householdData, error: hError } = householdResult;
      if (hError || !householdData) {
        setHousehold(null);
        setHouseholdUsers([]);
        setIsLoading(false);
        return;
      }

      // Set household info
      setHousehold({
        id: householdData.id,
        name: householdData.name,
        inviteCode: householdData.invite_code,
        role: membership.role as 'owner' | 'member',
        memberCount: countResult.count || 1,
      });

      // Batch 3: Get user display names for all members
      const memberUserIds = (membersResult.data || []).map(m => m.user_id);
      if (memberUserIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, display_name')
          .in('id', memberUserIds);

        const users: HouseholdUser[] = (usersData || []).map(u => {
          let displayName = u.display_name || 'Unknown';
          // For the current user, prefer auth metadata (most up-to-date)
          if (u.id === user.id) {
            displayName = user.user_metadata?.display_name || displayName;
          }
          return { id: u.id, displayName };
        });
        setHouseholdUsers(users);
      } else {
        setHouseholdUsers([]);
      }
    } catch (error) {
      console.error('[HouseholdProvider] Error loading household:', error);
      setHousehold(null);
      setHouseholdUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadHouseholdData();
  }, [loadHouseholdData]);

  // Build userMap from householdUsers (memoized)
  const userMap = useMemo(() => {
    const map = new Map<string, string>();
    householdUsers.forEach(u => map.set(u.id, u.displayName));
    return map;
  }, [householdUsers]);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await loadHouseholdData();
  }, [loadHouseholdData]);

  return (
    <HouseholdContext.Provider
      value={{
        household,
        householdUsers,
        userMap,
        currentUserId,
        isLoading,
        refetch,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error('useHousehold must be used within a HouseholdProvider');
  }
  return context;
}
