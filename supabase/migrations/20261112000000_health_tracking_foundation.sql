-- ==============================================================================
-- LOCALFIT STAGE 9.1 MIGRATION: Health Tracking Foundation
-- ==============================================================================
-- Additive tables for Weight, Water, and Sleep tracking with strict RLS,
-- timestamps, indexes, validation constraints, and profile goal extensions.
--
-- Tables:
--   1. public.weight_logs
--   2. public.water_logs
--   3. public.sleep_logs
--
-- Alterations:
--   4. public.profiles (daily_water_goal_ml, daily_sleep_goal_minutes)
-- ==============================================================================

-- 1. Create Weight Logs Table
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,2) NOT NULL CHECK (weight_kg >= 20.0 AND weight_kg <= 400.0),
  logged_date DATE NOT NULL,
  notes TEXT NULL CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Water Logs Table
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  intake_date DATE NOT NULL,
  amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 10000),
  notes TEXT NULL CHECK (notes IS NULL OR length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Sleep Logs Table
CREATE TABLE IF NOT EXISTS public.sleep_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sleep_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes >= 30 AND duration_minutes <= 1440),
  bedtime TIMESTAMPTZ NULL,
  wake_time TIMESTAMPTZ NULL,
  sleep_quality TEXT NULL CHECK (sleep_quality IS NULL OR sleep_quality IN ('poor', 'fair', 'good', 'excellent')),
  notes TEXT NULL CHECK (notes IS NULL OR length(notes) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sleep_logs_wake_and_duration_bounds CHECK (
    (bedtime IS NULL OR wake_time IS NULL) OR (
      wake_time > bedtime AND
      duration_minutes > 0 AND
      duration_minutes <= (EXTRACT(EPOCH FROM (wake_time - bedtime)) / 60) + 2
    )
  )
);

-- 4. Extend Profiles with Health Goal Columns (Strictly Nullable, No Fabricated Defaults)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_water_goal_ml INTEGER NULL CHECK (
    daily_water_goal_ml IS NULL OR (daily_water_goal_ml >= 500 AND daily_water_goal_ml <= 10000)
  ),
  ADD COLUMN IF NOT EXISTS daily_sleep_goal_minutes INTEGER NULL CHECK (
    daily_sleep_goal_minutes IS NULL OR (daily_sleep_goal_minutes >= 180 AND daily_sleep_goal_minutes <= 1000)
  );

-- 5. Query Indexes for High-Performance Time-Series Retrieval
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs (user_id, logged_date DESC);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date ON public.water_logs (user_id, intake_date DESC);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON public.sleep_logs (user_id, sleep_date DESC);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies: public.weight_logs
DROP POLICY IF EXISTS "Users can view own weight logs" ON public.weight_logs;
CREATE POLICY "Users can view own weight logs"
  ON public.weight_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own weight logs" ON public.weight_logs;
CREATE POLICY "Users can insert own weight logs"
  ON public.weight_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own weight logs" ON public.weight_logs;
CREATE POLICY "Users can update own weight logs"
  ON public.weight_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own weight logs" ON public.weight_logs;
CREATE POLICY "Users can delete own weight logs"
  ON public.weight_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. RLS Policies: public.water_logs
DROP POLICY IF EXISTS "Users can view own water logs" ON public.water_logs;
CREATE POLICY "Users can view own water logs"
  ON public.water_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own water logs" ON public.water_logs;
CREATE POLICY "Users can insert own water logs"
  ON public.water_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own water logs" ON public.water_logs;
CREATE POLICY "Users can update own water logs"
  ON public.water_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own water logs" ON public.water_logs;
CREATE POLICY "Users can delete own water logs"
  ON public.water_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 9. RLS Policies: public.sleep_logs
DROP POLICY IF EXISTS "Users can view own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can view own sleep logs"
  ON public.sleep_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can insert own sleep logs"
  ON public.sleep_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can update own sleep logs"
  ON public.sleep_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can delete own sleep logs"
  ON public.sleep_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 10. Automatic updated_at Triggers
DROP TRIGGER IF EXISTS on_weight_logs_updated_at ON public.weight_logs;
CREATE TRIGGER on_weight_logs_updated_at
  BEFORE UPDATE ON public.weight_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_water_logs_updated_at ON public.water_logs;
CREATE TRIGGER on_water_logs_updated_at
  BEFORE UPDATE ON public.water_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sleep_logs_updated_at ON public.sleep_logs;
CREATE TRIGGER on_sleep_logs_updated_at
  BEFORE UPDATE ON public.sleep_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 11. Explicit Role Privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.water_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sleep_logs TO authenticated;

REVOKE ALL ON public.weight_logs FROM anon;
REVOKE ALL ON public.water_logs FROM anon;
REVOKE ALL ON public.sleep_logs FROM anon;
