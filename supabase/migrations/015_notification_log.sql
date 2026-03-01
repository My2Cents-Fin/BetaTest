-- Notification delivery log (for dedup + audit)
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id UUID REFERENCES households(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL,       -- 'budget_reminder', 'expense_reminder', 'release_update'
  notification_subtype TEXT,             -- e.g. 'phase_1', 'track_b', 'morning'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',   -- 'sent', 'failed', 'skipped'
  schedule_slot TEXT,                    -- format: 'YYYY-MM-DD:morning' or 'YYYY-MM-DD:evening' for dedup
  message_data JSONB,                   -- extra context (phase, amounts, etc.)
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dedup index: one notification per user per type per schedule slot
CREATE UNIQUE INDEX idx_notification_log_dedup
  ON notification_log(user_id, notification_type, schedule_slot)
  WHERE schedule_slot IS NOT NULL AND status = 'sent';

-- Query by user for history
CREATE INDEX idx_notification_log_user ON notification_log(user_id, created_at DESC);

-- RLS: users can see their own notifications, writes happen via service_role
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification history"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);
