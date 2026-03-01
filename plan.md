# Plan: Fix Stale Session / Cache Issue

## Problem
Users who previously opened the app can't login in normal browser tabs, but CAN in incognito. The Supabase auth session stored in localStorage is stale/broken and prevents proper auth flow.

## Root Cause Analysis
- Supabase stores sessions in localStorage (`sb-qybzttjbjxmqdhcstuif-auth-token`)
- `getSession()` reads this stale token and either:
  - **Successfully refreshes it** → user is "authenticated" but gets redirected to onboarding/dashboard instead of seeing the login page
  - **Hangs during refresh** → `isLoading` stays `true` → user sees an infinite loading spinner
  - **Fails to refresh** → should clear and work, but edge cases exist (e.g., corrupted token from OTP era)
- `PublicRoute` blocks access to `/login` when `isAuthenticated = true`

## Fix: Two Changes

### Change 1: URL-based escape hatch (`?logout`) — in `AuthProvider.tsx`
- Before `getSession()`, check if URL contains `?logout`
- If yes, call `supabase.auth.signOut()`, clear the param, and skip session recovery
- This gives users (and us as devs) an instant way to fix any broken state
- URL: `https://beta-test-five.vercel.app/login?logout`

### Change 2: Session validation with auto-signout — in `AuthProvider.tsx`
- After `getSession()` returns a session, validate it with `supabase.auth.getUser()` (server-side check)
- `getSession()` reads from cache/localStorage; `getUser()` hits the server and validates the token
- If `getUser()` fails (401/403 from server), the session is truly broken → auto sign out
- This catches corrupted/expired sessions that `getSession()` couldn't detect

### What we're NOT doing
- No service worker changes (there is no service worker)
- No changes to onboarding screens (they already have sign-out buttons)
- No timeout on loading state (the two fixes above cover the root causes)

## Files Changed
1. `app/src/app/providers/AuthProvider.tsx` — Both changes here

## Code Sketch

```typescript
useEffect(() => {
  // Escape hatch: ?logout forces sign out
  const params = new URLSearchParams(window.location.search);
  if (params.has('logout')) {
    supabase.auth.signOut().then(() => {
      // Remove ?logout from URL without reload
      params.delete('logout');
      const newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newUrl);
      setIsLoading(false);
    });
    return;
  }

  // Get initial session
  supabase.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
      // Validate session against server (getSession uses cache, getUser hits server)
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        // Session is stale/invalid — clean up
        console.warn('[AuthProvider] Stale session detected, signing out');
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }
      setSession(session);
      setUser(user);
    }
    setIsLoading(false);
  }).catch(() => {
    setIsLoading(false);
  });

  // Listen for auth changes (unchanged)
  const { data: { subscription } } = supabase.auth.onAuthStateChange(/* ... */);
  return () => subscription.unsubscribe();
}, []);
```
