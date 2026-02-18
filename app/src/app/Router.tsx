import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './providers/AuthProvider';
import { getUserHousehold } from '../modules/onboarding/services/onboarding';

// Auth screens
import { PhoneEntryScreen } from '../modules/auth/components/PhoneEntryScreen';
import { SetPinScreen } from '../modules/auth/components/SetPinScreen';
import { EnterPinScreen } from '../modules/auth/components/EnterPinScreen';
import { SuccessScreen } from '../modules/auth/components/SuccessScreen';

// Onboarding screens
import { YourNameScreen } from '../modules/onboarding/components/YourNameScreen';
import { HouseholdScreen } from '../modules/onboarding/components/HouseholdScreen';

// Main App Layout (with tab navigation)
import { AppLayout } from './AppLayout';

// Loading screen
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[var(--color-page-bg)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Smart onboarding redirect - checks where user left off
function OnboardingRedirect() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function checkProgress() {
      if (isLoading || !user) return;

      try {
        // 1. Check if user has display name
        const displayName = user.user_metadata?.display_name;
        if (!displayName) {
          navigate('/onboarding/name', { replace: true });
          return;
        }

        // 2. Check if user has household
        const household = await getUserHousehold();
        if (!household) {
          navigate('/onboarding/household', { replace: true });
          return;
        }

        // User has name and household - go to dashboard
        // Budget setup now happens in the dashboard
        navigate('/dashboard', { replace: true });

      } catch (e) {
        console.error('Error in onboarding redirect:', e);
        // Fallback to name screen if everything fails
        navigate('/onboarding/name', { replace: true });
      }
    }

    checkProgress();
  }, [user, isLoading, navigate]);

  return <LoadingScreen />;
}

// Onboarding guard - requires auth but not completed onboarding
function RequireOnboarding({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Full access guard - requires auth and completed onboarding
function RequireOnboarded({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isOnboarded) {
    // Use smart redirect to find where user left off
    return <OnboardingRedirect />;
  }

  return <>{children}</>;
}

// Public route - redirect to dashboard if already authenticated
function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isOnboarded, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    if (isOnboarded) {
      return <Navigate to="/dashboard" replace />;
    }
    // Use smart redirect to find where user left off
    return <OnboardingRedirect />;
  }

  return <>{children}</>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <PhoneEntryScreen />
            </PublicRoute>
          }
        />
        <Route
          path="/set-pin"
          element={
            <PublicRoute>
              <SetPinScreen />
            </PublicRoute>
          }
        />
        <Route
          path="/enter-pin"
          element={
            <PublicRoute>
              <EnterPinScreen />
            </PublicRoute>
          }
        />
        <Route path="/success" element={<SuccessScreen />} />

        {/* Onboarding routes */}
        <Route
          path="/onboarding/name"
          element={
            <RequireOnboarding>
              <YourNameScreen />
            </RequireOnboarding>
          }
        />
        <Route
          path="/onboarding/household"
          element={
            <RequireOnboarding>
              <HouseholdScreen />
            </RequireOnboarding>
          }
        />
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <RequireOnboarded>
              <AppLayout />
            </RequireOnboarded>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
