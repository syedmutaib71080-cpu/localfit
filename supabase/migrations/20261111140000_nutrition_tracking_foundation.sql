-- ==============================================================================
-- LOCALFIT STAGE 9.1 MIGRATION: Nutrition Database & Backend Foundation
-- ==============================================================================
-- Tables:
--   1. public.foods (Catalogue with strict non-negative check constraints)
--   2. public.food_logs (User daily logs with snapshots, RLS, and constraints)
-- Triggers: handle_updated_at() on both tables
-- Row Level Security:
--   - public.foods: Public read-only (SELECT) for authenticated & anon; write restricted
--   - public.food_logs: Private per-user CRUD (auth.uid() = user_id)
-- ==============================================================================

-- 1. Ensure Food Catalogue Table exists with complete schema
CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  local_name TEXT NULL,
  category TEXT NOT NULL,
  description TEXT NULL,
  calories_per_100g NUMERIC NULL CONSTRAINT chk_foods_calories_range CHECK (calories_per_100g IS NULL OR (calories_per_100g >= 0 AND calories_per_100g <= 1000)),
  protein_per_100g NUMERIC NULL CONSTRAINT chk_foods_protein_range CHECK (protein_per_100g IS NULL OR (protein_per_100g >= 0 AND protein_per_100g <= 100)),
  carbohydrates_per_100g NUMERIC NULL CONSTRAINT chk_foods_carbs_range CHECK (carbohydrates_per_100g IS NULL OR (carbohydrates_per_100g >= 0 AND carbohydrates_per_100g <= 100)),
  fat_per_100g NUMERIC NULL CONSTRAINT chk_foods_fat_range CHECK (fat_per_100g IS NULL OR (fat_per_100g >= 0 AND fat_per_100g <= 100)),
  fibre_per_100g NUMERIC NULL CONSTRAINT chk_foods_fibre_range CHECK (fibre_per_100g IS NULL OR (fibre_per_100g >= 0 AND fibre_per_100g <= 100)),
  serving_name TEXT NULL,
  serving_weight_g NUMERIC NULL CONSTRAINT chk_foods_serving_weight CHECK (serving_weight_g IS NULL OR (serving_weight_g > 0 AND serving_weight_g <= 5000)),
  region TEXT NULL,
  source TEXT NULL,
  confidence_level TEXT NOT NULL DEFAULT 'high' CONSTRAINT chk_foods_confidence CHECK (confidence_level IN ('high', 'medium', 'low', 'estimated')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast search & category indexes for foods (reuses existing Stage 4 indexes without duplication)
CREATE INDEX IF NOT EXISTS idx_foods_name ON public.foods (lower(name));
CREATE INDEX IF NOT EXISTS idx_foods_local_name ON public.foods (lower(local_name));
CREATE INDEX IF NOT EXISTS idx_foods_category ON public.foods (category);
CREATE INDEX IF NOT EXISTS idx_foods_region ON public.foods (region);

-- 2. Food Logs Table (User Nutrition Entries with Snapshots)
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_id UUID NULL REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  meal_type TEXT NOT NULL CONSTRAINT chk_food_logs_meal_type CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'snacks')),
  quantity_g NUMERIC NOT NULL CONSTRAINT chk_food_logs_quantity_positive CHECK (quantity_g > 0 AND quantity_g <= 10000),
  serving_name TEXT NULL,
  calories NUMERIC NULL CONSTRAINT chk_food_logs_calories_nonneg CHECK (calories IS NULL OR (calories >= 0 AND calories <= 50000)),
  protein NUMERIC NULL CONSTRAINT chk_food_logs_protein_nonneg CHECK (protein IS NULL OR (protein >= 0 AND protein <= 5000)),
  carbohydrates NUMERIC NULL CONSTRAINT chk_food_logs_carbs_nonneg CHECK (carbohydrates IS NULL OR (carbohydrates >= 0 AND carbohydrates <= 5000)),
  fat NUMERIC NULL CONSTRAINT chk_food_logs_fat_nonneg CHECK (fat IS NULL OR (fat >= 0 AND fat <= 5000)),
  fibre NUMERIC NULL CONSTRAINT chk_food_logs_fibre_nonneg CHECK (fibre IS NULL OR (fibre >= 0 AND fibre <= 1000)),
  consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT NULL CONSTRAINT chk_food_logs_notes_length CHECK (notes IS NULL OR length(notes) <= 2000),
  is_ai_estimate BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add missing columns if table already existed from earlier stages
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS consumption_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.food_logs ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Safe constraint backfill for existing tables
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_quantity_positive') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_quantity_positive CHECK (quantity_g > 0 AND quantity_g <= 10000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_notes_length') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_notes_length CHECK (notes IS NULL OR length(notes) <= 2000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_calories_nonneg') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_calories_nonneg CHECK (calories IS NULL OR (calories >= 0 AND calories <= 50000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_protein_nonneg') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_protein_nonneg CHECK (protein IS NULL OR (protein >= 0 AND protein <= 5000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_carbs_nonneg') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_carbs_nonneg CHECK (carbohydrates IS NULL OR (carbohydrates >= 0 AND carbohydrates <= 5000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_fat_nonneg') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_fat_nonneg CHECK (fat IS NULL OR (fat >= 0 AND fat <= 5000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_fibre_nonneg') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_fibre_nonneg CHECK (fibre IS NULL OR (fibre >= 0 AND fibre <= 1000));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_food_logs_meal_type') THEN
    ALTER TABLE public.food_logs ADD CONSTRAINT chk_food_logs_meal_type CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'Breakfast', 'Lunch', 'Dinner', 'Snacks', 'snacks'));
  END IF;
