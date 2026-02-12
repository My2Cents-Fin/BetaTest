-- ============================================
-- ADD: Family and Investment expense categories
-- ============================================
-- Adds two new expense categories to the system:
-- 1. Family (for family-related expenses)
-- 2. Investment (for investment allocations)

-- Add Family category (if not exists)
INSERT INTO public.categories (name, type, display_order, icon)
SELECT 'Family', 'expense', 7, '👨‍👩‍👧‍👦'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Family'
);

-- Add Investment category (if not exists)
INSERT INTO public.categories (name, type, display_order, icon)
SELECT 'Investment', 'expense', 8, '📈'
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE name = 'Investment'
);

-- Update One-time category display order to 9
UPDATE public.categories
SET display_order = 9
WHERE name = 'One-time' AND display_order = 7;

-- ============================================
-- DONE! Family and Investment categories added
-- ============================================
