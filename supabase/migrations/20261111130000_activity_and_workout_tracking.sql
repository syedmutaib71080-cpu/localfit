-- ==============================================================================
-- LOCALFIT STAGE 8 MIGRATION: Activity & Fitness Tracking
-- ==============================================================================
-- Workouts (Walking, Running, Cycling), GPS routes, and Daily Step Logging
-- Strict Row Level Security (RLS) and Duplicate Prevention via session_token

-- 1. Create Activity Workouts Table
CREATE TABLE IF NOT EXISTS public.activity_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token UUID NOT NULL UNIQUE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('walking', 'running', 'cycling')),
  start_time TIMESTAMPTZ NOT NULL,
  finish_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 5 AND duration_seconds <= 86400),
  distance_meters NUMERIC NOT NULL CHECK (distance_meters >= 0 AND distance_meters <= 500000),
  avg_pace_or_speed NUMERIC NOT NULL CHECK (avg_pace_or_speed >= 0 AND avg_pace_or_speed <= 10000),
  estimated_calories NUMERIC NULL CHECK (estimated_calories IS NULL OR (estimated_calories >= 0 AND estimated_calories <= 50000)),
  step_count INTEGER NULL CHECK (step_count IS NULL OR (step_count >= 0 AND step_count <= 150000)),
  route_data JSONB NULL,
  notes TEXT NULL CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_activity_workouts_time_order CHECK (finish_time > start_time),
  CONSTRAINT chk_activity_workouts_duration_bounds CHECK (duration_seconds <= EXTRACT(EPOCH FROM (finish_time - start_time)) + 2)
);

-- 2. Create Daily Steps Table (Supports multiple cumulative entries per day)
CREATE TABLE IF NOT EXISTS public.daily_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_date DATE NOT NULL,
  steps INTEGER NOT NULL CHECK (steps > 0 AND steps <= 150000),
  source TEXT NOT NULL CHECK (source IN ('manual', 'device_sensor', 'workout_estimate')),
  notes TEXT NULL CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-Performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_activity_workouts_user_time ON public.activity_workouts (user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_activity_workouts_user_type ON public.activity_workouts (user_id, activity_type);
-- Note: Redundant index on session_token removed; session_token is defined as UNIQUE which automatically generates a unique B-tree index

CREATE INDEX IF NOT EXISTS idx_daily_steps_user_date ON public.daily_steps (user_id, step_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_steps_user_created ON public.daily_steps (user_id, created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.activity_workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_steps ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: public.activity_workouts
DROP POLICY IF EXISTS "Users can view own workouts" ON public.activity_workouts;
CREATE POLICY "Users can view own workouts"
  ON public.activity_workouts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own workouts" ON public.activity_workouts;
CREATE POLICY "Users can insert own workouts"
  ON public.activity_workouts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own workouts" ON public.activity_workouts;
CREATE POLICY "Users can update own workouts"
  ON public.activity_workouts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own workouts" ON public.activity_workouts;
CREATE POLICY "Users can delete own workouts"
  ON public.activity_workouts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. RLS Policies: public.daily_steps
DROP POLICY IF EXISTS "Users can view own daily steps" ON public.daily_steps;
CREATE POLICY "Users can view own daily steps"
  ON public.daily_steps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own daily steps" ON public.daily_steps;
CREATE POLICY "Users can insert own daily steps"
  ON public.daily_steps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own daily steps" ON public.daily_steps;
CREATE POLICY "Users can update own daily steps"
  ON public.daily_steps
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own daily steps" ON public.daily_steps;
CREATE POLICY "Users can delete own daily steps"
  ON public.daily_steps
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Automatic updated_at Triggers
DROP TRIGGER IF EXISTS on_activity_workouts_updated_at ON public.activity_workouts;
CREATE TRIGGER on_activity_workouts_updated_at
  BEFORE UPDATE ON public.activity_workouts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_daily_steps_updated_at ON public.daily_steps;
CREATE TRIGGER on_daily_steps_updated_at
  BEFORE UPDATE ON public.daily_steps
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 8. Explicit Role Privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_workouts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_steps TO authenticated;
REVOKE ALL ON public.activity_workouts FROM anon;
REVOKE ALL ON public.daily_steps FROM anon;
