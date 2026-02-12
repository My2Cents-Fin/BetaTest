-- ============================================
-- MIGRATE: Move Electricity and Water from Fixed to Variable
-- ============================================
-- This migration moves utility sub-categories from Fixed to Variable category
-- for all existing households, matching the new onboarding template.
--
-- What this does:
-- 1. Finds all sub-categories named "Electricity" or "Water" under Fixed category
-- 2. Updates their category_id from 'fixed' to 'variable'
-- 3. All associated transactions, allocations, and budgets automatically follow
--    (they reference sub_category_id, not category_id directly)
--
-- Safe to run multiple times - only affects items that are currently under Fixed

-- Update Electricity from Fixed to Variable
UPDATE public.household_sub_categories
SET category_id = 'variable'
WHERE category_id = 'fixed'
  AND (
    LOWER(name) = 'electricity'
    OR LOWER(name) = 'electric'
    OR LOWER(name) = 'power'
  );

-- Update Water from Fixed to Variable
UPDATE public.household_sub_categories
SET category_id = 'variable'
WHERE category_id = 'fixed'
  AND (
    LOWER(name) = 'water'
    OR LOWER(name) = 'water bill'
  );

-- ============================================
-- DONE! Utilities are now under Variable expenses
-- ============================================
-- Note: Users will see Electricity and Water appear under Variable category
-- immediately after this migration runs. All their historical data (transactions,
-- allocations, budgets) remains intact and continues to work.
