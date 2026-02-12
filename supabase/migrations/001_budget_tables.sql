-- ============================================
-- My2Cents Budget Tables Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Categories Table (System-defined, read-only for users)
-- Defines the main budget category types
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  display_order INT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Everyone can read categories (system data)
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- 2. Sub-Category Templates Table (System-defined suggestions)
-- Pre-defined sub-categories that users can select from
CREATE TABLE public.sub_category_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_default_selected BOOLEAN DEFAULT false,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sub_category_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read templates (system data)
CREATE POLICY "Anyone can view sub-category templates" ON public.sub_category_templates
  FOR SELECT USING (true);

-- 3. Household Sub-Categories Table (User's selected sub-categories)
-- Links households to their chosen sub-categories
CREATE TABLE public.household_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id),
  name TEXT NOT NULL,
  icon TEXT,
  is_custom BOOLEAN DEFAULT false,
  display_order INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.household_sub_categories ENABLE ROW LEVEL SECURITY;

-- Household members can view their sub-categories
CREATE POLICY "Members can view household sub-categories" ON public.household_sub_categories
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can insert sub-categories
CREATE POLICY "Members can insert household sub-categories" ON public.household_sub_categories
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can update sub-categories
CREATE POLICY "Members can update household sub-categories" ON public.household_sub_categories
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can delete sub-categories
CREATE POLICY "Members can delete household sub-categories" ON public.household_sub_categories
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- 4. Budget Allocations Table (Amounts per sub-category per month)
CREATE TABLE public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.household_sub_categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('monthly', 'quarterly', 'yearly', 'one-time')),
  monthly_amount DECIMAL(12,2) NOT NULL,
  plan_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sub_category_id, plan_month)
);

-- Enable RLS
ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;

-- Household members can view their allocations
CREATE POLICY "Members can view budget allocations" ON public.budget_allocations
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can insert allocations
CREATE POLICY "Members can insert budget allocations" ON public.budget_allocations
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can update allocations
CREATE POLICY "Members can update budget allocations" ON public.budget_allocations
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can delete allocations
CREATE POLICY "Members can delete budget allocations" ON public.budget_allocations
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- 5. Monthly Plans Table (Plan status per month)
CREATE TABLE public.monthly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  plan_month DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'frozen')),
  total_income DECIMAL(12,2) DEFAULT 0,
  total_allocated DECIMAL(12,2) DEFAULT 0,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, plan_month)
);

-- Enable RLS
ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

-- Household members can view their plans
CREATE POLICY "Members can view monthly plans" ON public.monthly_plans
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can insert plans
CREATE POLICY "Members can insert monthly plans" ON public.monthly_plans
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can update plans
CREATE POLICY "Members can update monthly plans" ON public.monthly_plans
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- Indexes for Performance
-- ============================================

-- Fast lookup of household sub-categories
CREATE INDEX idx_household_sub_categories_household_id
  ON public.household_sub_categories(household_id);

-- Fast lookup by category
CREATE INDEX idx_household_sub_categories_category_id
  ON public.household_sub_categories(category_id);

-- Fast lookup of allocations by household
CREATE INDEX idx_budget_allocations_household_id
  ON public.budget_allocations(household_id);

-- Fast lookup of allocations by sub-category
CREATE INDEX idx_budget_allocations_sub_category_id
  ON public.budget_allocations(sub_category_id);

-- Fast lookup of allocations by month
CREATE INDEX idx_budget_allocations_plan_month
  ON public.budget_allocations(plan_month);

-- Fast lookup of monthly plans
CREATE INDEX idx_monthly_plans_household_month
  ON public.monthly_plans(household_id, plan_month);

-- ============================================
-- Seed Data: Categories
-- ============================================

INSERT INTO public.categories (name, type, display_order, icon) VALUES
  ('Income', 'income', 1, '💰'),
  ('EMI', 'expense', 2, '🏦'),
  ('Insurance', 'expense', 3, '🛡️'),
  ('Savings', 'expense', 4, '🐷'),
  ('Fixed', 'expense', 5, '📌'),
  ('Variable', 'expense', 6, '🔄'),
  ('Family', 'expense', 7, '👨‍👩‍👧‍👦'),
  ('Investment', 'expense', 8, '📈'),
  ('One-time', 'expense', 9, '📅');

-- ============================================
-- Seed Data: Sub-Category Templates
-- ============================================

-- Income Sub-Categories
INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Salary', '💼', true, 1 FROM public.categories WHERE name = 'Income';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Business Income', '🏪', false, 2 FROM public.categories WHERE name = 'Income';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Rental Income', '🏠', false, 3 FROM public.categories WHERE name = 'Income';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Freelance', '💻', false, 4 FROM public.categories WHERE name = 'Income';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Investments', '📈', false, 5 FROM public.categories WHERE name = 'Income';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Other Income', '➕', false, 6 FROM public.categories WHERE name = 'Income';

-- EMI Sub-Categories
INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Home Loan EMI', '🏠', false, 1 FROM public.categories WHERE name = 'EMI';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Car Loan EMI', '🚗', false, 2 FROM public.categories WHERE name = 'EMI';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Education Loan', '🎓', false, 3 FROM public.categories WHERE name = 'EMI';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Personal Loan', '💳', false, 4 FROM public.categories WHERE name = 'EMI';

-- Insurance Sub-Categories
INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Health Insurance', '🏥', false, 1 FROM public.categories WHERE name = 'Insurance';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Life Insurance', '❤️', false, 2 FROM public.categories WHERE name = 'Insurance';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Vehicle Insurance', '🚙', false, 3 FROM public.categories WHERE name = 'Insurance';

-- Savings Sub-Categories
INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'General Savings', '💰', true, 1 FROM public.categories WHERE name = 'Savings';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Emergency Fund', '🆘', false, 2 FROM public.categories WHERE name = 'Savings';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Investment/SIP', '📊', false, 3 FROM public.categories WHERE name = 'Savings';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Vacation Fund', '✈️', false, 4 FROM public.categories WHERE name = 'Savings';

-- Fixed Expense Sub-Categories
INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Rent', '🏠', true, 1 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Electricity', '⚡', true, 2 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Water', '💧', false, 3 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Gas', '🔥', false, 4 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Internet', '📶', true, 5 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Phone Bill', '📱', true, 6 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Maid/Help', '🧹', false, 7 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Society Maintenance', '🏢', false, 8 FROM public.categories WHERE name = 'Fixed';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Subscriptions', '📺', false, 9 FROM public.categories WHERE name = 'Fixed';

-- Variable Expense Sub-Categories
INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Groceries', '🛒', true, 1 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Fuel', '⛽', false, 2 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Food Ordering', '🍕', true, 3 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Dining Out', '🍽️', false, 4 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Shopping', '🛍️', false, 5 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Entertainment', '🎬', false, 6 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Personal Care', '💅', false, 7 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Medical', '💊', false, 8 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Transport', '🚌', false, 9 FROM public.categories WHERE name = 'Variable';

INSERT INTO public.sub_category_templates (category_id, name, icon, is_default_selected, display_order)
SELECT id, 'Miscellaneous', '📦', true, 10 FROM public.categories WHERE name = 'Variable';

-- One-time Expense Sub-Categories (empty by default - users add their own)
-- No default templates for one-time expenses

-- ============================================
-- Done! Tables and seed data created.
-- ============================================
