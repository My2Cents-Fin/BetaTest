import { supabaseAdmin } from '../supabaseAdmin.js';
import type { ScheduleSlot } from '../messages/types.js';

interface EligibleUser {
  userId: string;
  householdId: string;
}

export interface SubCategoryActivity {
  subCategoryId: string;
  subCategoryName: string;
  daysSinceLastTxn: number;
  notLoggedThisMonth: boolean;
}

export interface UserExpenseContext {
  userId: string;
  householdId: string;
  slot: ScheduleSlot;
  scheduleSlot: string;
  consecutiveDaysWithoutTxn: number; // 0 = has txns today, 1 = none today, 2 = none today+yesterday, etc.
  subCategoryActivities: SubCategoryActivity[];
  dayOfMonth: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
}

function getISTToday(): { date: string; dayOfMonth: number; dayOfWeek: number; monthStart: string } {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = ist.getFullYear();
  const month = ist.getMonth(); // 0-indexed
  const day = ist.getDate();
  const dow = ist.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { date: dateStr, dayOfMonth: day, dayOfWeek: dow, monthStart };
}

export async function buildExpenseContexts(
  users: EligibleUser[],
  slot: ScheduleSlot,
  scheduleSlot: string
): Promise<UserExpenseContext[]> {
  if (!users.length) return [];

  const today = getISTToday();
  const householdIds = [...new Set(users.map((u) => u.householdId))];

  // We need to look back up to 7 days for consecutive-days-without-txn tracking
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - 7);
  const lookbackStr = lookbackDate.toISOString().split('T')[0];

  // Query 1: Recent transactions per household (last 7 days) — for consecutive days tracking
  // We only need distinct dates per household, not individual transactions
  const { data: recentTxns } = await supabaseAdmin
    .from('transactions')
    .select('household_id, transaction_date')
    .in('household_id', householdIds)
    .gte('transaction_date', lookbackStr)
    .lte('transaction_date', today.date);

  // Build lookup: householdId → Set of dates with transactions
  const txnDatesMap = new Map<string, Set<string>>();
  for (const t of recentTxns || []) {
    const dates = txnDatesMap.get(t.household_id) || new Set();
    dates.add(t.transaction_date);
    txnDatesMap.set(t.household_id, dates);
  }

  // Query 2: Sub-categories per household (only those the user has — they selected during onboarding)
  const { data: subCats } = await supabaseAdmin
    .from('household_sub_categories')
    .select('id, household_id, name')
    .in('household_id', householdIds);

  // Query 3: Last transaction date per sub-category per household (current month + all time)
  // For "not logged this month" we check current month txns
  // For "days since last" we check the most recent transaction ever
  const { data: subCatTxns } = await supabaseAdmin
    .from('transactions')
    .select('household_id, sub_category_id, transaction_date')
    .in('household_id', householdIds)
    .not('sub_category_id', 'is', null)
    .order('transaction_date', { ascending: false });

  // Build lookup: "householdId:subCatId" → { lastTxnDate, hasThisMonth }
  interface SubCatTxnInfo {
    lastTxnDate: string;
    hasThisMonth: boolean;
  }
  const subCatTxnMap = new Map<string, SubCatTxnInfo>();
  for (const t of subCatTxns || []) {
    const key = `${t.household_id}:${t.sub_category_id}`;
    const existing = subCatTxnMap.get(key);
    if (!existing) {
      // First occurrence = most recent (ordered DESC)
      subCatTxnMap.set(key, {
        lastTxnDate: t.transaction_date,
        hasThisMonth: t.transaction_date >= today.monthStart,
      });
    } else if (!existing.hasThisMonth && t.transaction_date >= today.monthStart) {
      existing.hasThisMonth = true;
    }
  }

  // Build contexts
  return users.map((u) => {
    // Calculate consecutive days without transactions
    const txnDates = txnDatesMap.get(u.householdId) || new Set();
    let consecutiveDays = 0;
    const checkDate = new Date();
    // Walk backwards from today
    for (let i = 0; i < 7; i++) {
      const ist = new Date(checkDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const yr = ist.getFullYear();
      const mo = ist.getMonth();
      const dy = ist.getDate();
      const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
      if (txnDates.has(dateStr)) break;
      consecutiveDays++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Build sub-category activities for this household
    const householdSubCats = (subCats || []).filter((sc) => sc.household_id === u.householdId);
    const activities: SubCategoryActivity[] = [];

    for (const sc of householdSubCats) {
      const key = `${u.householdId}:${sc.id}`;
      const txnInfo = subCatTxnMap.get(key);

      if (!txnInfo) {
        // Never had a transaction for this sub-cat — skip (don't nag about unused categories)
        continue;
      }

      const lastDate = new Date(txnInfo.lastTxnDate + 'T00:00:00');
      const todayDate = new Date(today.date + 'T00:00:00');
      const diffMs = todayDate.getTime() - lastDate.getTime();
      const daysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      activities.push({
        subCategoryId: sc.id,
        subCategoryName: sc.name,
        daysSinceLastTxn: daysSince,
        notLoggedThisMonth: !txnInfo.hasThisMonth,
      });
    }

    return {
      userId: u.userId,
      householdId: u.householdId,
      slot,
      scheduleSlot,
      consecutiveDaysWithoutTxn: consecutiveDays,
      subCategoryActivities: activities,
      dayOfMonth: today.dayOfMonth,
      dayOfWeek: today.dayOfWeek,
    };
  });
}
