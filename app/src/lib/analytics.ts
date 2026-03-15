/**
 * Lightweight client-side analytics for My2cents.
 *
 * Usage:
 *   import { track } from '../lib/analytics';
 *   track('txn.created', { type: 'expense', payment_method: 'upi' });
 *
 * Events are queued in memory and flushed in batches to the
 * `user_events` table via Supabase. Flushing happens:
 *   - Every 10 seconds
 *   - When the queue reaches 10 events
 *   - When the page becomes hidden (visibilitychange)
 *   - Via navigator.sendBeacon on page unload (best-effort)
 *
 * All operations are fire-and-forget. Analytics never throws,
 * never blocks UI, and silently drops events on failure.
 */

import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Session & platform
// ---------------------------------------------------------------------------

const sessionId = crypto.randomUUID();

function detectPlatform(): string {
  if (
    typeof window !== 'undefined' &&
    window.matchMedia('(display-mode: standalone)').matches
  ) {
    return 'pwa';
  }
  return 'browser';
}

const platform = detectPlatform();

// ---------------------------------------------------------------------------
// Auth context cache
// ---------------------------------------------------------------------------

let cachedUserId: string | null = null;
let cachedHouseholdId: string | null = null;
let authResolved = false;

async function resolveAuth(): Promise<void> {
  if (authResolved) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      cachedUserId = session.user.id;
      // household_id lives in household_members; grab it once
      const { data } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .single();
      cachedHouseholdId = data?.household_id ?? null;
      authResolved = true;
    }
  } catch {
    // Silently ignore — we will retry next flush
  }
}

// Re-resolve when auth state changes
supabase.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    cachedUserId = session.user.id;
    authResolved = false; // re-fetch household on next flush
  } else {
    cachedUserId = null;
    cachedHouseholdId = null;
    authResolved = false;
  }
});

// ---------------------------------------------------------------------------
// Event queue
// ---------------------------------------------------------------------------

interface QueuedEvent {
  event_name: string;
  event_category: string;
  properties: Record<string, unknown>;
  client_ts: string;
}

const queue: QueuedEvent[] = [];
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_THRESHOLD = 10;

function deriveCategory(eventName: string): string {
  const dot = eventName.indexOf('.');
  return dot > 0 ? eventName.slice(0, dot) : eventName;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Track an analytics event. Non-blocking, never throws.
 */
export function track(
  eventName: string,
  properties: Record<string, unknown> = {},
): void {
  try {
    queue.push({
      event_name: eventName,
      event_category: deriveCategory(eventName),
      properties,
      client_ts: new Date().toISOString(),
    });

    if (queue.length >= FLUSH_THRESHOLD) {
      void flush();
    }
  } catch {
    // Never throw from analytics
  }
}

// ---------------------------------------------------------------------------
// Flush logic
// ---------------------------------------------------------------------------

let flushInProgress = false;

async function flush(): Promise<void> {
  if (flushInProgress || queue.length === 0) return;
  flushInProgress = true;

  try {
    await resolveAuth();
    if (!cachedUserId) {
      // Can't write without a user_id (RLS will reject). Keep events queued.
      flushInProgress = false;
      return;
    }

    // Drain the queue
    const batch = queue.splice(0, queue.length);

    const rows = batch.map((e) => ({
      user_id: cachedUserId!,
      household_id: cachedHouseholdId,
      event_name: e.event_name,
      event_category: e.event_category,
      properties: e.properties,
      session_id: sessionId,
      client_ts: e.client_ts,
      platform,
    }));

    const { error } = await supabase.from('user_events').insert(rows);

    if (error) {
      // Put events back so they can be retried (or lost on next page load)
      queue.unshift(...batch);
      console.warn('[analytics] flush failed:', error.message);
    }
  } catch {
    // Silently swallow — analytics must never break the app
  } finally {
    flushInProgress = false;
  }
}

// ---------------------------------------------------------------------------
// Beacon fallback (page unload)
// ---------------------------------------------------------------------------

function beaconFlush(): void {
  if (queue.length === 0 || !cachedUserId) return;

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    if (!supabaseUrl || !supabaseKey) return;

    const batch = queue.splice(0, queue.length);
    const rows = batch.map((e) => ({
      user_id: cachedUserId!,
      household_id: cachedHouseholdId,
      event_name: e.event_name,
      event_category: e.event_category,
      properties: e.properties,
      session_id: sessionId,
      client_ts: e.client_ts,
      platform,
    }));

    const url = `${supabaseUrl}/rest/v1/user_events`;
    const blob = new Blob([JSON.stringify(rows)], { type: 'application/json' });

    // sendBeacon returns false if the UA couldn't queue the request
    const sent = navigator.sendBeacon(
      `${url}?apikey=${supabaseKey}`,
      blob,
    );

    if (!sent) {
      // Put events back (they'll be lost on page close, but at least we tried)
      queue.unshift(...batch);
    }
  } catch {
    // Best effort
  }
}

// ---------------------------------------------------------------------------
// Timers & listeners
// ---------------------------------------------------------------------------

// Periodic flush
setInterval(() => {
  void flush();
}, FLUSH_INTERVAL_MS);

// Flush when tab becomes hidden
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flush();
    }
  });
}

// Best-effort beacon on unload
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', beaconFlush);
}
