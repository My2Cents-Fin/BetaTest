-- ============================================
-- DELETE USER ACCOUNT — DPDPA Right to Erasure
-- ============================================
-- Safely deletes a user's account and all their personal data.
-- Handles household ownership transfer to prevent data loss for
-- other household members.
--
-- Logic:
--   1. If user owns a household AND other members exist → transfer ownership
--   2. If user owns a household AND is sole member → delete the household
--   3. If user is a non-owner member → just remove membership
--   4. Delete user's personal data (users table, user_pins)
--   5. Nullify references in transactions and activity_log
--   6. Delete the auth.users record (cascades to public.users)
-- ============================================

CREATE OR REPLACE FUNCTION delete_user_account(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_household_id UUID;
  v_role TEXT;
  v_member_count INT;
  v_next_member_id UUID;
BEGIN
  -- Verify the calling user matches the target (prevent deleting other users)
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'You can only delete your own account.');
  END IF;

  -- Find user's household membership
  SELECT household_id, role INTO v_household_id, v_role
  FROM public.household_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_household_id IS NOT NULL THEN
    -- Count other members in the household
    SELECT COUNT(*) INTO v_member_count
    FROM public.household_members
    WHERE household_id = v_household_id AND user_id != p_user_id;

    IF v_role = 'owner' AND v_member_count > 0 THEN
      -- Transfer ownership to the next member
      SELECT user_id INTO v_next_member_id
      FROM public.household_members
      WHERE household_id = v_household_id AND user_id != p_user_id
      ORDER BY joined_at ASC
      LIMIT 1;

      -- Promote next member to owner
      UPDATE public.household_members
      SET role = 'owner'
      WHERE household_id = v_household_id AND user_id = v_next_member_id;

      -- Transfer household created_by
      UPDATE public.households
      SET created_by = v_next_member_id
      WHERE id = v_household_id;

      -- Remove the deleting user from the household
      DELETE FROM public.household_members
      WHERE household_id = v_household_id AND user_id = p_user_id;

    ELSIF v_member_count = 0 THEN
      -- Sole member — delete the entire household (cascades to plans, allocations, sub-categories, transactions)
      DELETE FROM public.households WHERE id = v_household_id;

    ELSE
      -- Non-owner member — just remove membership
      DELETE FROM public.household_members
      WHERE household_id = v_household_id AND user_id = p_user_id;
    END IF;
  END IF;

  -- Nullify user references in transactions (preserve transaction records for other household members)
  UPDATE public.transactions SET logged_by = NULL WHERE logged_by = p_user_id;

  -- transfer_to column may not exist yet (migration 003)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'transfer_to') THEN
    EXECUTE 'UPDATE public.transactions SET transfer_to = NULL WHERE transfer_to = $1' USING p_user_id;
  END IF;

  -- activity_log table may not exist yet (migration 009)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log') THEN
    UPDATE public.activity_log SET user_id = NULL, user_name = '[deleted]', user_phone = NULL WHERE user_id = p_user_id;
  END IF;

  -- user_pins table may not exist yet (migration 010)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_pins') THEN
    DELETE FROM public.user_pins WHERE user_id = p_user_id;
  END IF;

  -- Delete from public.users
  DELETE FROM public.users WHERE id = p_user_id;

  -- Delete from auth.users (this is the definitive deletion)
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
