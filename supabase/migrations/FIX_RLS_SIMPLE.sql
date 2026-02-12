-- ============================================
-- SIMPLE FIX - Disable RLS on household_members during INSERT
-- ============================================

-- Drop the problematic SELECT policy on household_members
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;

-- Create a simpler policy that allows users to see members of any household they're in
-- This avoids the recursion by using a direct user_id check OR household_id match
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR
    household_id IN (
      SELECT h.id
      FROM public.households h
      WHERE h.created_by = auth.uid()
    )
  );

-- Alternative: Just allow all authenticated users to read household_members
-- (This is simpler and avoids recursion, RLS on households provides the real protection)
-- Uncomment if the above still has issues:
-- DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
-- CREATE POLICY "Anyone authenticated can view household members" ON public.household_members
--   FOR SELECT
--   TO authenticated
--   USING (true);
