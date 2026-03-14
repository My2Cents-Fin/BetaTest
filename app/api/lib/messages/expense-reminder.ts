import type { NotificationMessage, ScheduleSlot } from './types.js';

// ─── Track A: Expense Logging Reminders ──────────────────────────
//
// Decision tree:
//   Has backlog (2+ days without logging)?
//   ├── YES → Is today a milestone day (weekend/month-start/mid/end)?
//   │   ├── YES → Milestone catch-up message
//   │   └── NO  → Consecutive days message
//   └── NO  → Regular weekday/weekend rotation
//
// 3 slots/day: morning (10am), afternoon (3:30pm), night (10pm) IST
// Tone: sassy, encouraging, best-buddy — never condescending or aggressive.

export interface TrackAParams {
  slot: ScheduleSlot;
  consecutiveDaysWithoutTxn: number;
  dayOfWeek: number;   // 0=Sun, 1=Mon, ..., 6=Sat
  dayOfMonth: number;
}

type MilestoneType = 'month_end' | 'mid_month' | 'month_start' | 'weekend' | null;

function getMilestone(dayOfMonth: number, dayOfWeek: number): MilestoneType {
  if (dayOfMonth >= 28) return 'month_end';
  if (dayOfMonth >= 14 && dayOfMonth <= 16) return 'mid_month';
  if (dayOfMonth <= 5) return 'month_start';
  if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
  return null;
}

// ─── Regular Weekday Messages (no backlog) ───────────────────────

function getRegularMessage(p: TrackAParams): NotificationMessage {
  const tag = `expense-reminder-${p.slot}`;
  const url = '/dashboard';
  const dow = p.dayOfWeek;

  // Saturday (no backlog)
  if (dow === 6) {
    switch (p.slot) {
      case 'morning':   return { title: 'Saturday — any spends yet?', body: "Weekend spending hits different. Log as you go today.", tag, url };
      case 'afternoon': return { title: 'Weekend spends sneaking in?', body: "Movies, eating out, shopping — weekend expenses add up fast. Capture them.", tag, url };
      case 'night':     return { title: 'Saturday well spent?', body: "However you spent today — log it before the day ends.", tag, url };
    }
  }

  // Sunday (no backlog)
  if (dow === 0) {
    switch (p.slot) {
      case 'morning':   return { title: 'Lazy Sunday, quick log?', body: "Even rest days have spends. Groceries, ordering in — takes 10 seconds.", tag, url };
      case 'afternoon': return { title: 'Sunday spends check', body: "Quick one — anything you spent today? Get it in while it's fresh.", tag, url };
      case 'night':     return { title: 'Ready for Monday', body: "Log today's expenses and start the new week with a clean slate.", tag, url };
    }
  }

  // Monday
  if (dow === 1) {
    switch (p.slot) {
      case 'morning':   return { title: 'New week, new spends', body: "Monday's here. Log expenses as they happen — start the week right.", tag, url };
      case 'afternoon': return { title: 'That lunch, that auto...', body: "The small spends are sneaky. Log them before they vanish from memory.", tag, url };
      case 'night':     return { title: 'Log today, chill this weekend', body: "Every expense you log tonight is one less to remember on Saturday.", tag, url };
    }
  }

  // Tuesday
  if (dow === 2) {
    switch (p.slot) {
      case 'morning':   return { title: 'One expense = one small win', body: "Start with just one. Log your first expense of the day — takes 10 seconds.", tag, url };
      case 'afternoon': return { title: '10 seconds. That\'s all.', body: "Just one expense. 10 seconds. Tap, type, done.", tag, url };
      case 'night':     return { title: 'Where\'d today\'s money go?', body: "Curious how much you spent today? Log it and see for yourself.", tag, url };
    }
  }

  // Wednesday
  if (dow === 3) {
    switch (p.slot) {
      case 'morning':   return { title: 'Midweek check-in 👋', body: "Halfway through the week! We're keeping track with you — just need today's spends.", tag, url };
      case 'afternoon': return { title: 'Midweek money check', body: "Halfway through the week — how's the spending looking? Log and see.", tag, url };
      case 'night':     return { title: 'Chai, auto, Swiggy...', body: "That chai, that auto, that random online order — it all adds up. Jot it down.", tag, url };
    }
  }

  // Thursday
  if (dow === 4) {
    switch (p.slot) {
      case 'morning':   return { title: 'Morning coffee logged? ☕', body: "That morning chai, commute, any online orders — get them in while they're fresh.", tag, url };
      case 'afternoon': return { title: 'Know where every rupee goes', body: "Tracking every spend = knowing exactly where your money went. Quick log?", tag, url };
      case 'night':     return { title: 'Keep the rhythm going', body: "You've been at it — don't break the rhythm now. Log today's expenses.", tag, url };
    }
  }

  // Friday
  switch (p.slot) {
    case 'morning':   return { title: 'Log now, free your weekend', body: "Got weekend plans? The less you leave for Saturday, the more time for fun.", tag, url };
    case 'afternoon': return { title: 'Before the weekend fog hits', body: "Friday afternoon — after this, memory gets fuzzy. Log what you spent today.", tag, url };
    case 'night':     return { title: 'Clear the decks 🎉', body: "Log today's expenses and head into the weekend with nothing hanging over you.", tag, url };
  }
}

