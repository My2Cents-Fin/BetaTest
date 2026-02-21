-- ============================================
-- CONSENT TRACKING — DPDPA 2023 Compliance
-- ============================================
-- Tracks user consent for privacy policy and terms of service.
-- Required under India's Digital Personal Data Protection Act (DPDPA) 2023.
-- Compliance deadline: May 13, 2027.
--
-- What this migration adds:
--   • consent_accepted (boolean) — whether user accepted terms + privacy policy
--   • consent_accepted_at (timestamptz) — when they accepted
--   • consent_version (text) — which version they accepted (for future policy updates)
-- ============================================

-- Add consent columns to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS consent_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS consent_version TEXT;
