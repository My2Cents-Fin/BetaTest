import { supabase } from '../../../lib/supabase';
import { AUTH_CONFIG } from '../../../config/app.config';

// ============================================
// Types
// ============================================

export interface CheckPhoneResult {
  exists: boolean;
  error?: string;
}

export interface SignUpResult {
  success: boolean;
  error?: string;
  userId?: string;
}

export interface SignInResult {
  success: boolean;
  error?: string;
  userId?: string;
}

export interface ResetPinResult {
  success: boolean;
  error?: string;
}

export interface OnboardingStatus {
  hasDisplayName: boolean;
  hasHousehold: boolean;
  isOnboardingComplete: boolean;
  nextRoute: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Convert phone number to email identifier for Supabase auth
 * e.g. "+918130944414" -> "918130944414@my2cents.app"
 */
export function phoneToEmail(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `${digits}@${AUTH_CONFIG.emailDomain}`;
}

// ============================================
// Auth Functions
// ============================================

/**
 * Check if a phone number is already registered
 */
export async function checkPhoneExists(phone: string): Promise<CheckPhoneResult> {
  try {
    const email = phoneToEmail(phone);
    const { data, error } = await supabase.rpc('check_phone_registered', {
      p_phone_email: email,
    });

    if (error) {
      console.error('checkPhoneExists error:', error);
      return { exists: false, error: 'Failed to check phone number. Please try again.' };
    }

    return { exists: !!data };
  } catch (e) {
    console.error('checkPhoneExists error:', e);
    return { exists: false, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Sign up a new user with phone + PIN
 */
export async function signUpWithPin(phone: string, pin: string): Promise<SignUpResult> {
  try {
    const email = phoneToEmail(phone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pin,
      options: {
        data: {
          phone_number: phone,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        return { success: false, error: 'This phone number is already registered. Please log in instead.' };
      }
      if (error.message.includes('rate limit')) {
        return { success: false, error: 'Too many attempts. Please try again later.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Sign up failed. Please try again.' };
    }

    // Insert user_pins row for phone-exists lookups
    const { error: pinError } = await supabase.from('user_pins').insert({
      user_id: data.user.id,
      phone_email: email,
      pin_hash: 'managed_by_supabase_auth',
    });

    if (pinError) {
      console.error('user_pins insert error:', pinError);
      // Non-fatal: auth account created, user can proceed
    }

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (e) {
    console.error('signUpWithPin error:', e);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Sign in an existing user with phone + PIN
 */
export async function signInWithPin(phone: string, pin: string): Promise<SignInResult> {
  try {
    const email = phoneToEmail(phone);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pin,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { success: false, error: 'Incorrect PIN. Please try again.' };
      }
      if (error.message.includes('rate limit')) {
        return { success: false, error: 'Too many attempts. Please try again later.' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'Login failed. Please try again.' };
    }

    return {
      success: true,
      userId: data.user.id,
    };
  } catch (e) {
    console.error('signInWithPin error:', e);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Reset PIN for an existing user (no verification required)
 */
export async function resetPin(phone: string, newPin: string): Promise<ResetPinResult> {
  try {
    const email = phoneToEmail(phone);

    const { data, error } = await supabase.rpc('reset_user_pin', {
      p_phone_email: email,
      p_new_pin: newPin,
    });

    if (error) {
      console.error('resetPin RPC error:', error);
      return { success: false, error: 'Failed to reset PIN. Please try again.' };
    }

    const result = data as { success: boolean; error?: string };

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to reset PIN.' };
    }

    return { success: true };
  } catch (e) {
    console.error('resetPin error:', e);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

// ============================================
// Session & User Functions
// ============================================

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

/**
 * Get user's onboarding status to determine where to navigate
 */
export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        hasDisplayName: false,
        hasHousehold: false,
        isOnboardingComplete: false,
        nextRoute: '/login',
      };
    }

    // CHECK DATABASE FIRST - don't trust auth metadata
    const { data: dbUser } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('id', user.id)
      .single();

    const hasDisplayName = !!dbUser?.display_name;

    const { data: membership } = await supabase
      .from('household_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const hasHousehold = !!membership;
    const isOnboardingComplete = hasDisplayName && hasHousehold;

    let nextRoute = '/dashboard';
    if (!hasDisplayName) {
      nextRoute = '/onboarding/name';
    } else if (!hasHousehold) {
      nextRoute = '/onboarding/household';
    }

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
