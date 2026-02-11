-- Enforce that one user can belong to only one household
-- This ensures one phone number = one household

-- First, check if there are any users in multiple households
-- (This query is for informational purposes - run it separately if needed)
-- SELECT user_id, COUNT(DISTINCT household_id) as household_count
-- FROM public.household_members
-- GROUP BY user_id
-- HAVING COUNT(DISTINCT household_id) > 1;

-- Add unique constraint on user_id to ensure one user = one household
ALTER TABLE public.household_members
ADD CONSTRAINT household_members_user_id_unique UNIQUE (user_id);

-- Note: If the above fails, it means there are users in multiple households.
-- You'll need to clean up the data first before applying this constraint.