END $$;

-- Allow null for unknown nutrients in case historical records had NOT NULL
ALTER TABLE public.food_logs ALTER COLUMN calories DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN protein DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN carbohydrates DROP NOT NULL;
ALTER TABLE public.food_logs ALTER COLUMN fat DROP NOT NULL;

-- High-performance query indexes for user food logs
-- Uses distinct name idx_food_logs_user_consumption_date to coexist with Stage 5's idx_food_logs_user_date (user_id, logged_at)
CREATE INDEX IF NOT EXISTS idx_food_logs_user_consumption_date ON public.food_logs (user_id, consumption_date);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_logged_at ON public.food_logs (user_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_logs_user_meal ON public.food_logs (user_id, meal_type);
CREATE INDEX IF NOT EXISTS idx_food_logs_food_id ON public.food_logs (food_id);

-- 3. Automatic updated_at triggers (clean up legacy Stage 4/5 trigger names first)
DROP TRIGGER IF EXISTS on_food_logs_updated_at ON public.food_logs;
DROP TRIGGER IF EXISTS trg_food_logs_updated_at ON public.food_logs;
CREATE TRIGGER trg_food_logs_updated_at
  BEFORE UPDATE ON public.food_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_foods_updated_at ON public.foods;
DROP TRIGGER IF EXISTS trg_foods_updated_at ON public.foods;
CREATE TRIGGER trg_foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Foods Catalogue (Public Read, No Public Write)
DROP POLICY IF EXISTS "Public read access for foods" ON public.foods;
CREATE POLICY "Public read access for foods"
  ON public.foods
  FOR SELECT
  USING (true);

-- 6. RLS Policies: Food Logs (Strict User Isolation)
DROP POLICY IF EXISTS "Users can view own food logs" ON public.food_logs;
CREATE POLICY "Users can view own food logs"
  ON public.food_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own food logs" ON public.food_logs;
CREATE POLICY "Users can insert own food logs"
  ON public.food_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own food logs" ON public.food_logs;
CREATE POLICY "Users can update own food logs"
  ON public.food_logs
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own food logs" ON public.food_logs;
CREATE POLICY "Users can delete own food logs"
  ON public.food_logs
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Grant and Revoke Privileges
REVOKE ALL ON TABLE public.foods FROM anon, authenticated;
GRANT SELECT ON TABLE public.foods TO anon, authenticated;

REVOKE ALL ON TABLE public.food_logs FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.food_logs TO authenticated;