// ─── Consecutive Days Without Logging (non-milestone weekday) ────

function getConsecutiveDaysMessage(p: TrackAParams): NotificationMessage {
  const tag = `expense-reminder-${p.slot}`;
  const url = '/dashboard';
  const days = p.consecutiveDaysWithoutTxn;

  if (days <= 2) {
    switch (p.slot) {
      case 'morning':   return { title: '2 days of expenses waiting', body: "No stress — 2 days is nothing. A quick 2-minute catch-up and you're sorted.", tag, url };
      case 'afternoon': return { title: 'We saved your spot', body: "2 days unlogged. We're here whenever you're ready — just tap and go.", tag, url };
      case 'night':     return { title: 'Small backlog building', body: "2 days isn't much — but 3 starts getting fuzzy. Log them tonight?", tag, url };
    }
  }

  if (days <= 6) {
    switch (p.slot) {
      case 'morning':   return { title: `${days} days of expenses — 5 mins`, body: "A few days piled up. 5 minutes and you're fully caught up. We'll make it easy.", tag, url };
      case 'afternoon': return { title: 'Your expenses miss you', body: `${days} days worth waiting for you. We'll keep it quick, promise.`, tag, url };
      case 'night':     return { title: 'Got 5 mins tonight?', body: `${days} days of expenses. Quick catch-up tonight means a free weekend.`, tag, url };
    }
  }

  if (days <= 13) {
    switch (p.slot) {
      case 'morning':   return { title: `${days} days — we kept your spot warm`, body: "A bunch of expenses waiting. 5-10 minutes and you're fully caught up.", tag, url };
      case 'afternoon': return { title: 'Still here, still rooting for you 🐶', body: `${days} days now. We're like that friend who saves you a seat. Come back?`, tag, url };
      case 'night':     return { title: 'We miss you, not gonna lie', body: `${days} days of expenses in your memory. Let's get them down before they fade.`, tag, url };
    }
  }

  // 14+ days
  switch (p.slot) {
    case 'morning':   return { title: `It's been ${days} days`, body: "We're still here. No judgement. Open the app and let's start fresh together.", tag, url };
    case 'afternoon': return { title: 'Your money story has gaps', body: `${days} days of expenses untracked. Whenever you're ready, we're ready.`, tag, url };
    case 'night':     return { title: 'Fresh start anytime', body: "It's been a while. Forget the backlog — even starting from today helps.", tag, url };
  }
}

