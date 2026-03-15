-- Migration: Add 'cc_payment' transaction type
-- Purpose: Separate CC bill payments from fund transfers
-- cc_payment: Bank → CC company. Decreases bank balance, decreases CC outstanding. No budget impact.

-- 1. Update CHECK constraint on transaction_type to include 'cc_payment'
ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_transaction_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_transaction_type_check
  CHECK (transaction_type IN ('expense', 'income', 'transfer', 'cc_payment'));
