import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

export type NotificationTrigger =
  | 'onboarding_complete'   // Just finished onboarding
  | 'budget_frozen'         // Just froze their monthly plan
  | 'no_txn_today'          // Opened app, has budget but 0 txns today
  | 'no_budget'             // Opened app, new month, no frozen plan
  | 'default';              // Fallback

const TRIGGER_COPY: Record<NotificationTrigger, { title: string; body: string }> = {
  onboarding_complete: {
    title: 'Enable notifications to get reminders!',
    body: "We'll nudge you to set up your budget and log expenses. No spam, promise.",
  },
  budget_frozen: {
    title: 'Nice! Want reminders to log daily expenses?',
    body: "We'll send gentle nudges so you don't forget to track spending.",
  },
  no_txn_today: {
    title: 'Want daily expense reminders?',
    body: "A quick nudge each day to keep your spending on track.",
  },
  no_budget: {
    title: 'Remind you to freeze your budget?',
    body: "We'll nudge you when it's time to set up your monthly plan.",
  },
  default: {
    title: 'Stay on top of your budget',
    body: 'Get gentle reminders to log expenses and plan your monthly budget. No spam, ever.',
  },
};

const DISMISS_KEY = 'my2cents_push_prompt_dismissed_at';
const DISMISS_DAYS = 7;

function isDismissed(): boolean {
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = parseInt(raw, 10);
  if (isNaN(dismissedAt)) return false;
  const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return daysSince < DISMISS_DAYS;
}

interface PushPermissionPromptProps {
  userId: string;
  householdId?: string;
  trigger?: NotificationTrigger;
}

export function PushPermissionPrompt({ userId, householdId, trigger = 'default' }: PushPermissionPromptProps) {
  const { isSupported, permissionState, isSubscribing, subscribe } = useNotifications();
  const [dismissed, setDismissed] = useState(() => isDismissed());

  // Don't show if: not supported, already subscribed, denied by browser, or temporarily dismissed
  if (!isSupported || permissionState === 'granted' || permissionState === 'denied' || dismissed) {
    return null;
  }

  const { title, body } = TRIGGER_COPY[trigger];

  const handleEnable = async () => {
    await subscribe(userId, householdId);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  };

  return (
    <div className="bg-primary-gradient rounded-2xl p-5 text-white relative mx-4 mb-4">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        <span className="text-3xl flex-shrink-0">🔔</span>
        <div className="flex-1 pr-4">
          <h3 className="text-base font-bold mb-1">{title}</h3>
          <p className="text-white/80 text-sm mb-3">
            {body}
          </p>
          <button
            onClick={handleEnable}
            disabled={isSubscribing}
            className="bg-white text-[var(--color-primary)] font-semibold text-sm px-4 py-2 rounded-xl hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {isSubscribing ? 'Enabling...' : 'Enable notifications'}
          </button>
        </div>
      </div>
    </div>
  );
}
