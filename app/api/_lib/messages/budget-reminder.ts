import type { NotificationMessage, ScheduleSlot } from './types.js';

const fmt = (n: number) => new Intl.NumberFormat('en-IN').format(Math.round(n));

// ─── Track A: No Budget ────────────────────────────────────────────

interface TrackAParams {
  slot: ScheduleSlot;
  dayOfMonth: number;
  daysUntilEndOfMonth: number;
  hasClone: boolean;
  hasTxns: boolean;
  txnAmount: number;
  txnCount: number;
}

// Phase 1: Proactive (last 5 days of month, targets NEXT month)
function getPhase1Message(p: TrackAParams): NotificationMessage {
  if (p.hasClone) {
    return p.slot === 'morning'
      ? {
          title: 'One tap ahead',
          body: `Next month is ${p.daysUntilEndOfMonth} days away. Clone this month's budget in one tap and tweak from there.`,
          tag: `budget-reminder-${p.slot}`,
          url: '/dashboard?tab=budget',
        }
      : {
          title: 'Clone & done',
          body: "Month's wrapping up. One tap to clone → quick tweaks → done. That's it.",
          tag: `budget-reminder-${p.slot}`,
          url: '/dashboard?tab=budget',
        };
  }
  return p.slot === 'morning'
    ? {
        title: 'Plan ahead',
        body: `Next month is ${p.daysUntilEndOfMonth} days away. Get ahead — plan your budget before the rush.`,
        tag: `budget-reminder-${p.slot}`,
        url: '/dashboard?tab=budget',
      }
    : {
        title: 'Get ahead',
        body: "Month's wrapping up. Winning move? Start next month's budget tonight.",
        tag: `budget-reminder-${p.slot}`,
        url: '/dashboard?tab=budget',
      };
}

// Phase 2: Grace (Days 1-3) — day-specific messages, clone only (no txn modifier)
function getPhase2Message(p: TrackAParams): NotificationMessage {
  const tag = `budget-reminder-${p.slot}`;
  const url = '/dashboard?tab=budget';
  const day = p.dayOfMonth;

  if (p.hasClone) {
    if (day === 1) {
      return p.slot === 'morning'
        ? { title: 'Happy new month!', body: "Happy new month! Clone last month's budget in one tap — adjust and you're done.", tag, url }
        : { title: 'Clone it tonight', body: "Day 1 isn't over yet. One tap clone. Quick tweak. Budget done. Easy.", tag, url };
    }
    if (day === 2) {
      return p.slot === 'morning'
        ? { title: 'One tap away', body: "Morning! Last month's plan is waiting. One tap to clone, adjust the numbers, freeze. Done.", tag, url }
        : { title: 'Clone & freeze', body: "Two days in. Your old budget is one tap away. Clone it, tweak it, freeze it.", tag, url };
    }
    // day 3
    return p.slot === 'morning'
      ? { title: '5 minutes', body: "Day 3. Clone + tweak = 5 minutes. Your last budget is ready to go.", tag, url }
      : { title: 'Last call', body: "Last call before we get pushy. One tap clone. You know the drill.", tag, url };
  }

  // No clone
  if (day === 1) {
    return p.slot === 'morning'
      ? { title: 'Happy new month!', body: "Happy new month! Fresh start, fresh budget. 10 minutes to set your plan.", tag, url }
      : { title: 'Day 1', body: "Day 1 isn't over yet. Create your budget before the spending starts.", tag, url };
  }
  if (day === 2) {
    return p.slot === 'morning'
      ? { title: 'Quick question', body: "Morning! Quick question — where's your budget? Tap to create one now.", tag, url }
      : { title: 'Give it a job', body: "Two days in, zero budget. Give your money a job tonight.", tag, url };
  }
  // day 3
  return p.slot === 'morning'
    ? { title: 'Grace period ending', body: "Day 3. Grace period's ending. Set up your budget today.", tag, url }
    : { title: 'Last chance', body: "Last chance before we start nagging. Create your monthly plan.", tag, url };
}