// ─── Milestone Catch-up Messages (has backlog + milestone day) ───

function getMilestoneMessage(p: TrackAParams, milestone: MilestoneType): NotificationMessage {
  const tag = `expense-reminder-${p.slot}`;
  const url = '/dashboard';
  const dow = p.dayOfWeek;

  // Saturday with backlog
  if (milestone === 'weekend' && dow === 6) {
    switch (p.slot) {
      case 'morning':   return { title: 'Coffee + catch-up? ☕', body: "Saturday morning. Grab your coffee, spend 5 mins logging this week's expenses.", tag, url };
      case 'afternoon': return { title: 'Weekend = catch-up time', body: "Perfect time to scroll through your UPI history and log everything from the week.", tag, url };
      case 'night':     return { title: 'Log the week before it fades', body: "Before the evening plans kick in — get this week's expenses down. Takes 5 mins.", tag, url };
    }
  }

  // Sunday with backlog
  if (milestone === 'weekend' && dow === 0) {
    switch (p.slot) {
      case 'morning':   return { title: 'Clean slate for Monday', body: "Log this week's remaining expenses. Start Monday with nothing hanging over you.", tag, url };
      case 'afternoon': return { title: 'Quick Sunday catch-up', body: "Quick scan of your week — anything you missed? 2 minutes, tops.", tag, url };
      case 'night':     return { title: "Don't carry it into next week", body: "Last chance to log this week's expenses. Start fresh tomorrow.", tag, url };
    }
  }

  // Month-start (1st-5th) with backlog
  if (milestone === 'month_start') {
    switch (p.slot) {
      case 'morning':   return { title: 'New month — clear the old first', body: "Before the new month's expenses start flowing, log what's left from last month.", tag, url };
      case 'afternoon': return { title: 'Fresh month, clean books', body: "Salary just landed? Perfect time to log last month's stragglers + this month's big ones.", tag, url };
      case 'night':     return { title: 'Big expenses landing this week', body: "Rent, EMIs, subscriptions — they all hit now. Catch up + capture as they come.", tag, url };
    }
  }

  // Mid-month (14th-16th) with backlog
  if (milestone === 'mid_month') {
    switch (p.slot) {
      case 'morning':   return { title: 'Half the month — are you up to date?', body: "15 days in. A 5-minute catch-up now saves a 30-minute headache later.", tag, url };
      case 'afternoon': return { title: 'Mid-month is the perfect catch-up point', body: "Not too much to remember, not too little. Log your expenses while they're still fresh.", tag, url };
      case 'night':     return { title: "Halfway there — let's catch up", body: "Half the month done. Spend a few minutes getting your expenses up to date.", tag, url };
    }
  }

  // Month-end (28th-31st) with backlog
  if (milestone === 'month_end') {
    switch (p.slot) {
      case 'morning':   return { title: 'Month closing — expenses up to date?', body: "Last few days of the month. Don't let unlogged expenses leak into next month.", tag, url };
      case 'afternoon': return { title: 'Month-end expense sweep 🧹', body: "Scroll through your bank/UPI history. Log everything. Close the month clean.", tag, url };
      case 'night':     return { title: "Last call for this month's expenses", body: "Month's closing. One final pass — get everything in before the new month starts.", tag, url };
    }
  }

  // Fallback (shouldn't reach here)
  return getConsecutiveDaysMessage(p);
}

// ─── Main Track A Entry Point ────────────────────────────────────

export function getTrackAMessage(p: TrackAParams): NotificationMessage {
  const hasBacklog = p.consecutiveDaysWithoutTxn >= 2;
  const milestone = getMilestone(p.dayOfMonth, p.dayOfWeek);

  if (hasBacklog && milestone) {
    return getMilestoneMessage(p, milestone);
  }

  if (hasBacklog) {
    return getConsecutiveDaysMessage(p);
  }

  return getRegularMessage(p);
}

