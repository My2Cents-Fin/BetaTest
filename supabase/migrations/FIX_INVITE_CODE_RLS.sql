-- ============================================
-- FIX: Allow viewing households for invite code joining
-- ============================================
-- This matches the policy that exists in PROD but was missing from migrations

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view households" ON public.households;
DROP POLICY IF EXISTS "Anyone can view household by invite code" ON public.households;

-- Add policy: Allow anyone to SELECT households
-- This is needed for the join flow where users need to verify invite codes
-- before becoming members
-- Note: This is a PERMISSIVE policy that works alongside the member-only policy
CREATE POLICY "Anyone can view households" ON public.households
  FOR SELECT
  USING (true);

-- Note: With RLS, having multiple SELECT policies means ANY of them can grant access
-- So users can see households either:
-- 1. If they are members (via "Members can view their household" policy), OR
-- 2. For invite code lookup (via this "Anyone can view households" policy)

-- ============================================
-- DONE! Now users can join households with invite codes
-- ============================================
