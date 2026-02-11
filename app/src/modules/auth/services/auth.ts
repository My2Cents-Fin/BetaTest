import { supabase } from '../../../lib/supabase';

export interface SendOTPResult {
  error?: string;
}

export interface VerifyOTPResult {
  success: boolean;
  error?: string;
  isNewUser?: boolean;
  userId?: string;
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phone: string): Promise<SendOTPResult> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        return { error: 'Too many attempts. Please try again later.' };
      }
      return { error: error.message };
    }

    return {};
  } catch (e) {
    console.error('sendOTP error:', e);
    return { error: 'Failed to send OTP. Please try again.' };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(phone: string, token: string): Promise<VerifyOTPResult> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error) {
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return { success: false, error: 'Incorrect code. Please try again.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Verification failed. Please try again.' };
    }

    // Check if user is new (hasn't completed onboarding)
    const isNewUser = !data.user.user_metadata?.onboarding_complete;

    return {
      success: true,
      isNewUser,
      userId: data.user.id,
    };
  } catch (e) {
    console.error('verifyOTP error:', e);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Mark onboarding as complete
 */
export async function markOnboardingComplete(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.updateUser({
      data: { onboarding_complete: true },
    });
    return !error;
  } catch {
    return false;
  }
}

export interface OnboardingStatus {
  hasDisplayName: boolean;
  hasHousehold: boolean;
  isOnboardingComplete: boolean;
  nextRoute: string;
}

/**
 * Get user's onboarding status to determine where to navigate
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    console.log('[getOnboardingStatus] User:', user);
    console.log('[getOnboardingStatus] User metadata:', user?.user_metadata);

    if (!user) {
      return {
        hasDisplayName: false,
        hasHousehold: false,
        isOnboardingComplete: false,
        nextRoute: '/login',
      };
    }

    // CHECK DATABASE FIRST - don't trust auth metadata (it persists after user deletion)
    // 1. Check if user exists in database
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', user.id)
      .single();

    const hasDisplayName = !!dbUser?.display_name;

    console.log('[getOnboardingStatus] DB User:', dbUser);
    console.log('[getOnboardingStatus] hasDisplayName:', hasDisplayName, '| value:', dbUser?.display_name);

    // 2. Check if user has a household
    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const hasHousehold = !!membership;

    console.log('[getOnboardingStatus] hasHousehold:', hasHousehold, '| membership:', membership);

    // 3. Onboarding is complete only if they have both display name AND household in DB
    const isOnboardingComplete = hasDisplayName && hasHousehold;

    console.log('[getOnboardingStatus] Final check - hasDisplayName:', hasDisplayName, 'hasHousehold:', hasHousehold, 'isOnboardingComplete:', isOnboardingComplete);

    // Determine next route - simplified flow (Name → Household → Dashboard)
    let nextRoute = '/dashboard';
    if (!hasDisplayName) {
      nextRoute = '/onboarding/name';
    } else if (!hasHousehold) {
      nextRoute = '/onboarding/household';
    }
    // If user has household, they go to dashboard (budget setup happens there now)

    console.log('[getOnboardingStatus] Navigating to:', nextRoute);

    return {
      hasDisplayName,
      hasHousehold,
      isOnboardingComplete,
      nextRoute,
    };
  } catch (e) {
    console.error('getOnboardingStatus error:', e);
    return {
      hasDisplayName: false,
      hasHousehold: false,
      isOnboardingComplete: false,
      nextRoute: '/onboarding/name',
    };
  }
}
