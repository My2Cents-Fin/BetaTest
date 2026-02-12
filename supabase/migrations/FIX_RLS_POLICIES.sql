-- ============================================
-- FIX RLS POLICIES - Remove Infinite Recursion
-- Run this on DEV database
-- ============================================

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Members can view their household" ON public.households;
DROP POLICY IF EXISTS "Members can update their household" ON public.households;
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;

-- ============================================
-- HOUSEHOLDS TABLE - Fixed Policies
-- ============================================

-- Allow authenticated users to view households they're a member of
-- Use a subquery that doesn't cause recursion
CREATE POLICY "Members can view their household" ON public.households
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members
      WHERE household_members.household_id = households.id
        AND household_members.user_id = auth.uid()
    )
  );

-- Allow household members to update their household details
CREATE POLICY "Members can update their household" ON public.households
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.household_members
      WHERE household_members.household_id = households.id
        AND household_members.user_id = auth.uid()
    )
  );

-- ============================================
-- HOUSEHOLD_MEMBERS TABLE - Fixed Policies
-- ============================================

-- Allow users to view members of households they belong to
-- This policy MUST NOT reference household_members in the USING clause
-- to avoid infinite recursion
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT
  TO authenticated
  USING (
    household_id IN (
      SELECT hm.household_id
      FROM public.household_members hm
      WHERE hm.user_id = auth.uid()
    )
  );

-- ============================================
-- Alternative approach: Disable RLS temporarily for testing
-- Uncomment these lines ONLY if the above doesn't work
-- ============================================

-- ALTER TABLE public.households DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.household_members DISABLE ROW LEVEL SECURITY;

-- ============================================
-- DONE! Try creating a household again
-- ============================================
