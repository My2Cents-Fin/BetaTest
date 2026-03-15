-- ============================================
-- 017: User Events (Analytics Tracking)
-- ============================================
-- Lightweight client-side event tracking table.
-- Events are INSERT-only from the client. Regular users cannot
-- SELECT their own rows — analytics queries run via service_role.

-- 1. Create table
CREATE TABLE IF NOT EXISTS user_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id  UUID REFERENCES households(id) ON DELETE SET NULL,
  event_name    TEXT NOT NULL,
  event_category TEXT NOT NULL,
  properties    JSONB NOT NULL DEFAULT '{}',
  session_id    TEXT,
  client_ts     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  platform      TEXT
);

-- 2. Indexes
CREATE INDEX idx_user_events_user_time      ON user_events (user_id, created_at DESC);
CREATE INDEX idx_user_events_event_time     ON user_events (event_name, created_at DESC);
CREATE INDEX idx_user_events_category_time  ON user_events (event_category, created_at DESC);
CREATE INDEX idx_user_events_household_time ON user_events (household_id, created_at DESC);
CREATE INDEX idx_user_events_session        ON user_events (session_id);
CREATE INDEX idx_user_events_properties     ON user_events USING GIN (properties);

-- 3. RLS
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Users can only INSERT their own events
CREATE POLICY "Users can insert own events"
  ON user_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No SELECT policy for regular users.
-- Analytics queries use service_role key which bypasses RLS.
