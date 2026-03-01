import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseAdmin } from './lib/supabaseAdmin.js';
import { sendPushToUser } from './lib/delivery.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }

  try {
    // Check if welcome notification was already sent
    const { data: existing } = await supabaseAdmin
      .from('notification_log')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', 'welcome')
      .eq('status', 'sent')
      .limit(1);

    if (existing?.length) {
      return res.status(200).json({ message: 'Welcome already sent', skipped: true });
    }

    // Send welcome notification
    const payload = {
      title: 'You\'re all set!',
      body: 'Notifications are live! You\'ll get budget reminders and spending nudges from My2cents.',
      tag: 'welcome',
      data: { url: '/' },
    };

    const result = await sendPushToUser(userId, payload);

    // Log the notification
    if (result.sent > 0) {
      await supabaseAdmin.from('notification_log').insert({
        user_id: userId,
        notification_type: 'welcome',
        title: payload.title,
        body: payload.body,
        status: 'sent',
      });
    }

    return res.status(200).json({ sent: result.sent });
  } catch (err) {
    console.error('Welcome notification error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
