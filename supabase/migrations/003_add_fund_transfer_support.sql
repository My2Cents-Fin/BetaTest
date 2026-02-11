-- Add support for fund transfers
-- This migration adds the transfer_to column to track fund transfer recipients

-- Add transfer_to column to transactions table
ALTER TABLE public.transactions
ADD COLUMN transfer_to UUID REFERENCES public.users(id);

-- Add comment
COMMENT ON COLUMN public.transactions.transfer_to IS 'User ID of fund transfer recipient (only populated for transfer type transactions)';

-- Add index for querying transfers by recipient
CREATE INDEX idx_transactions_transfer_to
  ON public.transactions(transfer_to)
  WHERE transfer_to IS NOT NULL;
