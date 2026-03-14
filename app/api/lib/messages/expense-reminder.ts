import type { NotificationMessage, ScheduleSlot } from './types.js';

// ─── Track A: Zero Transactions Today — Escalating Daily ─────────

interface TrackAParams {
  slot: ScheduleSlot;
  consecutiveDaysWithoutTxn: number; // 1 = today only, 2 = yesterday+today, etc.
}

/**
 * 4 cron slots: morning (~10am), afternoon (~2pm), evening (~7pm), night (~9pm) IST.
 * Each day × slot combination has a unique message per the design doc.
 * Titles always anchor to expenses/money so users know what it's about at a glance.
 */
function getTrackAMessage(p: TrackAParams): NotificationMessage {
  const tag = `expense-reminder-${p.slot}`;
  const url = '/dashboard';
  const days = p.consecutiveDaysWithoutTxn;

  if (days <= 1) {
    // Day 1: friendly → impatient → guilt trip
    switch (p.slot) {
      case 'morning':   return { title: "Today's expenses: ₹0 so far", body: "Good morning! Fresh day, fresh spends. Tap to add your first expense.", tag, url };
      case 'afternoon': return { title: 'Half the day, zero expenses', body: "Half the day gone. Not a single rupee spent? Capture your expenses.", tag, url };
      case 'evening':   return { title: 'No expenses today — even chai counts', body: "We've been waiting all day. Even chai counts. Jot it down before you forget.", tag, url };
      case 'night':     return { title: "Today's expenses: still ₹0", body: "Fine. Guess today's expenses don't exist. Prove us wrong — record them now.", tag, url };
    }
  }

  if (days === 2) {
    // Day 2
    switch (p.slot) {
      case 'morning':   return { title: '2 days, zero expenses logged', body: "Day 2. Still nothing. We're worried. Add yesterday's and today's spends.", tag, url };
      case 'afternoon': return { title: 'No expenses in 2 days?', body: "Two days of financial silence. Suspicious. Track your expenses.", tag, url };
      case 'evening':   return { title: '2 days of expenses missing', body: "The spreadsheet is crying. Two days. Zero entries. Punch them in. Now.", tag, url };
      case 'night':     return { title: '2 days of expenses missing', body: "The spreadsheet is crying. Two days. Zero entries. Punch them in. Now.", tag, url };
    }
  }

  // Day 3+: aggressive
  switch (p.slot) {
    case 'morning':   return { title: `Day ${days}: still no expenses`, body: "Oh look who's not tracking again. Your expenses won't add themselves.", tag, url };
    case 'afternoon': return { title: `${days} days without logging`, body: "We're just a glorified icon on your phone. Tap to record expenses.", tag, url };
    case 'evening':   return { title: `${days} days of missing expenses`, body: "We're not angry. Just disappointed. Actually, we're angry. ADD. THEM. NOW.", tag, url };
    case 'night':     return { title: `${days} days of missing expenses`, body: "We're not angry. Just disappointed. Actually, we're angry. ADD. THEM. NOW.", tag, url };
  }
}

// ─── Track B: Contextual Sub-Category Nudges ─────────────────────

// Tier 1: Predefined sub-category messages (matched by name, case-insensitive)
// Each entry: [triggerDays, message]. triggerDays = min days since last txn (or since start of month).
interface SubCatMessage {
  triggerDays: number;
  monthly: boolean; // true = "not logged this month", false = "not logged in X days"
  title: string;
  body: string;
}

