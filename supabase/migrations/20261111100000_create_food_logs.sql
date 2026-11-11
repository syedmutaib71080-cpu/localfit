-- ==============================================================================
-- LOCALFIT STAGE 5 MIGRATION: Food Logs & Daily Nutrition Diaries
-- ==============================================================================

-- 1. Create Food Logs Table
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id UUID NULL REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snacks', 'breakfast', 'lunch', 'dinner', 'snacks', 'snack')),
  quantity_g NUMERIC NOT NULL CHECK (quantity_g > 0),
  serving_name TEXT NULL,
  calories NUMERIC NOT NULL CHECK (calories >= 0),
  protein NUMERIC NOT NULL CHECK (protein >= 0),
  carbohydrates NUMERIC NOT NULL CHECK (carbohydrates >= 0),
  fat NUMERIC NOT NULL CHECK (fat >= 0),
  fibre NUMERIC NULL CHECK (fibre IS NULL OR fibre >= 0),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for High-Performance Queries by User, Date, and Meal
CREATE INDEX IF NOT EXISTS idx_food_logs_user_date ON public.food_logs (user_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal ON public.food_logs (user_id, meal_type);
CREATE INDEX IF NOT EXISTS idx_food_logs_food_id ON public.food_logs (food_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Security Policies (Strict User Ownership Checks)
-- Users can only read their own food logs
DROP POLICY IF EXISTS "Users can view own food logs" ON public.food_logs;
CREATE POLICY "Users can view own food logs"
  ON public.food_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can only insert their own food logs
DROP POLICY IF EXISTS "Users can insert own food logs" ON public.food_logs;
CREATE POLICY "Users can insert own food logs"
  ON public.food_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own food logs
DROP POLICY IF EXISTS "Users can update own food logs" ON public.food_logs;
CREATE POLICY "Users can update own food logs"
  ON public.food_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own food logs
DROP POLICY IF EXISTS "Users can delete own food logs" ON public.food_logs;
CREATE POLICY "Users can delete own food logs"
  ON public.food_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 5. Automatic updated_at Trigger
DROP TRIGGER IF EXISTS on_food_logs_updated_at ON public.food_logs;
CREATE TRIGGER on_food_logs_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
