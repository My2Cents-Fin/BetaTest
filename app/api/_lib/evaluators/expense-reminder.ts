import type { UserExpenseContext } from './expense-context.js';
import type { EvaluatorResult } from './types.js';
import { getTrackAMessage, getTrackBMessage } from '../messages/expense-reminder.js';
import type { TrackBCandidate } from '../messages/expense-reminder.js';

/**
 * Expense Logging Reminder evaluator.
 *
 * Track A: General logging nudge — varies by:
 *   - Regular weekday rotation (if user logged recently)
 *   - Consecutive days without logging (escalating helpfulness)
 *   - Milestone catch-ups (weekends, month-start/mid/end — only if backlog exists)
 *
 * Track B: User HAS transactions today but specific sub-categories are overdue.
 *          Fires contextual sub-category nudges.
 *
 * Priority: Track A fires if user hasn't logged today.
 *           Track B fires only if user HAS logged today (specific sub-cat nudges).
 */
export function evaluateExpenseReminder(ctx: UserExpenseContext): EvaluatorResult | null {
  // ─── Track A: No transactions today (or logged recently — still nudge) ──
  // Track A now fires for ALL users (even those who logged today get regular rotation).
  // The message system internally decides: backlog → catch-up, no backlog → light nudge.
  if (ctx.consecutiveDaysWithoutTxn >= 1) {
    const message = getTrackAMessage({
      slot: ctx.slot,
      consecutiveDaysWithoutTxn: ctx.consecutiveDaysWithoutTxn,
      dayOfWeek: ctx.dayOfWeek,
      dayOfMonth: ctx.dayOfMonth,
    });

    return {
      message,
      notificationType: 'expense_reminder',
      subtype: `track_a:day_${ctx.consecutiveDaysWithoutTxn}:${ctx.slot}`,
      messageData: {
        track: 'a',
        consecutiveDays: ctx.consecutiveDaysWithoutTxn,
        dayOfWeek: ctx.dayOfWeek,
        dayOfMonth: ctx.dayOfMonth,
      },
    };
  }

  // User has logged today (consecutiveDaysWithoutTxn === 0)
  // Send regular daily nudge (encouraging them to keep logging through the day)
  const message = getTrackAMessage({
    slot: ctx.slot,
    consecutiveDaysWithoutTxn: 0,
    dayOfWeek: ctx.dayOfWeek,
    dayOfMonth: ctx.dayOfMonth,
  });

  // For afternoon/night slots when user already logged today, still send the regular nudge
  // But first check Track B — if there's an overdue sub-category, that's more relevant
  const candidates: Array<TrackBCandidate & { message: NonNullable<ReturnType<typeof getTrackBMessage>> }> = [];

  for (const activity of ctx.subCategoryActivities) {
    const candidate: TrackBCandidate = {
      subCategoryId: activity.subCategoryId,
      subCategoryName: activity.subCategoryName,
      daysSinceLastTxn: activity.daysSinceLastTxn,
      notLoggedThisMonth: activity.notLoggedThisMonth,
      dayOfMonth: ctx.dayOfMonth,
    };

    const msg = getTrackBMessage(candidate);
    if (msg) {
      candidates.push({ ...candidate, message: msg });
    }
  }

  // If Track B has a candidate, prefer it over generic daily nudge
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.daysSinceLastTxn - a.daysSinceLastTxn);
    const best = candidates[0];

    return {
      message: best.message,
      notificationType: 'expense_reminder',
      subtype: `track_b:${best.subCategoryName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}:${ctx.slot}`,
      messageData: {
        track: 'b',
        subCategoryId: best.subCategoryId,
        subCategoryName: best.subCategoryName,
        daysSinceLastTxn: best.daysSinceLastTxn,
      },
    };
  }

  // No Track B candidate — send regular daily nudge
  return {
    message,
    notificationType: 'expense_reminder',
    subtype: `track_a:day_0:${ctx.slot}`,
    messageData: {
      track: 'a',
      consecutiveDays: 0,
      dayOfWeek: ctx.dayOfWeek,
      dayOfMonth: ctx.dayOfMonth,
    },
  };
}
