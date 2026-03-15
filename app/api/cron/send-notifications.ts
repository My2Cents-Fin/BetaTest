import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendPushToUser } from '../lib/delivery.js';
import { buildBudgetContexts } from '../lib/evaluators/context.js';
import { evaluateBudgetReminder } from '../lib/evaluators/budget-reminder.js';
import { buildExpenseContexts } from '../lib/evaluators/expense-context.js';
import { evaluateExpenseReminder } from '../lib/evaluators/expense-reminder.js';
import type { ScheduleSlot } from '../lib/messages/types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Determine schedule slot based on current IST time
  // Single hourly cron — only fire at notification windows: 10am, 3:30pm, 10pm IST
  const now = new Date();
  const istDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const istHour = istDate.getHours();
  const istMinute = istDate.getMinutes();

  // Define notification windows (IST hour + acceptable minute range)
  // Cron fires at :00 UTC each hour. IST = UTC+5:30, so:
  //   10:00 IST = 04:30 UTC → cron at 04:00 UTC fires at 09:30 IST, 05:00 UTC fires at 10:30 IST
  //   15:30 IST = 10:00 UTC → cron at 10:00 UTC fires at 15:30 IST ✓
  //   22:00 IST = 16:30 UTC → cron at 16:00 UTC fires at 21:30 IST, 17:00 UTC fires at 22:30 IST
  // We accept: hour 9-10 (morning), hour 15-16 (afternoon), hour 21-22 (night)
  const isNotificationWindow =
    (istHour === 9 || istHour === 10) ||   // morning: ~10am IST
    (istHour === 15 || istHour === 16) ||   // afternoon: ~3:30pm IST
    (istHour === 21 || istHour === 22);     // night: ~10pm IST

  if (!isNotificationWindow) {
    return res.status(200).json({
      message: 'Not a notification window',
      istTime: `${istHour}:${String(istMinute).padStart(2, '0')}`,
      nextWindows: '10am, 3:30pm, 10pm IST',
    });
  }

  const slot: ScheduleSlot = istHour <= 10 ? 'morning' : istHour <= 16 ? 'afternoon' : 'night';
  const today = now.toISOString().split('T')[0];
  const scheduleSlot = `${today}:${slot}`;

  try {
    // Get all users with active push subscriptions (include household_id)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('user_id, household_id')
      .order('user_id');

    if (subError || !subscriptions?.length) {
      return res.status(200).json({
        message: 'No subscribed users',
        slot: scheduleSlot,
      });
    }

    // Deduplicate to unique user+household pairs
    const userMap = new Map<string, string>();
    for (const s of subscriptions) {
      if (s.household_id && !userMap.has(s.user_id)) {
        userMap.set(s.user_id, s.household_id);
      }
    }
    const userIds = [...userMap.keys()];

    // Check notification preferences
    const { data: preferences } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, push_enabled, budget_reminders_enabled, expense_reminders_enabled')
      .in('user_id', userIds);

    const prefsMap = new Map(preferences?.map((p) => [p.user_id, p]) || []);

    // Filter to users who have push enabled (default: enabled if no preference row)
    const eligibleUsers = userIds.filter((uid) => {
      const pref = prefsMap.get(uid);
      return !pref || pref.push_enabled;
    });

    // ─── Budget Reminder Evaluator ───────────────────────────────
    const budgetEligible = eligibleUsers.filter((uid) => {
      const pref = prefsMap.get(uid);
      return !pref || pref.budget_reminders_enabled !== false;
    });

    const budgetUsers = budgetEligible
      .filter((uid) => userMap.has(uid))
      .map((uid) => ({ userId: uid, householdId: userMap.get(uid)! }));

    const budgetContexts = await buildBudgetContexts(budgetUsers, slot, scheduleSlot);

    let budgetSent = 0;
    let budgetSkipped = 0;
    let budgetFailed = 0;

    for (const ctx of budgetContexts) {
      try {
        const result = evaluateBudgetReminder(ctx);
        if (!result) {
          budgetSkipped++;
          continue;
        }

        // Log-before-send: insert as 'sent' first (dedup via unique index)
        const { error: logError } = await supabaseAdmin.from('notification_log').insert({
          user_id: ctx.userId,
          household_id: ctx.householdId,
          notification_type: result.notificationType,
          notification_subtype: result.subtype,
          title: result.message.title,
          body: result.message.body,
          status: 'sent',
          schedule_slot: ctx.scheduleSlot,
          message_data: result.messageData || null,
        });

        // Unique constraint violation = already sent this slot
        if (logError?.code === '23505') {
          budgetSkipped++;
          continue;
        }
        if (logError) {
          console.error(`Budget log insert error for ${ctx.userId}:`, logError.message);
          budgetFailed++;
          continue;
        }

        // Send the push notification
        const pushResult = await sendPushToUser(ctx.userId, {
          title: result.message.title,
          body: result.message.body,
          tag: result.message.tag,
          data: { url: result.message.url || '/dashboard?tab=budget' },
        });

        if (pushResult.sent > 0) {
          budgetSent++;
        } else {
          // Push failed — update log entry
          await supabaseAdmin
            .from('notification_log')
            .update({ status: 'failed' })
            .eq('user_id', ctx.userId)
            .eq('notification_type', result.notificationType)
            .eq('schedule_slot', ctx.scheduleSlot);
          budgetFailed++;
        }
      } catch (userErr) {
        console.error(`Budget evaluator error for ${ctx.userId}:`, userErr);
        budgetFailed++;
      }
    }

    // ─── Expense Logging Reminder Evaluator ─────────────────────
    const expenseEligible = eligibleUsers.filter((uid) => {
      const pref = prefsMap.get(uid);
      return !pref || pref.expense_reminders_enabled !== false;
    });

    const expenseUsers = expenseEligible
      .filter((uid) => userMap.has(uid))
      .map((uid) => ({ userId: uid, householdId: userMap.get(uid)! }));

    const expenseContexts = await buildExpenseContexts(expenseUsers, slot, scheduleSlot);

    let expenseSent = 0;
    let expenseSkipped = 0;
    let expenseFailed = 0;

    for (const ctx of expenseContexts) {
      try {
        const result = evaluateExpenseReminder(ctx);
        if (!result) {
          expenseSkipped++;
          continue;
        }

        // Log-before-send dedup
        const { error: logError } = await supabaseAdmin.from('notification_log').insert({
          user_id: ctx.userId,
          household_id: ctx.householdId,
          notification_type: result.notificationType,
          notification_subtype: result.subtype,
          title: result.message.title,
          body: result.message.body,
          status: 'sent',
          schedule_slot: ctx.scheduleSlot,
          message_data: result.messageData || null,
        });

        if (logError?.code === '23505') {
          expenseSkipped++;
          continue;
        }
        if (logError) {
          console.error(`Expense log insert error for ${ctx.userId}:`, logError.message);
          expenseFailed++;
          continue;
        }

        const pushResult = await sendPushToUser(ctx.userId, {
          title: result.message.title,
          body: result.message.body,
          tag: result.message.tag,
          data: { url: result.message.url || '/dashboard' },
        });

        if (pushResult.sent > 0) {
          expenseSent++;
        } else {
          await supabaseAdmin
            .from('notification_log')
            .update({ status: 'failed' })
            .eq('user_id', ctx.userId)
            .eq('notification_type', result.notificationType)
            .eq('schedule_slot', ctx.scheduleSlot);
          expenseFailed++;
        }
      } catch (userErr) {
        console.error(`Expense evaluator error for ${ctx.userId}:`, userErr);
        expenseFailed++;
      }
    }

    const results = {
      slot: scheduleSlot,
      subscribedUsers: userIds.length,
      eligibleUsers: eligibleUsers.length,
      budgetReminders: {
        evaluated: budgetContexts.length,
        sent: budgetSent,
        skipped: budgetSkipped,
        failed: budgetFailed,
      },
      expenseReminders: {
        evaluated: expenseContexts.length,
        sent: expenseSent,
        skipped: expenseSkipped,
        failed: expenseFailed,
      },
    };

    console.log('Cron notification run:', JSON.stringify(results));

    return res.status(200).json(results);
  } catch (err) {
    console.error('Cron handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
