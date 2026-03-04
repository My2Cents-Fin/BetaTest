import type { UserBudgetContext, EvaluatorResult } from './types.js';
import {
  getPhaseForDay,
  getTrackAMessage,
  getTrackBMessage,
  type BudgetPhase,
} from '../messages/budget-reminder.js';

export function evaluateBudgetReminder(ctx: UserBudgetContext): EvaluatorResult | null {
  const { currentMonthPlan, prevMonthPlan, nextMonthPlan, currentMonthTransactions, today, slot } = ctx;

  // ─── Branch A: Current month IS frozen ───────────────────────────
  if (currentMonthPlan.status === 'frozen') {
    // Check proactive window: last 5 days of month, next month not yet frozen
    if (today.daysUntilEndOfMonth <= 4 && nextMonthPlan.status !== 'frozen') {
      // Clone modifier: current month is frozen, so it IS the clone source
      const hasClone = true; // by definition — current month is frozen
      const message = getTrackAMessage(1, {
        slot,
        dayOfMonth: today.dayOfMonth,
        daysUntilEndOfMonth: today.daysUntilEndOfMonth,
        hasClone,
        hasTxns: false, // N/A for proactive
        txnAmount: 0,
        txnCount: 0,
      });

      return {
        message,
        notificationType: 'budget_reminder',
        subtype: `track_a:phase_1:${hasClone ? 'clone' : 'none'}:${slot}`,
        messageData: { phase: 1, track: 'a', modifier: 'clone', targetMonth: today.nextMonth },
      };
    }
    // Frozen + not in proactive window → nothing to do
    return null;
  }

  // ─── Branch B: Draft exists (not frozen) ─────────────────────────
  if (currentMonthPlan.status === 'draft') {
    const hasTxns = currentMonthTransactions.count > 0;
    const message = getTrackBMessage({
      slot,
      dayOfMonth: today.dayOfMonth,
      hasTxns,
      txnAmount: currentMonthTransactions.totalAmount,
    });

    return {
      message,
      notificationType: 'budget_reminder',
      subtype: `track_b:${hasTxns ? 'txn' : 'none'}:${slot}`,
      messageData: {
        track: 'b',
        dayOfMonth: today.dayOfMonth,
        modifier: hasTxns ? 'transactions' : 'none',
        ...(hasTxns && { txnAmount: currentMonthTransactions.totalAmount }),
      },
    };
  }

  // ─── Branch C: No plan at all → Track A escalating phases ───────
  const phase: BudgetPhase = getPhaseForDay(today.dayOfMonth);
  const hasClone = prevMonthPlan.status === 'frozen';
  const hasTxns = !hasClone && currentMonthTransactions.count > 0; // clone takes priority

  const message = getTrackAMessage(phase, {
    slot,
    dayOfMonth: today.dayOfMonth,
    daysUntilEndOfMonth: today.daysUntilEndOfMonth,
    hasClone,
    hasTxns,
    txnAmount: currentMonthTransactions.totalAmount,
    txnCount: currentMonthTransactions.count,
  });

  const modifier = hasClone ? 'clone' : hasTxns ? 'transactions' : 'none';

  return {
    message,
    notificationType: 'budget_reminder',
    subtype: `track_a:phase_${phase}:${modifier}:${slot}`,
    messageData: {
      phase,
      track: 'a',
      modifier,
      dayOfMonth: today.dayOfMonth,
      ...(hasTxns && {
        txnAmount: currentMonthTransactions.totalAmount,
        txnCount: currentMonthTransactions.count,
      }),
    },
  };
}
