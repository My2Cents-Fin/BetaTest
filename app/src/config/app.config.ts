/**
 * App Configuration
 *
 * Central configuration for app-wide settings and feature flags.
 * These settings control which features are enabled/disabled.
 *
 * To modify settings, update the values below and restart the dev server.
 */

// ============================================
// Authentication Settings
// ============================================

export type LoginMethod = 'phone_otp' | 'email_otp' | 'google';

export const AUTH_CONFIG = {
  /**
   * Enabled login methods
   * Options: 'phone_otp', 'email_otp', 'google'
   * Multiple can be enabled - UI will show options accordingly
   */
  loginMethods: ['phone_otp'] as LoginMethod[],

  /**
   * Default country code for phone input
   */
  defaultCountryCode: '+91',

  /**
   * Country flag emoji for phone input
   */
  countryFlag: '🇮🇳',
} as const;

// ============================================
// Invite Settings
// ============================================

export type InviteMode = 'code_only' | 'qr_enabled';

export const INVITE_CONFIG = {
  /**
   * Invite mode
   * - 'code_only': Only show human-readable invite code
   * - 'qr_enabled': Show both code and QR code (requires HTTPS for scanning)
   */
  mode: 'code_only' as InviteMode,
} as const;

// ============================================
// Display Settings
// ============================================

export const DISPLAY_CONFIG = {
  /**
   * Currency symbol shown throughout the app
   */
  currencySymbol: '₹',

  /**
   * ISO 4217 currency code
   */
  currencyCode: 'INR',

  /**
   * Date format used across the app
   */
  dateFormat: 'DD/MM/YYYY',
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Check if a specific login method is enabled
 */
export function isLoginMethodEnabled(method: LoginMethod): boolean {
  return AUTH_CONFIG.loginMethods.includes(method);
}

/**
 * Check if QR code features should be shown
 * QR is only shown if:
 * 1. Invite mode is 'qr_enabled'
 * 2. App is running on HTTPS (secure context required for camera)
 */
export function isQREnabled(): boolean {
  return INVITE_CONFIG.mode === 'qr_enabled' && window.location.protocol === 'https:';
}

/**
 * Check if QR scanning is available (for joining households)
 * Requires HTTPS and mobile device
 */
export function isQRScanningAvailable(): boolean {
  if (!isQREnabled()) return false;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);

  return isMobile && window.isSecureContext;
}
