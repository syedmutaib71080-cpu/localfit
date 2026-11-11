-- ==============================================================================
-- LOCALFIT STAGE 4 MIGRATION: Nutrition Database, Servings, Recipes & Security
-- ==============================================================================

-- 1. Create Foods Table
CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  local_name TEXT NULL,
  category TEXT NOT NULL,
  description TEXT NULL,
  calories_per_100g NUMERIC NOT NULL CHECK (calories_per_100g >= 0),
  protein_per_100g NUMERIC NOT NULL CHECK (protein_per_100g >= 0),
  carbohydrates_per_100g NUMERIC NOT NULL CHECK (carbohydrates_per_100g >= 0),
  fat_per_100g NUMERIC NOT NULL CHECK (fat_per_100g >= 0),
  fibre_per_100g NUMERIC NULL CHECK (fibre_per_100g IS NULL OR fibre_per_100g >= 0),
  serving_name TEXT NULL,
  serving_weight_g NUMERIC NULL CHECK (serving_weight_g IS NULL OR serving_weight_g > 0),
  region TEXT NULL,
  source TEXT NULL,
  confidence_level TEXT NOT NULL DEFAULT 'high' CHECK (confidence_level IN ('high', 'medium', 'low', 'estimated')),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast search & filtering
CREATE INDEX IF NOT EXISTS idx_foods_name ON public.foods (lower(name));
CREATE INDEX IF NOT EXISTS idx_foods_local_name ON public.foods (lower(local_name));
CREATE INDEX IF NOT EXISTS idx_foods_category ON public.foods (category);
CREATE INDEX IF NOT EXISTS idx_foods_region ON public.foods (region);

-- 2. Create Food Servings Table (Multi-unit portion calculator support)
CREATE TABLE IF NOT EXISTS public.food_servings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NOT NULL REFERENCES public.foods(id) ON DELETE CASCADE,
  serving_unit TEXT NOT NULL, -- 'gram', 'ml', 'piece', 'cup', 'bowl', 'roti', 'tbsp', 'serving'
  serving_label TEXT NOT NULL, -- e.g. '1 medium piece', '1 cup cooked', '1 small katori'
  weight_g NUMERIC NOT NULL CHECK (weight_g > 0),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_food_servings_food_id ON public.food_servings (food_id);

