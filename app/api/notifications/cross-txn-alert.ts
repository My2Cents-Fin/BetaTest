import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendPushToUser } from '../lib/delivery.js';

/**
 * Cross-transaction alert: when a household member logs a transaction,
 * notify all other household members with push subscriptions.
 *
 * POST /api/notifications/cross-txn-alert
 * Body: { userId, householdId, amount, subCategoryName, categoryName, transactionType }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, householdId, amount, subCategoryName, categoryName, transactionType } = req.body || {};

  if (!userId || !householdId || !amount) {
    return res.status(400).json({ error: 'userId, householdId, and amount are required' });
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

    // 3. Check which of those members have push subscriptions
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

    // 5. Build notification content
    const formattedAmount = `₹${Number(amount).toLocaleString('en-IN')}`;
    const category = subCategoryName || categoryName || 'uncategorized';
    const typeLabel = transactionType === 'income' ? 'income' : 'expense';

    const title = `${loggerName} logged an ${typeLabel}`;
    const body = `${loggerName} logged ${formattedAmount} under ${category}`;

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
        notification_subtype: `${transactionType}:${category}`,
        title,
        body,
        status: result.sent > 0 ? 'sent' : 'failed',
        message_data: {
          loggedBy: userId,
          loggerName,
          amount: Number(amount),
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
