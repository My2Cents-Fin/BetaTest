-- Migration: Create household_cards table and add card_id to transactions
-- Purpose: Credit card management feature

-- 1. Create household_cards table
CREATE TABLE IF NOT EXISTS household_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  card_name text NOT NULL,
  last_four_digits text NOT NULL CHECK (length(last_four_digits) = 4 AND last_four_digits ~ '^\d{4}$'),
  card_owner text,
  issuer text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Unique constraint: prevent duplicate cards per household
ALTER TABLE household_cards
  ADD CONSTRAINT uq_household_card UNIQUE (household_id, last_four_digits, card_name);

-- 3. Index on household_id for tenant-scoped queries
CREATE INDEX idx_household_cards_household ON household_cards(household_id);

-- 4. RLS policies
ALTER TABLE household_cards ENABLE ROW LEVEL SECURITY;

-- SELECT: household members can view all cards
CREATE POLICY "Household members can view cards"
  ON household_cards FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: household members can add cards
CREATE POLICY "Household members can add cards"
  ON household_cards FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE: household members can update cards (toggle active/inactive)
CREATE POLICY "Household members can update cards"
  ON household_cards FOR UPDATE
  USING (
    household_id IN (
      SELECT household_id FROM household_members
      WHERE user_id = auth.uid()
    )
  );

-- No DELETE policy — cards are never deleted, only deactivated

-- 5. Add card_id column to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES household_cards(id);

-- 6. Index on card_id for CC dues queries
CREATE INDEX idx_transactions_card_id ON transactions(card_id) WHERE card_id IS NOT NULL;
