import { supabaseAdmin } from '../supabaseAdmin.js';
import type { ScheduleSlot } from '../messages/types.js';
import type { UserBudgetContext, PlanStatus } from './types.js';

interface EligibleUser {
  userId: string;
  householdId: string;
}

function getISTDate(): {
  dayOfMonth: number;
  daysInMonth: number;
  daysUntilEndOfMonth: number;
  month: string;
  prevMonth: string;
  nextMonth: string;
} {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const year = ist.getFullYear();
  const monthIdx = ist.getMonth(); // 0-indexed
  const dayOfMonth = ist.getDate();
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const month = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

  // Previous month
  let prevMonth: string;
  if (monthIdx === 0) {
    prevMonth = `${year - 1}-12`;
  } else {
    prevMonth = `${year}-${String(monthIdx).padStart(2, '0')}`;
  }

  // Next month
  let nextMonth: string;
  if (monthIdx === 11) {
    nextMonth = `${year + 1}-01`;
  } else {
    nextMonth = `${year}-${String(monthIdx + 2).padStart(2, '0')}`;
  }

  return { dayOfMonth, daysInMonth, daysUntilEndOfMonth: daysInMonth - dayOfMonth, month, prevMonth, nextMonth };
}

export async function buildBudgetContexts(
  users: EligibleUser[],
  slot: ScheduleSlot,
  scheduleSlot: string
): Promise<UserBudgetContext[]> {
  if (!users.length) return [];

  const today = getISTDate();
  const householdIds = [...new Set(users.map((u) => u.householdId))];

  // Plan months to query (as DATE strings for DB)
  const planMonths = [
    `${today.month}-01`,
    `${today.prevMonth}-01`,
    `${today.nextMonth}-01`,
  ];

  // Query 1: monthly_plans for all households × 3 months
  const { data: plans } = await supabaseAdmin
    .from('monthly_plans')
    .select('household_id, plan_month, status')
    .in('household_id', householdIds)
    .in('plan_month', planMonths);

  // Build lookup: "householdId:YYYY-MM" → PlanStatus
  const planMap = new Map<string, PlanStatus>();
  for (const p of plans || []) {
    const monthStr = p.plan_month.substring(0, 7); // "YYYY-MM-DD" → "YYYY-MM"
    planMap.set(`${p.household_id}:${monthStr}`, { exists: true, status: p.status });
  }
  const noPlan: PlanStatus = { exists: false, status: null };
  const getPlan = (hid: string, month: string): PlanStatus => planMap.get(`${hid}:${month}`) || noPlan;

  // Determine which households need transaction data
  // (only those without a frozen current-month budget)
  const needTxnHouseholds = householdIds.filter((hid) => {
    const plan = getPlan(hid, today.month);
    return plan.status !== 'frozen';
  });

  // Query 2: transaction count + sum for current month (expenses only)
  let txnMap = new Map<string, { count: number; totalAmount: number }>();
  if (needTxnHouseholds.length > 0) {
    const startDate = `${today.month}-01`;
    const endDate = `${today.nextMonth}-01`;

    const { data: txnData } = await supabaseAdmin
      .from('transactions')
      .select('household_id, amount')
      .in('household_id', needTxnHouseholds)
      .eq('transaction_type', 'expense')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endDate);

    // Aggregate per household
    for (const t of txnData || []) {
      const existing = txnMap.get(t.household_id) || { count: 0, totalAmount: 0 };
      existing.count += 1;
      existing.totalAmount += Number(t.amount);
      txnMap.set(t.household_id, existing);
    }
  }

  const noTxns = { count: 0, totalAmount: 0 };

  // Build contexts
  return users.map((u) => ({
    userId: u.userId,
    householdId: u.householdId,
    slot,
    scheduleSlot,
    currentMonthPlan: getPlan(u.householdId, today.month),
    prevMonthPlan: getPlan(u.householdId, today.prevMonth),
    nextMonthPlan: getPlan(u.householdId, today.nextMonth),
    currentMonthTransactions: txnMap.get(u.householdId) || noTxns,
    today,
  }));
}