// ─── Track B: Contextual Sub-Category Nudges ─────────────────────

interface SubCatMessage {
  triggerDays: number;
  monthly: boolean;
  title: string;
  body: string;
}

const TIER1_MESSAGES: Record<string, SubCatMessage> = {
  // Income
  'salary': { triggerDays: 5, monthly: false, title: 'Salary landed yet?', body: "Payday usually hits by now. If it's in, log it — if not, we feel you." },
  'business income': { triggerDays: 30, monthly: false, title: 'Business income missing', body: "Business income looking quiet. The tax man is still watching though. Add your business income." },
  'rental income': { triggerDays: 0, monthly: true, title: 'Rental income this month?', body: "Your tenant living rent-free this month? Track your rental income." },
  'freelance': { triggerDays: 30, monthly: false, title: 'Freelance income missing', body: "The hustle is resting? Punch in your freelance income." },
  'investments': { triggerDays: 30, monthly: false, title: 'Investment returns to log?', body: "Investment returns? Dividends? Anything? Note down your investment income." },

  // EMI
  'home loan emi': { triggerDays: 7, monthly: false, title: 'Home loan EMI logged?', body: "The bank never forgets. Did you pay your home loan? Record your EMI payment." },
  'car loan emi': { triggerDays: 7, monthly: false, title: 'Car loan EMI logged?', body: "Technically the bank's car right now. Track your car loan EMI." },
  'education loan': { triggerDays: 7, monthly: false, title: 'Education loan EMI due', body: "Education loan EMI — the gift that keeps on taking. Punch in your payment." },
  'personal loan': { triggerDays: 7, monthly: false, title: 'Personal loan EMI this month?', body: "If the EMI's gone out, log it. One less thing to track in your head." },

  // Insurance
  'health insurance': { triggerDays: 0, monthly: true, title: 'Health insurance this month?', body: "If the premium's been paid, get it logged. Future you will appreciate it." },
  'life insurance': { triggerDays: 0, monthly: true, title: 'Life insurance premium due', body: "Future you is counting on present you. Add your life insurance premium." },
  'vehicle insurance': { triggerDays: 60, monthly: false, title: 'Vehicle insurance logged?', body: "Your car is technically naked right now. Capture your vehicle insurance payment." },

  // Savings
  'general savings': { triggerDays: 0, monthly: true, title: 'Savings transfer done?', body: "If you've moved money to savings this month, log it. If not — no judgement, just a nudge." },
  'emergency fund': { triggerDays: 0, monthly: true, title: 'Emergency fund contribution?', body: "Emergencies don't RSVP. Add your emergency fund contribution." },
  'investment/sip': { triggerDays: 0, monthly: true, title: 'SIP payment logged?', body: "Your mutual fund is feeling ghosted. Record your SIP payment." },
  'vacation fund': { triggerDays: 0, monthly: true, title: 'Vacation fund deposit?', body: "Guess we're staycationing again. Note down your vacation fund deposit." },

  // Fixed
  'rent': { triggerDays: 5, monthly: false, title: 'Rent payment logged?', body: "Your landlord called. Just kidding. But did you pay? Record your rent." },
  'internet': { triggerDays: 0, monthly: true, title: 'Internet bill this month?', body: "How are you even reading this? Add your internet bill." },
  'phone bill': { triggerDays: 0, monthly: true, title: 'Phone bill logged?', body: "Bold move for someone holding a phone right now. Punch in your phone bill." },
  'maid/help': { triggerDays: 0, monthly: true, title: 'Maid payment this month?', body: "Did the maid quit or did you just forget? Track your maid payment." },
  'society maintenance': { triggerDays: 0, monthly: true, title: 'Maintenance payment logged?', body: "Your RWA uncle is watching. Note down your maintenance payment." },
  'subscriptions': { triggerDays: 0, monthly: true, title: 'Subscription payments logged?', body: "Netflix is still charging you. Just saying. Capture your subscription payment." },

  // Variable
  'groceries': { triggerDays: 10, monthly: false, title: 'No groceries in a while?', body: "Either the fridge is magic or some grocery runs need logging." },
  'electricity': { triggerDays: 0, monthly: true, title: 'Electricity bill this month?', body: "Lights still on? Punch in your electricity bill." },
  'water': { triggerDays: 0, monthly: true, title: 'Water bill this month?', body: "Still hydrating though? Record your water bill." },
  'fuel': { triggerDays: 20, monthly: false, title: 'No fuel expenses lately', body: "Is the car running on vibes? Track your fuel expenses." },
  'food ordering': { triggerDays: 7, monthly: false, title: 'No food orders logged', body: "A whole week without ordering in? Sure about that? Jot down your food orders." },
  'dining out': { triggerDays: 14, monthly: false, title: 'No dining expenses lately', body: "Home chef mode or just forgot? Add your dining expenses." },
  'shopping': { triggerDays: 20, monthly: false, title: 'No shopping expenses lately', body: "No shopping in a while? Who even are you? Capture your shopping spends." },
  'entertainment': { triggerDays: 20, monthly: false, title: 'No entertainment spend?', body: "If you've had fun lately (and spent money doing it) — log it!" },
  'personal care': { triggerDays: 0, monthly: true, title: 'Personal care expenses?', body: "Self-care is NOT optional. Track your personal care expenses." },
  // medical: no reminders (too sensitive)
  'transport': { triggerDays: 10, monthly: false, title: 'No transport expenses', body: "Teleporting, are we? Punch in your transport costs." },
  'miscellaneous': { triggerDays: 14, monthly: false, title: 'Any misc expenses lately?', body: "Random spends that don't fit anywhere — they add up. Log them when you can." },
};

