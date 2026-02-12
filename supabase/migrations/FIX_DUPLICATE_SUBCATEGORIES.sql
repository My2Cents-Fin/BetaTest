-- ============================================
-- FIX: Prevent duplicate sub-categories
-- ============================================

-- First, clean up any existing duplicates
-- This finds duplicate sub-categories (same household + name) and keeps only the oldest one

WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY household_id, LOWER(name)
      ORDER BY created_at ASC
    ) as row_num
  FROM public.household_sub_categories
)
DELETE FROM public.household_sub_categories
WHERE id IN (
  SELECT id FROM duplicates WHERE row_num > 1
);

-- Add unique constraint to prevent future duplicates
-- Note: We use LOWER(name) to make it case-insensitive
-- But PostgreSQL doesn't support expressions in unique constraints directly,
-- so we create a unique index instead

DROP INDEX IF EXISTS idx_household_subcategories_unique_name;

CREATE UNIQUE INDEX idx_household_subcategories_unique_name
ON public.household_sub_categories (household_id, LOWER(name));

-- ============================================
-- DONE! Now duplicate sub-categories are prevented
-- ============================================