// Phase 3: Nudge (Days 4-7)
function getPhase3Message(p: TrackAParams): NotificationMessage {
  const tag = `budget-reminder-${p.slot}`;
  const url = '/dashboard?tab=budget';
  const week = Math.ceil(p.dayOfMonth / 7);

  if (p.hasClone) {
    return p.slot === 'morning'
      ? { title: 'One tap', body: `Week ${week}. One tap to clone last month's budget. Your money shouldn't wing it.`, tag, url }
      : { title: 'Under 5 minutes', body: "Still no budget? Last month's plan → one tap → done. We timed it. Under 5 minutes.", tag, url };
  }
  if (p.hasTxns) {
    return p.slot === 'morning'
      ? { title: 'No plan?', body: `You've spent ₹${fmt(p.txnAmount)} this month with no budget. That's brave. Create a plan before it gets scary.`, tag, url }
      : { title: 'Math check', body: `₹${fmt(p.txnAmount)} spent. ₹0 planned. Math isn't mathing. Set your budget now.`, tag, url };
  }
  return p.slot === 'morning'
    ? { title: 'No budget yet', body: `Week ${week} and no budget. Your money is winging it. Give it a plan.`, tag, url }
    : { title: 'Slightly judging', body: "Another day without a budget. Not judging. Okay, slightly judging. Tap to create.", tag, url };
}

// Phase 4: Urgency (Days 8-15)
function getPhase4Message(p: TrackAParams): NotificationMessage {
  const tag = `budget-reminder-${p.slot}`;
  const url = '/dashboard?tab=budget';

  if (p.hasClone) {
    return p.slot === 'morning'
      ? { title: 'One tap clone', body: "Half the month gone. Clone last month's budget — literally one tap. Then tweak what changed.", tag, url }
      : { title: 'One. Tap. Clone.', body: `Day ${p.dayOfMonth}. No budget. One. Tap. Clone. That's all we're asking.`, tag, url };
  }
  if (p.hasTxns) {
    return p.slot === 'morning'
      ? { title: 'Budget. Now.', body: `₹${fmt(p.txnAmount)} spent with zero planning. Would you drive blindfolded? Budget. Now.`, tag, url }
      : { title: 'Imagine a plan', body: `You've logged ${p.txnCount} transactions. Great. Now imagine having a PLAN for them. Create your budget.`, tag, url };
  }
  return p.slot === 'morning'
    ? { title: 'Wallet is stressed', body: "Half the month. No budget. Your wallet called — it's stressed. Create your plan now.", tag, url }
    : { title: 'Chaos or budget?', body: `We've been gentle. It's day ${p.dayOfMonth}. Make a budget or admit you like chaos.`, tag, url };
}

// Phase 5: Intervention (Days 16-25)
function getPhase5Message(p: TrackAParams): NotificationMessage {
  const tag = `budget-reminder-${p.slot}`;
  const url = '/dashboard?tab=budget';

  if (p.hasClone) {
    return p.slot === 'morning'
      ? { title: 'Please', body: `Day ${p.dayOfMonth}. Your last budget is RIGHT THERE. One tap. Please. We're begging.`, tag, url }
      : { title: 'One tap', body: "One tap. That's all. Clone → tweak → freeze. Your future self will thank you.", tag, url };
  }
  if (p.hasTxns) {
    return p.slot === 'morning'
      ? { title: 'No guardrails', body: `₹${fmt(p.txnAmount)} spent this month. No plan. No guardrails. You're speedrunning financial regret.`, tag, url }
      : { title: 'Yikes', body: `${p.txnCount} transactions. ${p.dayOfMonth} days. Zero budget. The math is giving 'yikes'. Create one now.`, tag, url };
  }
  return p.slot === 'morning'
    ? { title: "We're concerned", body: `Day ${p.dayOfMonth}. More than half the month gone. No budget. We're not mad, we're concerned. Tap to create.`, tag, url }
    : { title: 'Financial chaos', body: "At this point we admire your commitment to financial chaos. Prove us wrong — make a budget.", tag, url };
}