// Tier 2: Generic messages for custom sub-categories
function getTier2Message(subCatName: string, daysSinceLastTxn: number): NotificationMessage {
  const tag = 'expense-reminder-subcat';
  const url = '/dashboard';

  if (daysSinceLastTxn > 30) {
    return {
      title: `${subCatName} expenses: ${daysSinceLastTxn} days ago`,
      body: `${subCatName} gathering dust. ${daysSinceLastTxn} days and counting. Don't let it slip — record it.`,
      tag,
      url,
    };
  }

  return {
    title: `No ${subCatName} expenses in ${daysSinceLastTxn} days`,
    body: `No ${subCatName} in ${daysSinceLastTxn} days. Forgot or avoiding it? Add your ${subCatName} expenses.`,
    tag,
    url,
  };
}

export interface TrackBCandidate {
  subCategoryId: string;
  subCategoryName: string;
  daysSinceLastTxn: number;
  notLoggedThisMonth: boolean;
  dayOfMonth: number;
}

export function getTrackBMessage(candidate: TrackBCandidate): NotificationMessage | null {
  const nameLower = candidate.subCategoryName.toLowerCase().trim();

  const tier1 = TIER1_MESSAGES[nameLower];
  if (tier1) {
    if (tier1.monthly) {
      if (!candidate.notLoggedThisMonth || candidate.dayOfMonth < 5) return null;
    } else {
      if (tier1.triggerDays > 0 && tier1.triggerDays <= 7) {
        if (candidate.dayOfMonth < tier1.triggerDays || !candidate.notLoggedThisMonth) return null;
      } else if (tier1.triggerDays > 0) {
        if (candidate.daysSinceLastTxn < tier1.triggerDays) return null;
      }
    }

    return {
      title: tier1.title,
      body: tier1.body,
      tag: 'expense-reminder-subcat',
      url: '/dashboard',
    };
  }

  if (candidate.daysSinceLastTxn >= 14) {
    return getTier2Message(candidate.subCategoryName, candidate.daysSinceLastTxn);
  }

  return null;
}
