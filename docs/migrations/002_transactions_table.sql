-- ============================================
-- My2Cents Transactions Table Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- Transactions Table (Daily expense/income records)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID REFERENCES public.households(id) ON DELETE CASCADE,
  sub_category_id UUID REFERENCES public.household_sub_categories(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('expense', 'income', 'transfer')),
  transaction_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'netbanking', 'other')),
  remarks TEXT,
  logged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Household members can view their transactions
CREATE POLICY "Members can view transactions" ON public.transactions
  FOR SELECT USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can insert transactions
CREATE POLICY "Members can insert transactions" ON public.transactions
  FOR INSERT WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
  );

-- Household members can update their own transactions
CREATE POLICY "Members can update own transactions" ON public.transactions
  FOR UPDATE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
    AND logged_by = auth.uid()
  );

-- Household members can delete their own transactions
CREATE POLICY "Members can delete own transactions" ON public.transactions
  FOR DELETE USING (
    household_id IN (
      SELECT household_id FROM public.household_members WHERE user_id = auth.uid()
    )
    AND logged_by = auth.uid()
  );

-- ============================================
-- Indexes for Performance
-- ============================================

-- Fast lookup by household
CREATE INDEX idx_transactions_household_id
  ON public.transactions(household_id);

-- Fast lookup by sub-category
CREATE INDEX idx_transactions_sub_category_id
  ON public.transactions(sub_category_id);

-- Fast lookup by date (for date range queries)
CREATE INDEX idx_transactions_date
  ON public.transactions(transaction_date);

-- Fast lookup by household and date (most common query)
CREATE INDEX idx_transactions_household_date
  ON public.transactions(household_id, transaction_date DESC);

-- Fast lookup by who logged
CREATE INDEX idx_transactions_logged_by
  ON public.transactions(logged_by);

-- ============================================
-- Done! Transactions table created.
-- ============================================
