-- ============================================
-- COMPLETE SCHEMA MIGRATION FOR DEV DATABASE (FINAL VERSION)
-- This script is idempotent - safe to run multiple times
-- ============================================

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view users" ON public.users;
CREATE POLICY "Anyone can view users" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- 2. HOUSEHOLDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 1 for 8),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their household" ON public.households;
CREATE POLICY "Members can view their household" ON public.households
  FOR SELECT USING (
    id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert households" ON public.households;
CREATE POLICY "Users can insert households" ON public.households
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can update their household" ON public.households;
CREATE POLICY "Members can update their household" ON public.households
  FOR UPDATE USING (
    id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_households_invite_code
  ON public.households(invite_code);

-- ============================================
-- 3. HOUSEHOLD MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member', 'owner')),
  joined_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraints if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'household_members_household_id_user_id_key'
  ) THEN
    ALTER TABLE public.household_members ADD CONSTRAINT household_members_household_id_user_id_key UNIQUE(household_id, user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'household_members_user_id_key'
  ) THEN
    ALTER TABLE public.household_members ADD CONSTRAINT household_members_user_id_key UNIQUE(user_id);
  END IF;
END$$;

ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view household members" ON public.household_members;
CREATE POLICY "Members can view household members" ON public.household_members
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert themselves" ON public.household_members;
CREATE POLICY "Users can insert themselves" ON public.household_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_household_members_household_id
  ON public.household_members(household_id);

CREATE INDEX IF NOT EXISTS idx_household_members_user_id
  ON public.household_members(user_id);

-- ============================================
-- 4. CATEGORIES TABLE (System-defined)
-- ============================================
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  display_order INTEGER NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

-- ============================================
-- 5. SUB-CATEGORY TEMPLATES TABLE (System-defined)
-- ============================================
CREATE TABLE IF NOT EXISTS public.sub_category_templates (
  id TEXT PRIMARY KEY,
  category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_default_selected BOOLEAN DEFAULT false,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sub_category_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view sub_category_templates" ON public.sub_category_templates;
CREATE POLICY "Anyone can view sub_category_templates" ON public.sub_category_templates
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_sub_category_templates_category_id
  ON public.sub_category_templates(category_id);

-- ============================================
-- 6. HOUSEHOLD SUB-CATEGORIES TABLE (User selections)
-- ============================================
CREATE TABLE IF NOT EXISTS public.household_sub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  category_id TEXT REFERENCES public.categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT,
  is_custom BOOLEAN DEFAULT false,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.household_sub_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their household sub_categories" ON public.household_sub_categories;
CREATE POLICY "Members can view their household sub_categories" ON public.household_sub_categories
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert household sub_categories" ON public.household_sub_categories;
CREATE POLICY "Members can insert household sub_categories" ON public.household_sub_categories
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update household sub_categories" ON public.household_sub_categories;
CREATE POLICY "Members can update household sub_categories" ON public.household_sub_categories
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete household sub_categories" ON public.household_sub_categories;
CREATE POLICY "Members can delete household sub_categories" ON public.household_sub_categories
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_household_sub_categories_household_id
  ON public.household_sub_categories(household_id);

CREATE INDEX IF NOT EXISTS idx_household_sub_categories_category_id
  ON public.household_sub_categories(category_id);

-- ============================================
-- 7. MONTHLY PLANS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.monthly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  plan_month DATE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'frozen')),
  total_income NUMERIC(12,2) DEFAULT 0,
  total_allocated NUMERIC(12,2) DEFAULT 0,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'monthly_plans_household_id_plan_month_key'
  ) THEN
    ALTER TABLE public.monthly_plans ADD CONSTRAINT monthly_plans_household_id_plan_month_key UNIQUE(household_id, plan_month);
  END IF;
END$$;

ALTER TABLE public.monthly_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their monthly_plans" ON public.monthly_plans;
CREATE POLICY "Members can view their monthly_plans" ON public.monthly_plans
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert monthly_plans" ON public.monthly_plans;
CREATE POLICY "Members can insert monthly_plans" ON public.monthly_plans
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update monthly_plans" ON public.monthly_plans;
CREATE POLICY "Members can update monthly_plans" ON public.monthly_plans
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_monthly_plans_household_id
  ON public.monthly_plans(household_id);

CREATE INDEX IF NOT EXISTS idx_monthly_plans_plan_month
  ON public.monthly_plans(plan_month);

-- ============================================
-- 8. BUDGET ALLOCATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.budget_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.household_sub_categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly' CHECK (period IN ('monthly', 'quarterly', 'yearly', 'one-time')),
  monthly_amount NUMERIC(12,2) NOT NULL,
  plan_month DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'budget_allocations_household_id_sub_category_id_plan_month_key'
  ) THEN
    ALTER TABLE public.budget_allocations ADD CONSTRAINT budget_allocations_household_id_sub_category_id_plan_month_key UNIQUE(household_id, sub_category_id, plan_month);
  END IF;
END$$;

ALTER TABLE public.budget_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their budget_allocations" ON public.budget_allocations;
CREATE POLICY "Members can view their budget_allocations" ON public.budget_allocations
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert budget_allocations" ON public.budget_allocations;
CREATE POLICY "Members can insert budget_allocations" ON public.budget_allocations
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update budget_allocations" ON public.budget_allocations;
CREATE POLICY "Members can update budget_allocations" ON public.budget_allocations
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete budget_allocations" ON public.budget_allocations;
CREATE POLICY "Members can delete budget_allocations" ON public.budget_allocations
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_budget_allocations_household_id
  ON public.budget_allocations(household_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_sub_category_id
  ON public.budget_allocations(sub_category_id);

CREATE INDEX IF NOT EXISTS idx_budget_allocations_plan_month
  ON public.budget_allocations(plan_month);

-- ============================================
-- 9. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.household_sub_categories(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
  transaction_date DATE NOT NULL,
  payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'netbanking', 'other')),
  remarks TEXT,
  logged_by UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add transfer_to column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'transfer_to'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN transfer_to UUID REFERENCES public.users(id);
  END IF;
END$$;

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their transactions" ON public.transactions;
CREATE POLICY "Members can view their transactions" ON public.transactions
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can insert transactions" ON public.transactions;
CREATE POLICY "Members can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can update transactions" ON public.transactions;
CREATE POLICY "Members can update transactions" ON public.transactions
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can delete transactions" ON public.transactions;
CREATE POLICY "Members can delete transactions" ON public.transactions
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_transactions_household_id
  ON public.transactions(household_id);

CREATE INDEX IF NOT EXISTS idx_transactions_sub_category_id
  ON public.transactions(sub_category_id);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
  ON public.transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_transactions_logged_by
  ON public.transactions(logged_by);

-- Create transfer_to index only if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'transactions'
    AND column_name = 'transfer_to'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_transfer_to
      ON public.transactions(transfer_to)
      WHERE transfer_to IS NOT NULL;
  END IF;
END$$;

-- ============================================
-- SUCCESS! Schema is now ready.
-- Run this query to verify all tables exist:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- ============================================