-- 3. Local Food Architecture (Regional Recipe formulation: Bhatkal & Murdeshwar)
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id UUID NULL REFERENCES public.foods(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  local_name TEXT NULL,
  region TEXT NOT NULL, -- 'Bhatkal', 'Murdeshwar', 'Coastal Karnataka', 'Indian regional'
  description TEXT NULL,
  cooking_method TEXT NULL, -- 'steamed', 'curry', 'shallow_fry', 'boiled', 'dum_biryani'
  servings_yield NUMERIC NOT NULL DEFAULT 4 CHECK (servings_yield > 0),
  total_cooked_weight_g NUMERIC NULL CHECK (total_cooked_weight_g IS NULL OR total_cooked_weight_g > 0),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  confidence_level TEXT NOT NULL DEFAULT 'estimated' CHECK (confidence_level IN ('high', 'medium', 'low', 'estimated')),
  source TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  food_id UUID NULL REFERENCES public.foods(id) ON DELETE SET NULL,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL, -- 'g', 'ml', 'tbsp', 'tsp', 'cup', 'piece'
  weight_g NUMERIC NOT NULL CHECK (weight_g > 0),
  is_oil_or_fat BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON public.recipe_ingredients (recipe_id);

-- 4. Automatic updated_at triggers
DROP TRIGGER IF EXISTS on_foods_updated_at ON public.foods;
CREATE TRIGGER on_foods_updated_at
  BEFORE UPDATE ON public.foods
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_recipes_updated_at ON public.recipes;
CREATE TRIGGER on_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_servings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

-- Read policies: public access (all authenticated and anonymous users can read food data)
DROP POLICY IF EXISTS "Public read access for foods" ON public.foods;
CREATE POLICY "Public read access for foods" ON public.foods
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for food_servings" ON public.food_servings;
CREATE POLICY "Public read access for food_servings" ON public.food_servings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for recipes" ON public.recipes;
CREATE POLICY "Public read access for recipes" ON public.recipes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for recipe_ingredients" ON public.recipe_ingredients;
CREATE POLICY "Public read access for recipe_ingredients" ON public.recipe_ingredients
  FOR SELECT USING (true);

-- Write policies: restricted (no ordinary user write access)
-- Only service_role or administrative functions can mutate shared nutrition databases

-- 6. Initial Seed Data (Verified Scientific Baseline from ICMR-NIN IFCT 2017 & USDA FoodData Central)
INSERT INTO public.foods (
  id, name, local_name, category, description,
  calories_per_100g, protein_per_100g, carbohydrates_per_100g, fat_per_100g, fibre_per_100g,
  serving_name, serving_weight_g, region, source, confidence_level, is_verified
) VALUES
  -- 1. White Rice (Cooked)
  ('11111111-1111-4111-a111-111111111101', 'White Rice (Cooked)', 'Bhat / Chawal', 'Rice and grains', 'Steamed polished white rice, medium grain staple', 130, 2.7, 28.2, 0.3, 0.4, '1 cup cooked', 158, 'National / Coastal', 'ICMR-NIN IFCT 2017 & USDA FDC (168878)', 'high', true),
  -- 2. Whole Wheat Roti
  ('11111111-1111-4111-a111-111111111102', 'Roti (Whole Wheat)', 'Chapati / Phulka', 'Bread and roti', 'Traditional unleavened Indian flatbread cooked on tawa without oil', 264, 9.1, 55.7, 1.5, 10.7, '1 medium roti', 40, 'National', 'ICMR-NIN IFCT 2017', 'high', true),
  -- 3. Boiled Egg
  ('11111111-1111-4111-a111-111111111103', 'Boiled Egg', 'Ubalaa Anda / Motte', 'Eggs', 'Whole chicken egg, hard boiled', 155, 12.6, 1.1, 10.6, 0.0, '1 large egg', 50, 'National', 'USDA FoodData Central (173424) & IFCT 2017', 'high', true),
  -- 4. Chicken Breast
  ('11111111-1111-4111-a111-111111111104', 'Chicken Breast (Grilled)', 'Koli Mamsa / Murgh', 'Chicken and meat', 'Boneless, skinless chicken breast fillet cooked/grilled without oil', 165, 31.0, 0.0, 3.6, 0.0, '1 piece / fillet', 120, 'National', 'USDA FoodData Central (171077)', 'high', true),
  -- 5. Cow Milk
  ('11111111-1111-4111-a111-111111111105', 'Cow Milk (Toned)', 'Haalu / Doodh', 'Dairy', 'Fresh pasteurized pasteurized toned cow milk', 62, 3.2, 4.7, 3.4, 0.0, '1 cup / glass', 200, 'National', 'ICMR-NIN IFCT 2017', 'high', true),
  -- 6. Curd / Dahi
  ('11111111-1111-4111-a111-111111111106', 'Curd (Plain Dahi)', 'Mosaru / Dahi', 'Dairy', 'Whole cow milk cultured curd / plain yogurt without sugar', 61, 3.5, 4.7, 3.3, 0.0, '1 katori / bowl', 150, 'National', 'ICMR-NIN IFCT 2017', 'high', true),
  -- 7. Banana
  ('11111111-1111-4111-a111-111111111107', 'Banana (Raw)', 'Balehannu / Kela', 'Fruits', 'Fresh ripe banana, peeled', 89, 1.1, 22.8, 0.3, 2.6, '1 medium banana', 118, 'National / Coastal', 'USDA FoodData Central (173944) & IFCT 2017', 'high', true),
  -- 8. Apple
  ('11111111-1111-4111-a111-111111111108', 'Apple (with skin)', 'Sebu / Seb', 'Fruits', 'Fresh raw red apple with edible peel', 52, 0.3, 13.8, 0.2, 2.4, '1 medium apple', 150, 'National', 'USDA FoodData Central (171688)', 'high', true),
  -- 9. Potato (Boiled)
  ('11111111-1111-4111-a111-111111111109', 'Potato (Boiled)', 'Alugadde / Aloo', 'Vegetables', 'Whole potato boiled and peeled without salt', 87, 1.9, 20.1, 0.1, 1.8, '1 medium potato', 150, 'National', 'USDA FoodData Central (170028) & IFCT 2017', 'high', true),
  -- 10. Dal (Cooked Toor Dal)
  ('11111111-1111-4111-a111-111111111110', 'Toor Dal (Cooked)', 'Togari Bele Saaru / Peeli Dal', 'Pulses and legumes', 'Split pigeon pea dal cooked with turmeric, mild cumin tadka', 95, 5.6, 14.5, 1.8, 3.2, '1 katori / bowl', 150, 'National / South India', 'ICMR-NIN IFCT 2017', 'high', true),
  -- 11. Pomfret Fish
  ('11111111-1111-4111-a111-111111111111', 'Pomfret Fish (Steamed)', 'Manji / Paplet', 'Seafood', 'Fresh silver/white pomfret steamed with turmeric and salt', 102, 19.3, 0.0, 2.8, 0.0, '1 whole fillet', 120, 'Coastal Karnataka', 'ICMR-NIN IFCT 2017 (Marine Fish)', 'high', true),
  -- 12. Prawns / Shrimp
  ('11111111-1111-4111-a111-111111111112', 'Prawns / Shrimp (Cooked)', 'Sigadi / Jheenga', 'Seafood', 'Fresh coastal sea prawns, steamed/poached', 99, 21.0, 0.2, 1.1, 0.0, '1 bowl (8-10 pieces)', 100, 'Coastal Karnataka', 'ICMR-NIN IFCT 2017 & USDA FDC', 'high', true),
  -- 13. Neer Dosa (Coastal Karnataka Traditional)
  ('11111111-1111-4111-a111-111111111113', 'Neer Dosa', 'Neer Dose / Bari Dosa', 'Coastal Karnataka dishes', 'Delicate, lace-thin steamed rice crepes native to Tulu Nadu and Coastal Karnataka', 165, 3.2, 34.0, 1.8, 1.2, '1 piece', 45, 'Coastal Karnataka', 'Standardized Recipe Formulation (Rice, Water, Salt)', 'estimated', false),
  -- 14. Kori Rotti
  ('11111111-1111-4111-a111-111111111114', 'Kori Rotti (Chicken Curry & Crisp Rice Wafers)', 'Kori Rotti', 'Coastal Karnataka dishes', 'Crisp sun-dried rice wafers soaked in spicy Mangalorean coconut chicken curry', 185, 11.2, 22.5, 5.8, 1.1, '1 plate serving', 200, 'Coastal Karnataka', 'Standardized Recipe Formulation (Rice wafers + Gassi gravy)', 'estimated', false),
  -- 15. Bhatkal Biryani (Regional Traditional)
  ('11111111-1111-4111-a111-111111111115', 'Bhatkal Chicken Biryani', 'Bhatkally Biryani', 'Coastal Karnataka dishes', 'Unique coastal biryani characterized by layered white basmati, onion masala, and steamed marinated chicken without red food coloring', 172, 9.8, 22.0, 5.2, 1.4, '1 plate serving', 250, 'Bhatkal', 'Documented Traditional Recipe Architecture (Navayath Formulation)', 'estimated', false)
ON CONFLICT (id) DO NOTHING;

-- 7. Serving Options Seed Data
INSERT INTO public.food_servings (food_id, serving_unit, serving_label, weight_g, is_default) VALUES
  -- White Rice
  ('11111111-1111-4111-a111-111111111101', 'gram', '100 grams', 100, false),
  ('11111111-1111-4111-a111-111111111101', 'cup', '1 cup cooked', 158, true),
  ('11111111-1111-4111-a111-111111111101', 'bowl', '1 small katori', 100, false),
  -- Whole Wheat Roti
  ('11111111-1111-4111-a111-111111111102', 'gram', '100 grams', 100, false),
  ('11111111-1111-4111-a111-111111111102', 'piece', '1 small roti', 30, false),
  ('11111111-1111-4111-a111-111111111102', 'piece', '1 medium roti', 40, true),
  ('11111111-1111-4111-a111-111111111102', 'piece', '1 large roti', 55, false),
  -- Boiled Egg
  ('11111111-1111-4111-a111-111111111103', 'piece', '1 large egg', 50, true),
  ('11111111-1111-4111-a111-111111111103', 'piece', '2 large eggs', 100, false),
  -- Chicken Breast
  ('11111111-1111-4111-a111-111111111104', 'gram', '100 grams', 100, false),
  ('11111111-1111-4111-a111-111111111104', 'piece', '1 medium fillet', 120, true),
  -- Milk
  ('11111111-1111-4111-a111-111111111105', 'ml', '100 ml', 100, false),
  ('11111111-1111-4111-a111-111111111105', 'cup', '1 cup (200 ml)', 200, true),
  -- Curd
  ('11111111-1111-4111-a111-111111111106', 'gram', '100 grams', 100, false),
  ('11111111-1111-4111-a111-111111111106', 'bowl', '1 small katori (100g)', 100, false),
  ('11111111-1111-4111-a111-111111111106', 'bowl', '1 medium bowl (150g)', 150, true),
  -- Banana
  ('11111111-1111-4111-a111-111111111107', 'piece', '1 small banana', 85, false),
  ('11111111-1111-4111-a111-111111111107', 'piece', '1 medium banana', 118, true),
  -- Apple
  ('11111111-1111-4111-a111-111111111108', 'piece', '1 small apple', 120, false),
  ('11111111-1111-4111-a111-111111111108', 'piece', '1 medium apple', 150, true),
  -- Potato
  ('11111111-1111-4111-a111-111111111109', 'piece', '1 medium potato', 150, true),
  -- Toor Dal
  ('11111111-1111-4111-a111-111111111110', 'bowl', '1 katori / bowl', 150, true),
  -- Pomfret Fish
  ('11111111-1111-4111-a111-111111111111', 'piece', '1 whole fillet', 120, true),
  -- Prawns
  ('11111111-1111-4111-a111-111111111112', 'bowl', '1 serving (100g)', 100, true),
  -- Neer Dosa
  ('11111111-1111-4111-a111-111111111113', 'piece', '1 dosa', 45, true),
  ('11111111-1111-4111-a111-111111111113', 'piece', '2 dosas', 90, false),
  -- Kori Rotti
  ('11111111-1111-4111-a111-111111111114', 'serving', '1 standard plate', 200, true),
  -- Bhatkal Biryani
  ('11111111-1111-4111-a111-111111111115', 'serving', '1 plate (250g)', 250, true)
ON CONFLICT DO NOTHING;

-- 8. Seed Regional Recipe Architecture (Bhatkal Traditional Formulation)
INSERT INTO public.recipes (
  id, food_id, name, local_name, region, description,
  cooking_method, servings_yield, total_cooked_weight_g, is_verified, confidence_level, source
) VALUES (
  '22222222-2222-4222-b222-222222222201',
  '11111111-1111-4111-a111-111111111115',
  'Bhatkal Chicken Biryani',
  'Bhatkally Biryani',
  'Bhatkal',
  'Traditional Navayath layered biryani using fragrant aged basmati rice, onion masala base, and tender chicken cooked with green chillies and aromatic spices without red chilli powder or artificial colors.',
  'dum_biryani',
  4,
  1000,
  false,
  'estimated',
  'Traditional Navayath Culinary Documentation'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.recipe_ingredients (
  recipe_id, ingredient_name, quantity, unit, weight_g, is_oil_or_fat, notes
) VALUES
  ('22222222-2222-4222-b222-222222222201', 'Basmati Rice (aged)', 350, 'g', 350, false, 'Parboiled with whole spices'),
  ('22222222-2222-4222-b222-222222222201', 'Chicken (skinless, bone-in)', 450, 'g', 450, false, 'Cut into curry pieces'),
  ('22222222-2222-4222-b222-222222222201', 'Onions (sliced, slow cooked)', 200, 'g', 200, false, 'Cooked to deep translucent gold'),
  ('22222222-2222-4222-b222-222222222201', 'Ginger-Garlic-Green Chilli Paste', 40, 'g', 40, false, 'Freshly ground'),
  ('22222222-2222-4222-b222-222222222201', 'Curd / Yogurt', 80, 'g', 80, false, 'Thick curd marinade'),
  ('22222222-2222-4222-b222-222222222201', 'Sunflower Oil / Ghee mix', 35, 'g', 35, true, 'Cooking fat for onion base')
ON CONFLICT DO NOTHING;
