import type { UserExpenseContext } from './expense-context.js';
import type { EvaluatorResult } from './types.js';
import { getTrackAMessage, getTrackBMessage } from '../messages/expense-reminder.js';
import type { TrackBCandidate } from '../messages/expense-reminder.js';

/**
 * Expense Logging Reminder evaluator.
 *
 * Track A: User has ZERO transactions today (and possibly consecutive days).
 *          Fires escalating "log your expenses" nudges.
 *
 * Track B: User HAS transactions today but specific sub-categories are overdue.
 *          Fires contextual sub-category nudges.
 *
 * Priority: Track A > Track B (if user hasn't logged anything today, the generic
 *           nudge is more appropriate than a sub-cat-specific one).
 *
 * Only ONE expense reminder per slot (morning/evening). We pick the best one.
 */
export function evaluateExpenseReminder(ctx: UserExpenseContext): EvaluatorResult | null {
  // ─── Track A: Zero transactions today ─────────────────────────
  if (ctx.consecutiveDaysWithoutTxn >= 1) {
    const message = getTrackAMessage({
      slot: ctx.slot,
      consecutiveDaysWithoutTxn: ctx.consecutiveDaysWithoutTxn,
    });

    return {
      message,
      notificationType: 'expense_reminder',
      subtype: `track_a:day_${ctx.consecutiveDaysWithoutTxn}:${ctx.slot}`,
      messageData: {
        track: 'a',
        consecutiveDays: ctx.consecutiveDaysWithoutTxn,
      },
    };
  }

  // ─── Track B: Has transactions today — check sub-category nudges ──
  // Find all triggered sub-categories, pick the most overdue one
  const candidates: Array<TrackBCandidate & { message: NonNullable<ReturnType<typeof getTrackBMessage>> }> = [];

  for (const activity of ctx.subCategoryActivities) {
    const candidate: TrackBCandidate = {
      subCategoryId: activity.subCategoryId,
      subCategoryName: activity.subCategoryName,
      daysSinceLastTxn: activity.daysSinceLastTxn,
      notLoggedThisMonth: activity.notLoggedThisMonth,
      dayOfMonth: ctx.dayOfMonth,
    };

    const message = getTrackBMessage(candidate);
    if (message) {
      candidates.push({ ...candidate, message });
    }
  }

  if (candidates.length === 0) return null;

  // Pick the most overdue sub-category (longest days since last transaction)
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
