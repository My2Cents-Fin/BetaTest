-- ============================================
-- FIX ROLE CONSTRAINT - Allow 'owner' role
-- ============================================

-- Drop the existing constraint that only allows 'admin' and 'member'
ALTER TABLE public.household_members
DROP CONSTRAINT IF EXISTS household_members_role_check;

-- Add new constraint that includes 'owner'
ALTER TABLE public.household_members
ADD CONSTRAINT household_members_role_check
CHECK (role IN ('owner', 'admin', 'member'));

-- ============================================
-- DONE! Now household creation should work
-- ============================================