// Phase 6: Month-End Pivot (Days 26+, targets NEXT month)
function getPhase6Message(p: TrackAParams): NotificationMessage {
  const tag = `budget-reminder-${p.slot}`;
  const url = '/dashboard?tab=budget';

  if (p.hasClone) {
    return p.slot === 'morning'
      ? { title: 'Next month', body: "This month flew by. Clone this month's spending into next month's budget — one tap to get ahead.", tag, url }
      : { title: 'Start fresh', body: "Forget this month. One tap to clone your budget for next month. Start fresh.", tag, url };
  }
  if (p.hasTxns) {
    return p.slot === 'morning'
      ? { title: 'Learn from it', body: `You spent ₹${fmt(p.txnAmount)} this month unplanned. Learn from it — plan next month now.`, tag, url }
      : { title: 'Next month', body: `This month: ₹${fmt(p.txnAmount)} spent, ₹0 budgeted. Next month doesn't have to be like this. Create your plan.`, tag, url };
  }
  return p.slot === 'morning'
    ? { title: 'Fresh start', body: "This month is wrapping up. Let's be honest — no budget happened. But next month? Fresh start. Plan it now.", tag, url }
    : { title: 'Try action', body: "Month's almost over. Instead of regret, try action. Start next month's budget tonight.", tag, url };
}

// ─── Track B: Draft Exists, Not Frozen ─────────────────────────────

interface TrackBParams {
  slot: ScheduleSlot;
  dayOfMonth: number;
  hasTxns: boolean;
  txnAmount: number;
}

function getTrackBMessage(p: TrackBParams): NotificationMessage {
  const tag = `budget-reminder-${p.slot}`;
  const url = '/dashboard?tab=budget';

  // Transactions modifier overrides day-specific messages
  if (p.hasTxns) {
    return p.slot === 'morning'
      ? { title: 'Freeze it', body: "You're logging expenses but your budget is still in draft. Freeze it so we can track against the plan.", tag, url }
      : { title: 'No finish line', body: `₹${fmt(p.txnAmount)} spent against an unfrozen plan. It's like running a race with no finish line. Tap freeze.`, tag, url };
  }

  const day = p.dayOfMonth;

  if (day === 1) {
    return p.slot === 'morning'
      ? { title: 'Ready to freeze', body: "Your budget draft is ready and waiting. One tap to freeze and you're set for the month.", tag, url }
      : { title: 'Seal the deal', body: "You did the planning. Now seal the deal. Freeze your budget — takes 2 seconds.", tag, url };
  }
  if (day === 2) {
    return p.slot === 'morning'
      ? { title: 'Good to go', body: "Draft's still sitting there. It's good to go! Tap to freeze your plan.", tag, url }
      : { title: 'Pull the cord', body: "A budget in draft is like a parachute in the bag — useless until you pull the cord. Freeze it now.", tag, url };
  }
  if (day === 3) {
    return p.slot === 'morning'
      ? { title: 'So close!', body: "Day 3 with an unfrozen budget. So close! Tap freeze and start tracking.", tag, url }
      : { title: 'Just. Tap. Freeze.', body: "Your budget is literally one button away from being real. Just. Tap. Freeze.", tag, url };
  }
  // day 4+
  return p.slot === 'morning'
    ? { title: 'Gathering dust', body: `Day ${p.dayOfMonth}. Your draft is gathering dust. Freeze it and let it do its job.`, tag, url }
    : { title: 'Freeze the budget', body: "We'll keep reminding you. You'll keep seeing this. Freeze the budget. It's right there.", tag, url };
}

// ─── Public API ────────────────────────────────────────────────────

export type BudgetPhase = 1 | 2 | 3 | 4 | 5 | 6;

export function getPhaseForDay(dayOfMonth: number): BudgetPhase {
  if (dayOfMonth <= 3) return 2;
  if (dayOfMonth <= 7) return 3;
  if (dayOfMonth <= 15) return 4;
  if (dayOfMonth <= 25) return 5;
  return 6;
}

export function getTrackAMessage(phase: BudgetPhase, params: TrackAParams): NotificationMessage {
  switch (phase) {
    case 1: return getPhase1Message(params);
    case 2: return getPhase2Message(params);
    case 3: return getPhase3Message(params);
    case 4: return getPhase4Message(params);
    case 5: return getPhase5Message(params);
    case 6: return getPhase6Message(params);
  }
}

export { getTrackBMessage };
export type { TrackAParams, TrackBParams };
