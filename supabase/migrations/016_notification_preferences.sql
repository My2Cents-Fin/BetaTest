-- User notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  release_updates_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  expense_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  budget_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quiet_start TIME NOT NULL DEFAULT '22:00',   -- 10pm IST
  quiet_end TIME NOT NULL DEFAULT '08:00',     -- 8am IST
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: users can manage their own preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);
