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
 * Track B: Contextual sub-category nudges for overdue categories.
 *   - Only fires in MORNING slot (afternoon/night always get Track A)
 *   - Only fires if the sub-category hasn't been nudged in the last 3 days
 *   - Prevents repetitive nagging about the same category every slot/day
 *
 * Priority: Track A fires if user hasn't logged today.
 *           Track B fires only in morning slot when user HAS logged today.
 */
export function evaluateExpenseReminder(ctx: UserExpenseContext): EvaluatorResult | null {
  // ─── Track A: No transactions today → always Track A ──
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
  // Build Track A message as default
  const message = getTrackAMessage({
    slot: ctx.slot,
    consecutiveDaysWithoutTxn: 0,
    dayOfWeek: ctx.dayOfWeek,
    dayOfMonth: ctx.dayOfMonth,
  });

  // ─── Track B: Only in morning slot (afternoon/night always get Track A) ──
  // This prevents the same sub-cat nudge from firing 3x/day
  if (ctx.slot === 'morning') {
    const recentlyNudged = new Set(ctx.recentTrackBSubCatIds || []);
    const candidates: Array<TrackBCandidate & { message: NonNullable<ReturnType<typeof getTrackBMessage>> }> = [];

    for (const activity of ctx.subCategoryActivities) {
      // Skip sub-categories that were already nudged in the last 3 days
      if (recentlyNudged.has(activity.subCategoryId)) continue;

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
  }

  // Afternoon/night slots, or morning with no Track B candidate → regular daily nudge
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
