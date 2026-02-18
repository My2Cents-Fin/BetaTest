-- ============================================
-- Migration 010: User PINs (MPIN-based auth)
-- Replaces OTP-based login with 6-digit MPIN
-- ============================================

-- Enable pgcrypto (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. user_pins table
-- ============================================
CREATE TABLE public.user_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_email TEXT NOT NULL UNIQUE,  -- e.g. '918130944414@my2cents.app'
  pin_hash TEXT NOT NULL DEFAULT 'managed_by_supabase_auth',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_pins_phone_email ON public.user_pins(phone_email);
CREATE INDEX idx_user_pins_user_id ON public.user_pins(user_id);

-- RLS
ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pin" ON public.user_pins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own pin" ON public.user_pins
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pin" ON public.user_pins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 2. RPC: check_phone_registered
--    Callable by anonymous users (for login flow)
-- ============================================
CREATE OR REPLACE FUNCTION public.check_phone_registered(p_phone_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.user_pins WHERE phone_email = p_phone_email
  );
$$;

-- ============================================
-- 3. RPC: reset_user_pin
--    Callable by anonymous users (for reset flow)
--    Updates auth.users password + user_pins row
-- ============================================
CREATE OR REPLACE FUNCTION public.reset_user_pin(
  p_phone_email TEXT,
  p_new_pin TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_user_id UUID;
  v_hashed_password TEXT;
BEGIN
  -- Validate PIN format
  IF length(p_new_pin) != 6 OR p_new_pin !~ '^\d{6}$' THEN
    RETURN json_build_object('success', false, 'error', 'PIN must be exactly 6 digits');
  END IF;

  -- Find user
  SELECT user_id INTO v_user_id
  FROM public.user_pins
  WHERE phone_email = p_phone_email;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Phone number not registered');
  END IF;

  -- Hash the new PIN (bcrypt, same as Supabase uses)
  v_hashed_password := crypt(p_new_pin, gen_salt('bf'));

  -- Update auth.users password
  UPDATE auth.users
  SET encrypted_password = v_hashed_password,
      updated_at = now()
  WHERE id = v_user_id;

  -- Update user_pins table
  UPDATE public.user_pins
  SET pin_hash = v_hashed_password,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================
-- 4. Migrate existing OTP users to email/password auth
--    Preserves same user_id (no FK breakage)
--    Sets temporary PIN 000000 — users must reset
-- ============================================
DO $$
DECLARE
  r RECORD;
  v_phone_email TEXT;
  v_hashed_password TEXT;
BEGIN
  -- Hash the temporary PIN
  v_hashed_password := crypt('000000', gen_salt('bf'));

  FOR r IN SELECT id, phone, raw_user_meta_data FROM auth.users WHERE phone IS NOT NULL
  LOOP
    -- Derive email from phone: +918130944414 -> 918130944414@my2cents.app
    v_phone_email := replace(r.phone, '+', '') || '@my2cents.app';

    -- Add email + password to existing auth record
    UPDATE auth.users
    SET
      email = v_phone_email,
      encrypted_password = v_hashed_password,
      raw_user_meta_data = COALESCE(r.raw_user_meta_data, '{}'::jsonb) ||
        jsonb_build_object('phone_number', r.phone),
      updated_at = now()
    WHERE id = r.id;

    -- Create user_pins entry
    INSERT INTO public.user_pins (user_id, phone_email, pin_hash)
    VALUES (r.id, v_phone_email, v_hashed_password)
    ON CONFLICT (phone_email) DO NOTHING;
  END LOOP;
END;
$$;