const TIER1_MESSAGES: Record<string, SubCatMessage> = {
  // Income
  'salary': { triggerDays: 5, monthly: false, title: 'Salary not logged yet', body: "Salary day came and went. Did your boss forget? Or did you? Record your salary income." },
  'business income': { triggerDays: 30, monthly: false, title: 'Business income missing', body: "Business income looking quiet. The tax man is still watching though. Add your business income." },
  'rental income': { triggerDays: 0, monthly: true, title: 'Rental income this month?', body: "Your tenant living rent-free this month? Track your rental income." },
  'freelance': { triggerDays: 30, monthly: false, title: 'Freelance income missing', body: "The hustle is resting? Punch in your freelance income." },
  'investments': { triggerDays: 30, monthly: false, title: 'Investment returns to log?', body: "Investment returns? Dividends? Anything? Note down your investment income." },

  // EMI
  'home loan emi': { triggerDays: 7, monthly: false, title: 'Home loan EMI logged?', body: "The bank never forgets. Did you pay your home loan? Record your EMI payment." },
  'car loan emi': { triggerDays: 7, monthly: false, title: 'Car loan EMI logged?', body: "Technically the bank's car right now. Track your car loan EMI." },
  'education loan': { triggerDays: 7, monthly: false, title: 'Education loan EMI due', body: "Education loan EMI — the gift that keeps on taking. Punch in your payment." },
  'personal loan': { triggerDays: 7, monthly: false, title: 'Personal loan EMI logged?', body: "Your bank balance is sweating. Add your personal loan EMI." },

  // Insurance
  'health insurance': { triggerDays: 0, monthly: true, title: 'Health insurance premium due', body: "Living dangerously, are we? Record your health insurance premium." },
  'life insurance': { triggerDays: 0, monthly: true, title: 'Life insurance premium due', body: "Future you is counting on present you. Add your life insurance premium." },
  'vehicle insurance': { triggerDays: 60, monthly: false, title: 'Vehicle insurance logged?', body: "Your car is technically naked right now. Capture your vehicle insurance payment." },

  // Savings
  'general savings': { triggerDays: 0, monthly: true, title: 'Savings transfer this month?', body: "Future you is writing a strongly worded letter. Track your savings transfer." },
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
  'groceries': { triggerDays: 10, monthly: false, title: 'No grocery expenses lately', body: "Surviving on air? No groceries in a while. Add your grocery spends." },
  'electricity': { triggerDays: 0, monthly: true, title: 'Electricity bill this month?', body: "Lights still on? Punch in your electricity bill." },
  'water': { triggerDays: 0, monthly: true, title: 'Water bill this month?', body: "Still hydrating though? Record your water bill." },
  'fuel': { triggerDays: 20, monthly: false, title: 'No fuel expenses lately', body: "Is the car running on vibes? Track your fuel expenses." },
  'food ordering': { triggerDays: 7, monthly: false, title: 'No food orders logged', body: "A whole week without ordering in? Sure about that? Jot down your food orders." },
  'dining out': { triggerDays: 14, monthly: false, title: 'No dining expenses lately', body: "Home chef mode or just forgot? Add your dining expenses." },
  'shopping': { triggerDays: 20, monthly: false, title: 'No shopping expenses lately', body: "No shopping in a while? Who even are you? Capture your shopping spends." },
  'entertainment': { triggerDays: 20, monthly: false, title: 'No entertainment expenses', body: "Zero entertainment spend? You okay? Note down your entertainment expenses." },
  'personal care': { triggerDays: 0, monthly: true, title: 'Personal care expenses?', body: "Self-care is NOT optional. Track your personal care expenses." },
  // medical: no reminders (too sensitive)
  'transport': { triggerDays: 10, monthly: false, title: 'No transport expenses', body: "Teleporting, are we? Punch in your transport costs." },
  'miscellaneous': { triggerDays: 14, monthly: false, title: 'Misc expenses piling up?', body: "The misc category is lonely. Add your miscellaneous spends." },
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
  daysSinceLastTxn: number; // days since last transaction for this sub-cat
  notLoggedThisMonth: boolean; // true if zero txns this month for this sub-cat
  dayOfMonth: number;
}

function getTrackBMessage(candidate: TrackBCandidate): NotificationMessage | null {
  const nameLower = candidate.subCategoryName.toLowerCase().trim();

  // Check Tier 1 (predefined)
  const tier1 = TIER1_MESSAGES[nameLower];
  if (tier1) {
    // Check trigger condition
    if (tier1.monthly) {
      // "Not logged this month" — only fire if we're past day 5 (give some grace)
      if (!candidate.notLoggedThisMonth || candidate.dayOfMonth < 5) return null;
    } else {
      // "Not logged in X days" — triggerDays is context-specific
      // For salary/rent: triggerDays means "after Xth of month"
      if (tier1.triggerDays > 0 && tier1.triggerDays <= 7) {
        // Day-of-month trigger (salary after 5th, EMIs after 7th, rent after 5th)
        if (candidate.dayOfMonth < tier1.triggerDays || !candidate.notLoggedThisMonth) return null;
      } else if (tier1.triggerDays > 0) {
        // Days-since-last trigger
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

  // Tier 2: generic for custom sub-categories
  // Only nudge if they haven't logged in 14+ days (avoid spamming)
  if (candidate.daysSinceLastTxn >= 14) {
    return getTier2Message(candidate.subCategoryName, candidate.daysSinceLastTxn);
  }

  return null;
}

// ─── Public API ──────────────────────────────────────────────────

export { getTrackAMessage, getTrackBMessage };
export type { TrackAParams };
