import { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface PushPermissionPromptProps {
  userId: string;
  householdId?: string;
}

export function PushPermissionPrompt({ userId, householdId }: PushPermissionPromptProps) {
  const { isSupported, permissionState, isSubscribing, subscribe } = useNotifications();
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('my2cents_push_prompt_dismissed') === 'true';
  });

  // Don't show if: not supported, already subscribed, denied by browser, or dismissed
  if (!isSupported || permissionState === 'granted' || permissionState === 'denied' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    await subscribe(userId, householdId);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('my2cents_push_prompt_dismissed', 'true');
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
          <h3 className="text-base font-bold mb-1">Stay on top of your budget</h3>
          <p className="text-white/80 text-sm mb-3">
            Get gentle reminders to log expenses and plan your monthly budget. No spam, ever.
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
