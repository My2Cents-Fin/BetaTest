import webpush from 'web-push';
import { supabaseAdmin } from './supabaseAdmin.js';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@my2cents.app';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, string>;
}

interface Subscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
}

const MAX_FAILURES = 3;

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth, failure_count')
    .eq('user_id', userId);

  if (error || !subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions as Subscription[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );

      // Reset failure count and update last successful push
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ failure_count: 0, last_successful_push: new Date().toISOString() })
        .eq('id', sub.id);

      sent++;
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number }).statusCode;

      if (statusCode === 404 || statusCode === 410) {
        // Subscription expired or unsubscribed — remove it
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        // Increment failure count, remove if too many failures
        const newCount = sub.failure_count + 1;
        if (newCount >= MAX_FAILURES) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          await supabaseAdmin
            .from('push_subscriptions')
            .update({ failure_count: newCount })
            .eq('id', sub.id);
        }
      }
      failed++;
    }
  }

  return { sent, failed };
}
