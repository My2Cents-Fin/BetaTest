import { AUTH_CONFIG } from '../../config/app.config';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  value?: string;
}

// Indian mobile number: starts with 6-9, exactly 10 digits
const PHONE_REGEX = /^[6-9]\d{9}$/;

// Name: letters and spaces only (Unicode-aware for Indian names)
const NAME_REGEX = /^[\p{L}\s]+$/u;

// Household name regex removed - now allows any characters except blank/whitespace-only

/**
 * Validate Indian phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const digits = phone.replace(/\D/g, '');

  if (!digits) {
    return { valid: false, error: 'Please enter your phone number' };
  }

  if (digits.length !== 10) {
    return { valid: false, error: 'Phone number must be 10 digits' };
  }

  if (!PHONE_REGEX.test(digits)) {
    return { valid: false, error: 'Enter a valid Indian mobile number' };
  }

  return { valid: true, value: `${AUTH_CONFIG.defaultCountryCode}${digits}` };
}

/**
 * Format phone number for display: "98765 43210"
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 5) {
    return digits;
  }
  return `${digits.slice(0, 5)} ${digits.slice(5)}`;
}

/**
 * Validate display name (first name)
 */
export function validateName(name: string): ValidationResult {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return { valid: false, error: 'Please enter your name' };
  }

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Name must be 30 characters or less' };
  }

  if (!NAME_REGEX.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters and spaces' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate household name
 * Only validates: not blank, not whitespace-only
 * Allows any characters including numbers and special characters
 */
export function validateHouseholdName(name: string): ValidationResult {
  const trimmed = name.trim().replace(/\s+/g, ' ');

  if (!trimmed) {
    return { valid: false, error: 'Please enter a household name' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }

  return { valid: true, value: trimmed };
}

/**
 * Validate OTP (4 digits)
 */
export function validateOTP(otp: string): ValidationResult {
  const digits = otp.replace(/\D/g, '');

  if (digits.length !== 4) {
    return { valid: false, error: 'Please enter the complete code' };
  }

  return { valid: true, value: digits };
}

/**
 * Validate 6-digit MPIN
 * Rejects trivial PINs (all same digit, simple sequences)
 */
export function validatePin(pin: string): ValidationResult {
  const digits = pin.replace(/\D/g, '');

  if (digits.length !== 6) {
    return { valid: false, error: 'PIN must be 6 digits' };
  }

  // Reject all-same digit (000000, 111111, etc.)
  if (/^(\d)\1{5}$/.test(digits)) {
    return { valid: false, error: 'PIN cannot be all the same digit' };
  }

  // Reject simple sequences
  if (digits === '123456' || digits === '654321') {
    return { valid: false, error: 'PIN is too simple. Choose a stronger PIN.' };
  }

  return { valid: true, value: digits };
}

/**
 * Mask phone number for display: +919876543210 -> xxxxx 43210
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 5) {
    return 'xxxxx ' + digits.slice(-5);
  }
  return digits;
}
