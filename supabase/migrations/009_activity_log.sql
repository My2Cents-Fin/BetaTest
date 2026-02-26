-- ============================================
-- ACTIVITY LOG + TELEGRAM ALERTS — Beta Usage Tracking
-- ============================================
-- Tracks key user events and sends Telegram notifications:
--   • Account created (new user sign-up)
--   • Household created / joined
--   • Budget frozen
--   • Transaction added
--
-- View in Supabase Table Editor → activity_log (sort by created_at DESC)
-- Telegram alerts sent via pg_net extension (async HTTP POST)
-- ============================================

-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- 1. Activity Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_phone TEXT,
  household_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_event_type ON public.activity_log(event_type);

-- ============================================
-- 2. Telegram Send Helper
-- ============================================
-- Centralized function to send Telegram messages via pg_net
CREATE OR REPLACE FUNCTION send_telegram_alert(message TEXT)
RETURNS void AS $$
BEGIN
  PERFORM net.http_post(
    url := 'https://api.telegram.org/bot8435603827:AAFUo9Qlfr-Xop8Pjn4Ys93tUYvy7gia1x0/sendMessage',
    body := jsonb_build_object(
      'chat_id', 1234104942,
      'text', message,
      'parse_mode', 'HTML'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Trigger: Account Created
-- ============================================
CREATE OR REPLACE FUNCTION log_account_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.activity_log (event_type, user_id, user_name, user_phone, details)
  VALUES (
    'account_created',
    NEW.id,
    NEW.display_name,
    NEW.phone,
    jsonb_build_object('display_name', NEW.display_name, 'phone', NEW.phone)
  );

  PERFORM send_telegram_alert(
    '🆕 <b>New Account Created</b>' || chr(10) ||
    '👤 ' || COALESCE(NEW.display_name, 'Unknown') || chr(10) ||
    '📱 ' || COALESCE(NEW.phone, 'N/A')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_account_created
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION log_account_created();

-- ============================================
-- 4. Trigger: Household Created
-- ============================================
CREATE OR REPLACE FUNCTION log_household_created()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_phone TEXT;
BEGIN
  SELECT display_name, phone INTO v_user_name, v_user_phone
  FROM public.users WHERE id = NEW.created_by;

  INSERT INTO public.activity_log (event_type, user_id, user_name, user_phone, household_name, details)
  VALUES (
    'household_created',
    NEW.created_by,
    v_user_name,
    v_user_phone,
    NEW.name,
    jsonb_build_object('household_name', NEW.name, 'invite_code', NEW.invite_code)
  );

  PERFORM send_telegram_alert(
    '🏠 <b>Household Created</b>' || chr(10) ||
    '👤 ' || COALESCE(v_user_name, 'Unknown') || chr(10) ||
    '🏷️ ' || NEW.name || chr(10) ||
    '🔑 Invite: ' || NEW.invite_code
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_household_created
  AFTER INSERT ON public.households
  FOR EACH ROW
  EXECUTE FUNCTION log_household_created();

-- ============================================
-- 5. Trigger: Household Joined
-- ============================================
CREATE OR REPLACE FUNCTION log_household_joined()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_phone TEXT;
  v_household_name TEXT;
BEGIN
  IF NEW.role = 'member' THEN
    SELECT display_name, phone INTO v_user_name, v_user_phone
    FROM public.users WHERE id = NEW.user_id;

    SELECT name INTO v_household_name
    FROM public.households WHERE id = NEW.household_id;

    INSERT INTO public.activity_log (event_type, user_id, user_name, user_phone, household_name, details)
    VALUES (
      'household_joined',
      NEW.user_id,
      v_user_name,
      v_user_phone,
      v_household_name,
      jsonb_build_object('household_name', v_household_name, 'role', NEW.role)
    );

    PERFORM send_telegram_alert(
      '👥 <b>Member Joined Household</b>' || chr(10) ||
      '👤 ' || COALESCE(v_user_name, 'Unknown') || chr(10) ||
      '🏠 ' || COALESCE(v_household_name, 'Unknown')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_household_joined
  AFTER INSERT ON public.household_members
  FOR EACH ROW
  EXECUTE FUNCTION log_household_joined();

-- ============================================
-- 6. Trigger: Budget Frozen
-- ============================================
CREATE OR REPLACE FUNCTION log_budget_frozen()
RETURNS TRIGGER AS $$
DECLARE
  v_household_name TEXT;
  v_user_name TEXT;
  v_user_phone TEXT;
  v_frozen_by UUID;
BEGIN
  IF NEW.status = 'frozen' AND (OLD.status IS NULL OR OLD.status != 'frozen') THEN
    SELECT name INTO v_household_name
    FROM public.households WHERE id = NEW.household_id;

    SELECT h.created_by INTO v_frozen_by
    FROM public.households h WHERE h.id = NEW.household_id;

    SELECT display_name, phone INTO v_user_name, v_user_phone
    FROM public.users WHERE id = v_frozen_by;

    INSERT INTO public.activity_log (event_type, user_id, user_name, user_phone, household_name, details)
    VALUES (
      'budget_frozen',
      v_frozen_by,
      v_user_name,
      v_user_phone,
      v_household_name,
      jsonb_build_object(
        'plan_month', NEW.plan_month,
        'total_income', NEW.total_income,
        'total_allocated', NEW.total_allocated
      )
    );

    PERFORM send_telegram_alert(
      '🧊 <b>Budget Frozen!</b>' || chr(10) ||
      '🏠 ' || COALESCE(v_household_name, 'Unknown') || chr(10) ||
      '👤 ' || COALESCE(v_user_name, 'Unknown') || chr(10) ||
      '📅 ' || NEW.plan_month || chr(10) ||
      '💰 Income: ₹' || COALESCE(NEW.total_income::text, '0') || chr(10) ||
      '📊 Allocated: ₹' || COALESCE(NEW.total_allocated::text, '0')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_budget_frozen
  AFTER UPDATE ON public.monthly_plans
  FOR EACH ROW
  EXECUTE FUNCTION log_budget_frozen();

CREATE TRIGGER trg_log_budget_frozen_insert
  AFTER INSERT ON public.monthly_plans
  FOR EACH ROW
  WHEN (NEW.status = 'frozen')
  EXECUTE FUNCTION log_budget_frozen();

-- ============================================
-- 7. Trigger: Transaction Added
-- ============================================
CREATE OR REPLACE FUNCTION log_transaction_added()
RETURNS TRIGGER AS $$
DECLARE
  v_user_name TEXT;
  v_user_phone TEXT;
  v_household_name TEXT;
  v_sub_cat_name TEXT;
  v_emoji TEXT;
BEGIN
  SELECT display_name, phone INTO v_user_name, v_user_phone
  FROM public.users WHERE id = NEW.logged_by;

  SELECT name INTO v_household_name
  FROM public.households WHERE id = NEW.household_id;

  IF NEW.sub_category_id IS NOT NULL THEN
    SELECT name INTO v_sub_cat_name
    FROM public.household_sub_categories WHERE id = NEW.sub_category_id;
  ELSE
    v_sub_cat_name := 'Fund Transfer';
  END IF;

  -- Pick emoji based on transaction type
  IF NEW.transaction_type = 'income' THEN v_emoji := '💰';
  ELSIF NEW.transaction_type = 'transfer' THEN v_emoji := '🔄';
  ELSE v_emoji := '💸';
  END IF;

  INSERT INTO public.activity_log (event_type, user_id, user_name, user_phone, household_name, details)
  VALUES (
    'transaction_added',
    NEW.logged_by,
    v_user_name,
    v_user_phone,
    v_household_name,
    jsonb_build_object(
      'amount', NEW.amount,
      'type', NEW.transaction_type,
      'sub_category', v_sub_cat_name,
      'payment_method', NEW.payment_method,
      'remarks', COALESCE(NEW.remarks, '')
    )
  );

  PERFORM send_telegram_alert(
    v_emoji || ' <b>Transaction: ' || initcap(NEW.transaction_type) || '</b>' || chr(10) ||
    '🏠 ' || COALESCE(v_household_name, 'Unknown') || chr(10) ||
    '👤 ' || COALESCE(v_user_name, 'Unknown') || chr(10) ||
    '🏷️ ' || COALESCE(v_sub_cat_name, 'N/A') || chr(10) ||
    '₹ ' || NEW.amount::text || ' via ' || NEW.payment_method || chr(10) ||
    CASE WHEN NEW.remarks IS NOT NULL AND NEW.remarks != ''
      THEN '📝 ' || NEW.remarks
      ELSE ''
    END
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_log_transaction_added
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_transaction_added();
