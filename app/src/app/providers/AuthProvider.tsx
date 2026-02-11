import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnboarded, setIsOnboarded] = useState(false);

  // Check onboarding status from database (not auth metadata)
  useEffect(() => {
    async function checkOnboardingStatus() {
      if (!user) {
        setIsOnboarded(false);
        return;
      }

      try {
        // Check database for user record and household membership
        const { data: dbUser } = await supabase
          .from('users')
          .select('id, display_name')
          .eq('id', user.id)
          .single();

        const { data: membership } = await supabase
          .from('household_members')
          .select('id')
          .eq('user_id', user.id)
          .single();

        const hasDisplayName = !!dbUser?.display_name;
        const hasHousehold = !!membership;
        const onboarded = hasDisplayName && hasHousehold;

        console.log('[AuthProvider] Onboarding check - hasDisplayName:', hasDisplayName, 'hasHousehold:', hasHousehold, 'onboarded:', onboarded);
        setIsOnboarded(onboarded);
      } catch (error) {
        console.error('[AuthProvider] Error checking onboarding:', error);
        setIsOnboarded(false);
      }
    }

    checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AuthProvider] Initial session:', session);
      console.log('[AuthProvider] User:', session?.user);
      console.log('[AuthProvider] User metadata:', session?.user?.user_metadata);
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[AuthProvider] Auth state changed. Event:', _event, 'Session:', session);
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  console.log('[AuthProvider] isAuthenticated:', isAuthenticated, 'isOnboarded:', isOnboarded);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated,
        isOnboarded,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
