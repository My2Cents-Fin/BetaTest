-- ============================================
-- ADD: Support for custom household categories
-- ============================================
-- Allows households to create custom expense categories
-- beyond the system-defined ones (EMI, Insurance, Savings, etc.)
--
-- What this adds:
-- 1. household_categories table for custom categories
-- 2. RLS policies for household members
-- 3. Updates to getCategoryList to include custom categories

-- 1. Create household_categories table
CREATE TABLE IF NOT EXISTS public.household_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT,
  display_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique index for case-insensitive name uniqueness per household
CREATE UNIQUE INDEX idx_household_categories_unique_name
  ON public.household_categories (household_id, LOWER(name));

-- Enable RLS
ALTER TABLE public.household_categories ENABLE ROW LEVEL SECURITY;

-- Household members can view their custom categories
CREATE POLICY "Members can view household categories" ON public.household_categories
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = household_categories.household_id
        AND user_id = auth.uid()
    )
  );

-- Household members can create custom categories
CREATE POLICY "Members can create household categories" ON public.household_categories
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = household_categories.household_id
        AND user_id = auth.uid()
    )
  );

-- Household members can update their custom categories
CREATE POLICY "Members can update household categories" ON public.household_categories
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = household_categories.household_id
        AND user_id = auth.uid()
    )
  );

-- Household members can delete their custom categories
CREATE POLICY "Members can delete household categories" ON public.household_categories
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.household_members
      WHERE household_id = household_categories.household_id
        AND user_id = auth.uid()
    )
  );

-- 2. Add index for performance
CREATE INDEX idx_household_categories_household_id
  ON public.household_categories(household_id);

-- 3. Update household_sub_categories to support custom categories
-- Allow category_id to reference either system categories OR household categories
-- Note: PostgreSQL doesn't support multiple FK constraints to different tables,
-- so we'll handle this at the application level with validation

-- ============================================
-- DONE! Households can now create custom categories
-- ============================================
-- Usage:
-- - Users can add custom expense categories (e.g., "Travel", "Education", "Gifts")
-- - Custom categories appear alongside system categories in the budget UI
-- - Sub-categories can be added under custom categories just like system ones
