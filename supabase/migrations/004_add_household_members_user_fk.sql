-- Add foreign key constraint from household_members to users table
-- This allows Supabase PostgREST to perform joins in queries

-- First, check if the constraint already exists and drop it if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'household_members_user_id_fkey'
    ) THEN
        ALTER TABLE public.household_members
        DROP CONSTRAINT household_members_user_id_fkey;
    END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.household_members
ADD CONSTRAINT household_members_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;

-- Create an index on user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_household_members_user_id
ON public.household_members(user_id);
