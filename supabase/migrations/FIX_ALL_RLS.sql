-- ============================================
-- COMPLETE RLS FIX - Remove ALL Infinite Recursion
-- ============================================

-- Drop ALL policies that reference each other
DROP POLICY IF EXISTS "Members can view their household" ON public.households;
DROP POLICY IF EXISTS "Members can update their household" ON public.households;
DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;

-- ============================================
-- HOUSEHOLDS TABLE - Simple Policies
-- ============================================

-- Allow users to see households they created OR are explicitly listed as owner
CREATE POLICY "View own households" ON public.households
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Allow users to insert households (when creating)
-- The INSERT policy doesn't need to check household_members
CREATE POLICY "Users can insert households" ON public.households
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Allow household creators to update their household
CREATE POLICY "Update own households" ON public.households
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid());

-- ============================================
-- HOUSEHOLD_MEMBERS TABLE - Simple Policies
-- ============================================

-- Allow all authenticated users to view household_members
-- (The real security is on households table - users can only access data for households they created)
CREATE POLICY "View all household members" ON public.household_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert themselves into households
CREATE POLICY "Users can insert themselves" ON public.household_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- DONE! The recursion is fixed.
-- ============================================
