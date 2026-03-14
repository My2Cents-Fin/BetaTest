import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendPushToUser } from '../lib/delivery.js';

/**
 * Cross-transaction alert: when a household member creates, edits, or deletes
 * a transaction, notify all other household members with push subscriptions.
 *
 * POST /api/notifications/cross-txn-alert
 * Body: {
 *   action: 'create' | 'update' | 'delete',
 *   userId,
 *   householdId,
 *   amount,
 *   subCategoryName?,
 *   categoryName?,
 *   transactionType?,   // 'expense' | 'income' | 'transfer'
 *   oldAmount?,         // for updates — show what changed
 * }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    action = 'create',
    userId,
    householdId,
    amount,
    subCategoryName,
    categoryName,
    transactionType,
    oldAmount,
  } = req.body || {};

  if (!userId || !householdId) {
    return res.status(400).json({ error: 'userId and householdId are required' });
  }

  try {
    // 1. Get the logger's display name
    const { data: loggerUser } = await supabaseAdmin
      .from('users')
      .select('display_name')
      .eq('id', userId)
      .single();

    const loggerName = loggerUser?.display_name || 'Someone';

    // 2. Get other household members (exclude the logger)
    const { data: members } = await supabaseAdmin
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)
      .neq('user_id', userId);

    if (!members?.length) {
      return res.status(200).json({ message: 'No other household members', sent: 0 });
    }

    const otherUserIds = members.map((m) => m.user_id);

    // 3. Check which members have push subscriptions
    const { data: subscriptions } = await supabaseAdmin
      .from('push_subscriptions')
      .select('user_id')
      .in('user_id', otherUserIds);

    if (!subscriptions?.length) {
      return res.status(200).json({ message: 'No subscribed household members', sent: 0 });
    }

    const subscribedUserIds = [...new Set(subscriptions.map((s) => s.user_id))];

    // 4. Check notification preferences (push_enabled)
    const { data: preferences } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', subscribedUserIds);

    const prefsMap = new Map(preferences?.map((p) => [p.user_id, p]) || []);
    const eligibleUsers = subscribedUserIds.filter((uid) => {
      const pref = prefsMap.get(uid);
      return !pref || pref.push_enabled;
    });

    if (!eligibleUsers.length) {
      return res.status(200).json({ message: 'No eligible members', sent: 0 });
    }

    // 5. Build notification content based on action
    const formattedAmount = amount ? `₹${Number(amount).toLocaleString('en-IN')}` : '';
    const category = subCategoryName || categoryName || '';
    const typeLabel = transactionType === 'income' ? 'income' : transactionType === 'transfer' ? 'transfer' : 'expense';

    let title: string;
    let body: string;

    switch (action) {
      case 'update': {
        title = `${loggerName} updated a transaction`;
        const oldFormatted = oldAmount ? `₹${Number(oldAmount).toLocaleString('en-IN')}` : '';
        if (oldFormatted && formattedAmount && oldAmount !== amount) {
          body = category
            ? `${loggerName} updated ${oldFormatted} → ${formattedAmount} under ${category}`
            : `${loggerName} updated ${oldFormatted} → ${formattedAmount}`;
        } else {
          body = category
            ? `${loggerName} updated a transaction under ${category}`
            : `${loggerName} updated a transaction of ${formattedAmount}`;
        }
        break;
      }
      case 'delete': {
        title = `${loggerName} deleted a transaction`;
        body = category
          ? `${loggerName} deleted ${formattedAmount} under ${category}`
          : `${loggerName} deleted a transaction of ${formattedAmount}`;
        break;
      }
      default: {
        // create
        if (transactionType === 'transfer') {
          title = `${loggerName} logged a fund transfer`;
          body = `${loggerName} transferred ${formattedAmount}`;
        } else {
          title = `${loggerName} logged an ${typeLabel}`;
          body = category
            ? `${loggerName} logged ${formattedAmount} under ${category}`
            : `${loggerName} logged ${formattedAmount}`;
        }
        break;
      }
    }

    const payload = {
      title,
      body,
      tag: `cross-txn-${userId}-${Date.now()}`,
      data: { url: '/dashboard' },
    };

    // 6. Send push to all eligible household members
    let totalSent = 0;
    let totalFailed = 0;

    for (const targetUserId of eligibleUsers) {
      const result = await sendPushToUser(targetUserId, payload);
      totalSent += result.sent;
      totalFailed += result.failed;

      // Log the notification
      await supabaseAdmin.from('notification_log').insert({
        user_id: targetUserId,
        household_id: householdId,
        notification_type: 'cross_txn_alert',
        notification_subtype: `${action}:${typeLabel}`,
        title,
        body,
        status: result.sent > 0 ? 'sent' : 'failed',
        message_data: {
          action,
          loggedBy: userId,
          loggerName,
          amount: amount ? Number(amount) : null,
          oldAmount: oldAmount ? Number(oldAmount) : null,
          subCategoryName,
          categoryName,
          transactionType,
        },
      });
    }

    return res.status(200).json({ sent: totalSent, failed: totalFailed });
  } catch (err) {
    console.error('Cross-txn alert error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
