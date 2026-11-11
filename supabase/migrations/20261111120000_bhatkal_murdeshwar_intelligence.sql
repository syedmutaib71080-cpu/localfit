-- ==============================================================================
-- LOCALFIT STAGE 7 MIGRATION: Bhatkal, Murdeshwar & Coastal Food Intelligence
-- ==============================================================================

-- 1. Extend Recipes Table with Stage 7 Regional Metadata
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS locality TEXT NULL,
ADD COLUMN IF NOT EXISTS cuisine TEXT NOT NULL DEFAULT 'Coastal Karnataka cuisine',
ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Curries and gravies',
ADD COLUMN IF NOT EXISTS preparation_time_minutes INTEGER NULL DEFAULT 20,
ADD COLUMN IF NOT EXISTS cooking_time_minutes INTEGER NULL DEFAULT 35,
ADD COLUMN IF NOT EXISTS default_servings INTEGER NOT NULL DEFAULT 4,
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'estimated' CHECK (verification_status IN ('verified', 'estimated', 'pending', 'community_submitted')),
ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS contributor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS calories_per_serving NUMERIC NULL,
ADD COLUMN IF NOT EXISTS protein_per_serving NUMERIC NULL,
ADD COLUMN IF NOT EXISTS carbohydrates_per_serving NUMERIC NULL,
ADD COLUMN IF NOT EXISTS fat_per_serving NUMERIC NULL,
ADD COLUMN IF NOT EXISTS fibre_per_serving NUMERIC NULL,
ADD COLUMN IF NOT EXISTS cooking_instructions TEXT NULL;

-- 2. Extend Recipe Ingredients Table
ALTER TABLE public.recipe_ingredients
ADD COLUMN IF NOT EXISTS weight_in_grams NUMERIC NULL,
ADD COLUMN IF NOT EXISTS preparation_notes TEXT NULL,
ADD COLUMN IF NOT EXISTS calories NUMERIC NULL,
ADD COLUMN IF NOT EXISTS protein NUMERIC NULL,
ADD COLUMN IF NOT EXISTS carbohydrates NUMERIC NULL,
ADD COLUMN IF NOT EXISTS fat NUMERIC NULL,
ADD COLUMN IF NOT EXISTS fibre NUMERIC NULL,
ADD COLUMN IF NOT EXISTS is_verified_ingredient BOOLEAN DEFAULT FALSE;

-- Ensure weight_in_grams has a value where weight_g exists
UPDATE public.recipe_ingredients
SET weight_in_grams = weight_g
WHERE weight_in_grams IS NULL AND weight_g IS NOT NULL;

