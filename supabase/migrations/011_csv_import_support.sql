-- ============================================
-- My2Cents: Statement Import Support
-- Adds source tracking and original narration to transactions
-- Run this in Supabase SQL Editor
-- ============================================

-- Add source tracking column (manual vs csv_import)
ALTER TABLE public.transactions
ADD COLUMN source TEXT NOT NULL DEFAULT 'manual'
CHECK (source IN ('manual', 'csv_import'));

-- Add original narration from bank statement
ALTER TABLE public.transactions
ADD COLUMN original_narration TEXT;

-- Add transfer_to column if not exists (for fund transfers)
-- (This may already exist from earlier migrations; safe to skip if so)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'transfer_to'
  ) THEN
    ALTER TABLE public.transactions
    ADD COLUMN transfer_to UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Index for quickly finding imported transactions
CREATE INDEX idx_transactions_source
  ON public.transactions(source)
  WHERE source = 'csv_import';

-- Index for finding uncategorized transactions (null sub_category_id, non-transfers)
CREATE INDEX idx_transactions_uncategorized
  ON public.transactions(household_id, transaction_date)
  WHERE sub_category_id IS NULL AND transaction_type != 'transfer';

-- ============================================
-- Done! Statement import columns added.
-- ============================================
