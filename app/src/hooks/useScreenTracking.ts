/**
 * Hook that tracks screen views on route changes.
 *
 * Usage: call `useScreenTracking()` once inside the router (anywhere
 * that has access to `useLocation`). It fires `screen.viewed` on every
 * pathname change and reports `time_spent_ms` for the previous screen.
 */

import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { track } from '../lib/analytics';

function deriveScreenName(pathname: string): string {
  // Strip leading slash, replace remaining slashes with dots
  // e.g. "/onboarding/name" -> "onboarding.name"
  const cleaned = pathname.replace(/^\//, '').replace(/\//g, '.');
  return cleaned || 'root';
}

export function useScreenTracking(): void {
  const location = useLocation();
  const prevRef = useRef<{ screen: string; ts: number } | null>(null);

  useEffect(() => {
    const currentScreen = deriveScreenName(location.pathname);
    const now = Date.now();

    // Report time spent on previous screen
    if (prevRef.current) {
      const elapsed = now - prevRef.current.ts;
      track('screen.left', {
        screen_name: prevRef.current.screen,
        time_spent_ms: elapsed,
      });
    }

    // Track new screen view
    track('screen.viewed', {
      screen_name: currentScreen,
      path: location.pathname,
    });

    prevRef.current = { screen: currentScreen, ts: now };
  }, [location.pathname]);
}