-- 3. Create Food Aliases Table (Multilingual & Regional alternative spellings)
CREATE TABLE IF NOT EXISTS public.food_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  recipe_id UUID NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  language TEXT NULL, -- 'Navayati', 'Kannada', 'Konkani', 'Tulu', 'Urdu', 'English'
  region TEXT NULL,   -- 'Bhatkal', 'Murdeshwar', 'Coastal Karnataka', 'Uttara Kannada'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_food_or_recipe CHECK (
    (food_id IS NOT NULL AND recipe_id IS NULL) OR
    (food_id IS NULL AND recipe_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_food_aliases_alias ON public.food_aliases (lower(alias));
CREATE INDEX IF NOT EXISTS idx_food_aliases_recipe_id ON public.food_aliases (recipe_id);
CREATE INDEX IF NOT EXISTS idx_food_aliases_food_id ON public.food_aliases (food_id);

-- 4. Create Recipe Submissions Table (Community contributions held pending review)
CREATE TABLE IF NOT EXISTS public.recipe_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  local_name TEXT NULL,
  region TEXT NOT NULL,
  locality TEXT NULL,
  cuisine TEXT NOT NULL,
  category TEXT NOT NULL,
  ingredients_text TEXT NOT NULL,
  ingredients_json JSONB NULL,
  cooking_instructions TEXT NOT NULL,
  serving_count INTEGER NOT NULL DEFAULT 4 CHECK (serving_count > 0),
  source_attribution TEXT NOT NULL,
  photo_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  rejection_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recipe_submissions_user_id ON public.recipe_submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_submissions_status ON public.recipe_submissions (status);

-- 5. Updated_at Trigger for Recipe Submissions
DROP TRIGGER IF EXISTS on_recipe_submissions_updated_at ON public.recipe_submissions;
CREATE TRIGGER on_recipe_submissions_updated_at
  BEFORE UPDATE ON public.recipe_submissions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_submissions ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RECIPES POLICIES
-- ----------------------------------------------------------------------------
-- Explicitly drop legacy Stage 4 unrestricted policy to prevent RLS bypass
DROP POLICY IF EXISTS "Public read access for recipes" ON public.recipes;
DROP POLICY IF EXISTS "Public read access for published recipes" ON public.recipes;

-- Public can read published recipes; contributors can read their own draft/unpublished recipes
CREATE POLICY "Public read access for published recipes" ON public.recipes
  FOR SELECT USING (
    is_published = true 
    OR (auth.uid() IS NOT NULL AND auth.uid() = contributor_id)
  );

-- Administrators can insert, update, or delete recipes
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" ON public.recipes
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- RECIPE INGREDIENTS POLICIES
-- ----------------------------------------------------------------------------
-- Explicitly drop legacy Stage 4 unrestricted policy
DROP POLICY IF EXISTS "Public read access for recipe_ingredients" ON public.recipe_ingredients;

-- Ingredients can only be read if parent recipe is published or owned by contributor
CREATE POLICY "Public read access for recipe_ingredients" ON public.recipe_ingredients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = recipe_ingredients.recipe_id
        AND (
          r.is_published = true 
          OR (auth.uid() IS NOT NULL AND auth.uid() = r.contributor_id)
        )
    )
  );

-- Administrators can manage recipe ingredients
DROP POLICY IF EXISTS "Admins can manage recipe ingredients" ON public.recipe_ingredients;
CREATE POLICY "Admins can manage recipe ingredients" ON public.recipe_ingredients
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- FOOD ALIASES POLICIES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public read access for food aliases" ON public.food_aliases;
CREATE POLICY "Public read access for food aliases" ON public.food_aliases
  FOR SELECT USING (
    (food_id IS NOT NULL) OR
    (recipe_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.recipes r
      WHERE r.id = food_aliases.recipe_id
        AND (
          r.is_published = true 
          OR (auth.uid() IS NOT NULL AND auth.uid() = r.contributor_id)
        )
    ))
  );

DROP POLICY IF EXISTS "Admins can manage food aliases" ON public.food_aliases;
CREATE POLICY "Admins can manage food aliases" ON public.food_aliases
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ----------------------------------------------------------------------------
-- RECIPE SUBMISSIONS POLICIES
-- ----------------------------------------------------------------------------
-- Users can only read their own submissions
DROP POLICY IF EXISTS "Users can view own recipe submissions" ON public.recipe_submissions;
CREATE POLICY "Users can view own recipe submissions" ON public.recipe_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Authenticated users can insert submissions (must start strictly as pending)
DROP POLICY IF EXISTS "Users can insert recipe submissions" ON public.recipe_submissions;
CREATE POLICY "Users can insert recipe submissions" ON public.recipe_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can only update their own pending submissions without self-approval
DROP POLICY IF EXISTS "Users can update own pending submissions" ON public.recipe_submissions;
CREATE POLICY "Users can update own pending submissions" ON public.recipe_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Users can delete their own pending submissions
DROP POLICY IF EXISTS "Users can delete own pending submissions" ON public.recipe_submissions;
CREATE POLICY "Users can delete own pending submissions" ON public.recipe_submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Explicitly authorized administrators can review, approve, or reject submissions
DROP POLICY IF EXISTS "Admins can manage all recipe submissions" ON public.recipe_submissions;
CREATE POLICY "Admins can manage all recipe submissions" ON public.recipe_submissions
  FOR ALL TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
