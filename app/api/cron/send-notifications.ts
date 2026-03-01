import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import { sendPushToUser } from '../lib/delivery.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Determine schedule slot based on current IST time
  const now = new Date();
  const istHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
  const slot = istHour < 12 ? 'morning' : 'evening';
  const today = now.toISOString().split('T')[0];
  const scheduleSlot = `${today}:${slot}`;

  try {
    // Get all users with active push subscriptions who have push enabled
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('user_id')
      .order('user_id');

    if (subError || !subscriptions?.length) {
      return res.status(200).json({
        message: 'No subscribed users',
        slot: scheduleSlot,
      });
    }

    // Deduplicate user IDs
    const userIds = [...new Set(subscriptions.map((s) => s.user_id))];

    // Check notification preferences
    const { data: preferences } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, push_enabled')
      .in('user_id', userIds);

    const prefsMap = new Map(preferences?.map((p) => [p.user_id, p]) || []);

    // Filter to users who have push enabled (default: enabled if no preference row)
    const eligibleUsers = userIds.filter((uid) => {
      const pref = prefsMap.get(uid);
      return !pref || pref.push_enabled;
    });

    // Phase 1: No evaluators yet — log and return
    // In Phase 2+, this is where budget/expense evaluators will run
    const results = {
      slot: scheduleSlot,
      subscribedUsers: userIds.length,
      eligibleUsers: eligibleUsers.length,
      evaluators: 'none configured yet — Phase 1 foundation only',
      sent: 0,
      failed: 0,
    };

    console.log('Cron notification run:', results);

    return res.status(200).json(results);
  } catch (err) {
    console.error('Cron handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
