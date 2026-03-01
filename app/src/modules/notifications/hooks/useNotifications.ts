import { useState, useEffect, useCallback } from 'react';
import {
  isPushSupported,
  getPushPermissionState,
  subscribeToPush,
  unsubscribeFromPush,
} from '../services/pushSubscription';

interface UseNotificationsReturn {
  isSupported: boolean;
  permissionState: PermissionState | null;
  isSubscribing: boolean;
  subscribe: (userId: string, householdId?: string) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  refreshState: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [isSupported] = useState(() => isPushSupported());
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const refreshState = useCallback(async () => {
    const state = await getPushPermissionState();
    setPermissionState(state);
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const subscribe = useCallback(async (userId: string, householdId?: string) => {
    setIsSubscribing(true);
    try {
      const success = await subscribeToPush(userId, householdId);
      if (success) {
        setPermissionState('granted');
      }
      return success;
    } finally {
      setIsSubscribing(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    const success = await unsubscribeFromPush();
    if (success) {
      setPermissionState('prompt');
    }
    return success;
  }, []);

  return {
    isSupported,
    permissionState,
    isSubscribing,
    subscribe,
    unsubscribe,
    refreshState,
  };
}
