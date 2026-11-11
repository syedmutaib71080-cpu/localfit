import { createClient } from "@/lib/supabase/client";
import type { FoodItem, FoodCategory } from "@/types/nutrition";

/**
 * Credible, scientifically sourced baseline nutrition database.
 * Sourced directly from:
 * - ICMR-NIN: Indian Food Composition Tables (IFCT 2017)
 * - USDA: FoodData Central (FDC)
 * - Standardized coastal recipe documentation
 */
export const VERIFIED_FOOD_DATABASE: FoodItem[] = [
  {
    id: "11111111-1111-4111-a111-111111111101",
    name: "White Rice (Cooked)",
    local_name: "Bhat / Chawal",
    category: "Rice and grains",
    description: "Steamed polished white rice, medium grain staple",
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbohydrates_per_100g: 28.2,
    fat_per_100g: 0.3,
    fibre_per_100g: 0.4,
    serving_name: "1 cup cooked",
    serving_weight_g: 158,
    region: "National / Coastal",
    source: "ICMR-NIN IFCT 2017 & USDA FDC (168878)",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
      { serving_unit: "cup", serving_label: "1 cup cooked (158g)", weight_g: 158, is_default: true },
      { serving_unit: "bowl", serving_label: "1 small katori (100g)", weight_g: 100, is_default: false },
      { serving_unit: "bowl", serving_label: "1 medium bowl (200g)", weight_g: 200, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111102",
    name: "Roti (Whole Wheat)",
    local_name: "Chapati / Phulka",
    category: "Bread and roti",
    description: "Traditional unleavened Indian flatbread cooked on tawa without oil",
    calories_per_100g: 264,
    protein_per_100g: 9.1,
    carbohydrates_per_100g: 55.7,
    fat_per_100g: 1.5,
    fibre_per_100g: 10.7,
    serving_name: "1 medium roti",
    serving_weight_g: 40,
    region: "National",
    source: "ICMR-NIN IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "piece", serving_label: "1 small roti (30g)", weight_g: 30, is_default: false },
      { serving_unit: "piece", serving_label: "1 medium roti (40g)", weight_g: 40, is_default: true },
      { serving_unit: "piece", serving_label: "1 large roti (55g)", weight_g: 55, is_default: false },
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111103",
    name: "Boiled Egg",
    local_name: "Ubalaa Anda / Motte",
    category: "Eggs",
    description: "Whole chicken egg, hard boiled",
    calories_per_100g: 155,
    protein_per_100g: 12.6,
    carbohydrates_per_100g: 1.1,
    fat_per_100g: 10.6,
    fibre_per_100g: 0.0,
    serving_name: "1 large egg",
    serving_weight_g: 50,
    region: "National",
    source: "USDA FoodData Central (173424) & IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "piece", serving_label: "1 large egg (50g)", weight_g: 50, is_default: true },
      { serving_unit: "piece", serving_label: "2 large eggs (100g)", weight_g: 100, is_default: false },
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111104",
    name: "Chicken Breast (Grilled)",
    local_name: "Koli Mamsa / Murgh",
    category: "Chicken and meat",
    description: "Boneless, skinless chicken breast fillet cooked/grilled without oil",
    calories_per_100g: 165,
    protein_per_100g: 31.0,
    carbohydrates_per_100g: 0.0,
    fat_per_100g: 3.6,
    fibre_per_100g: 0.0,
    serving_name: "1 piece / fillet",
    serving_weight_g: 120,
    region: "National",
    source: "USDA FoodData Central (171077)",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
      { serving_unit: "piece", serving_label: "1 medium fillet (120g)", weight_g: 120, is_default: true },
      { serving_unit: "piece", serving_label: "1 large fillet (180g)", weight_g: 180, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111105",
    name: "Cow Milk (Toned)",
    local_name: "Haalu / Doodh",
    category: "Dairy",
    description: "Fresh pasteurized toned cow milk",
    calories_per_100g: 62,
    protein_per_100g: 3.2,
    carbohydrates_per_100g: 4.7,
    fat_per_100g: 3.4,
    fibre_per_100g: 0.0,
    serving_name: "1 cup / glass",
    serving_weight_g: 200,
    region: "National",
    source: "ICMR-NIN IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "ml", serving_label: "100 ml", weight_g: 100, is_default: false },
      { serving_unit: "cup", serving_label: "1 cup / glass (200 ml)", weight_g: 200, is_default: true },
      { serving_unit: "cup", serving_label: "1 mug (250 ml)", weight_g: 250, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111106",
    name: "Curd (Plain Dahi)",
    local_name: "Mosaru / Dahi",
    category: "Dairy",
    description: "Whole cow milk cultured curd / plain yogurt without sugar",
    calories_per_100g: 61,
    protein_per_100g: 3.5,
    carbohydrates_per_100g: 4.7,
    fat_per_100g: 3.3,
    fibre_per_100g: 0.0,
    serving_name: "1 katori / bowl",
    serving_weight_g: 150,
    region: "National",
    source: "ICMR-NIN IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
      { serving_unit: "bowl", serving_label: "1 small katori (100g)", weight_g: 100, is_default: false },
      { serving_unit: "bowl", serving_label: "1 medium bowl (150g)", weight_g: 150, is_default: true },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111107",
    name: "Banana (Raw)",
    local_name: "Balehannu / Kela",
    category: "Fruits",
    description: "Fresh ripe banana, peeled",
    calories_per_100g: 89,
    protein_per_100g: 1.1,
    carbohydrates_per_100g: 22.8,
    fat_per_100g: 0.3,
    fibre_per_100g: 2.6,
    serving_name: "1 medium banana",
    serving_weight_g: 118,
    region: "National / Coastal",
    source: "USDA FoodData Central (173944) & IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "piece", serving_label: "1 small banana (85g)", weight_g: 85, is_default: false },
      { serving_unit: "piece", serving_label: "1 medium banana (118g)", weight_g: 118, is_default: true },
      { serving_unit: "piece", serving_label: "1 large banana (136g)", weight_g: 136, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111108",
    name: "Apple (with skin)",
    local_name: "Sebu / Seb",
    category: "Fruits",
    description: "Fresh raw red apple with edible peel",
    calories_per_100g: 52,
    protein_per_100g: 0.3,
    carbohydrates_per_100g: 13.8,
    fat_per_100g: 0.2,
    fibre_per_100g: 2.4,
    serving_name: "1 medium apple",
    serving_weight_g: 150,
    region: "National",
    source: "USDA FoodData Central (171688)",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "piece", serving_label: "1 small apple (120g)", weight_g: 120, is_default: false },
      { serving_unit: "piece", serving_label: "1 medium apple (150g)", weight_g: 150, is_default: true },
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111109",
    name: "Potato (Boiled)",
    local_name: "Alugadde / Aloo",
    category: "Vegetables",
    description: "Whole potato boiled and peeled without salt",
    calories_per_100g: 87,
    protein_per_100g: 1.9,
    carbohydrates_per_100g: 20.1,
    fat_per_100g: 0.1,
    fibre_per_100g: 1.8,
    serving_name: "1 medium potato",
    serving_weight_g: 150,
    region: "National",
    source: "USDA FoodData Central (170028) & IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "piece", serving_label: "1 small potato (100g)", weight_g: 100, is_default: false },
      { serving_unit: "piece", serving_label: "1 medium potato (150g)", weight_g: 150, is_default: true },
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111110",
    name: "Toor Dal (Cooked)",
    local_name: "Togari Bele Saaru / Peeli Dal",
    category: "Pulses and legumes",
    description: "Split pigeon pea dal cooked with turmeric, mild cumin tadka",
    calories_per_100g: 95,
    protein_per_100g: 5.6,
    carbohydrates_per_100g: 14.5,
    fat_per_100g: 1.8,
    fibre_per_100g: 3.2,
    serving_name: "1 katori / bowl",
    serving_weight_g: 150,
    region: "National / South India",
    source: "ICMR-NIN IFCT 2017",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "bowl", serving_label: "1 small katori (100g)", weight_g: 100, is_default: false },
      { serving_unit: "bowl", serving_label: "1 medium bowl (150g)", weight_g: 150, is_default: true },
      { serving_unit: "bowl", serving_label: "1 large bowl (220g)", weight_g: 220, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111111",
    name: "Pomfret Fish (Steamed)",
    local_name: "Manji / Paplet",
    category: "Seafood",
    description: "Fresh silver/white pomfret steamed with turmeric and salt",
    calories_per_100g: 102,
    protein_per_100g: 19.3,
    carbohydrates_per_100g: 0.0,
    fat_per_100g: 2.8,
    fibre_per_100g: 0.0,
    serving_name: "1 whole fillet",
    serving_weight_g: 120,
    region: "Coastal Karnataka",
    source: "ICMR-NIN IFCT 2017 (Marine Fish)",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "gram", serving_label: "100 grams", weight_g: 100, is_default: false },
      { serving_unit: "piece", serving_label: "1 whole fillet (120g)", weight_g: 120, is_default: true },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111112",
    name: "Prawns / Shrimp (Cooked)",
    local_name: "Sigadi / Jheenga",
    category: "Seafood",
    description: "Fresh coastal sea prawns, steamed/poached",
    calories_per_100g: 99,
    protein_per_100g: 21.0,
    carbohydrates_per_100g: 0.2,
    fat_per_100g: 1.1,
    fibre_per_100g: 0.0,
    serving_name: "1 bowl (8-10 pieces)",
    serving_weight_g: 100,
    region: "Coastal Karnataka",
    source: "ICMR-NIN IFCT 2017 & USDA FDC",
    confidence_level: "high",
    is_verified: true,
    servings: [
      { serving_unit: "bowl", serving_label: "1 serving (8-10 pieces, 100g)", weight_g: 100, is_default: true },
      { serving_unit: "bowl", serving_label: "1 large bowl (180g)", weight_g: 180, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111113",
    name: "Neer Dosa",
    local_name: "Neer Dose / Bari Dosa",
    category: "Coastal Karnataka dishes",
    description: "Delicate, lace-thin steamed rice crepes native to Tulu Nadu and Coastal Karnataka",
    calories_per_100g: 165,
    protein_per_100g: 3.2,
    carbohydrates_per_100g: 34.0,
    fat_per_100g: 1.8,
    fibre_per_100g: 1.2,
    serving_name: "1 piece",
    serving_weight_g: 45,
    region: "Coastal Karnataka",
    source: "Standardized Recipe Formulation (Rice, Water, Salt)",
    confidence_level: "estimated",
    is_verified: false,
    servings: [
      { serving_unit: "piece", serving_label: "1 dosa (45g)", weight_g: 45, is_default: true },
      { serving_unit: "piece", serving_label: "2 dosas (90g)", weight_g: 90, is_default: false },
      { serving_unit: "piece", serving_label: "3 dosas (135g)", weight_g: 135, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111114",
    name: "Kori Rotti (Chicken Curry & Crisp Rice Wafers)",
    local_name: "Kori Rotti",
    category: "Coastal Karnataka dishes",
    description: "Crisp sun-dried rice wafers soaked in spicy Mangalorean coconut chicken curry",
    calories_per_100g: 185,
    protein_per_100g: 11.2,
    carbohydrates_per_100g: 22.5,
    fat_per_100g: 5.8,
    fibre_per_100g: 1.1,
    serving_name: "1 plate serving",
    serving_weight_g: 200,
    region: "Coastal Karnataka",
    source: "Standardized Recipe Formulation (Rice wafers + Gassi gravy)",
    confidence_level: "estimated",
    is_verified: false,
    servings: [
      { serving_unit: "serving", serving_label: "1 standard plate (200g)", weight_g: 200, is_default: true },
      { serving_unit: "serving", serving_label: "1 large plate (320g)", weight_g: 320, is_default: false },
    ],
  },
  {
    id: "11111111-1111-4111-a111-111111111115",
    name: "Bhatkal Chicken Biryani",
    local_name: "Bhatkally Biryani",
    category: "Coastal Karnataka dishes",
    description: "Unique coastal biryani characterized by layered white basmati, onion masala, and steamed marinated chicken without red food coloring",
    calories_per_100g: 172,
    protein_per_100g: 9.8,
    carbohydrates_per_100g: 22.0,
    fat_per_100g: 5.2,
    fibre_per_100g: 1.4,
    serving_name: "1 plate serving",
    serving_weight_g: 250,
    region: "Bhatkal",
    source: "Documented Traditional Recipe Architecture (Navayath Formulation)",
    confidence_level: "estimated",
    is_verified: false,
    servings: [
      { serving_unit: "serving", serving_label: "1 standard plate (250g)", weight_g: 250, is_default: true },
      { serving_unit: "serving", serving_label: "1 hearty plate (380g)", weight_g: 380, is_default: false },
    ],
  },
];

/**
 * Searches and filters the food database using Supabase with local fallback.
 */
export async function searchFoods(params: {
  query?: string;
  category?: FoodCategory | "all";
}): Promise<FoodItem[]> {
  const { query = "", category = "all" } = params;
  const cleanQuery = query.trim().toLowerCase();

  try {
    const supabase = createClient();
    let dbQuery = supabase.from("foods").select("*, servings:food_servings(*)");

    if (category && category !== "all") {
      dbQuery = dbQuery.eq("category", category);
    }

    if (cleanQuery) {
      dbQuery = dbQuery.or(
        `name.ilike.%${cleanQuery}%,local_name.ilike.%${cleanQuery}%,region.ilike.%${cleanQuery}%`
      );
    }

    const { data, error } = await dbQuery.order("name", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as FoodItem[];
    }
  } catch {
    // Graceful fallback to verified in-memory dataset
  }

  // Fallback filtering
  return VERIFIED_FOOD_DATABASE.filter((item) => {
    const matchesCategory =
      category === "all" || item.category === category;
    const matchesQuery =
      !cleanQuery ||
      item.name.toLowerCase().includes(cleanQuery) ||
      (item.local_name && item.local_name.toLowerCase().includes(cleanQuery)) ||
      (item.region && item.region.toLowerCase().includes(cleanQuery));

    return matchesCategory && matchesQuery;
  });
}

/**
 * Fetches a single food item by ID with its servings options.
 */
export async function getFoodById(id: string): Promise<FoodItem | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("foods")
      .select("*, servings:food_servings(*)")
      .eq("id", id)
      .maybeSingle();

    if (!error && data) {
      return data as FoodItem;
    }
  } catch {
    // Fallback
  }

  return VERIFIED_FOOD_DATABASE.find((item) => item.id === id) || null;
}
