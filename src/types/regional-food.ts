export type RegionalRegion =
  | "All Regions"
  | "Bhatkal"
  | "Murdeshwar"
  | "Uttara Kannada"
  | "Coastal Karnataka";

export const REGIONAL_REGIONS: RegionalRegion[] = [
  "All Regions",
  "Bhatkal",
  "Murdeshwar",
  "Uttara Kannada",
  "Coastal Karnataka",
];

export type RegionalCuisine =
  | "Bhatkal cuisine"
  | "Murdeshwar cuisine"
  | "Uttara Kannada cuisine"
  | "Coastal Karnataka cuisine";

export const REGIONAL_CUISINES: RegionalCuisine[] = [
  "Bhatkal cuisine",
  "Murdeshwar cuisine",
  "Uttara Kannada cuisine",
  "Coastal Karnataka cuisine",
];

export type RegionalCategory =
  | "All Categories"
  | "Rice dishes"
  | "Seafood"
  | "Curries and gravies"
  | "Breakfast dishes"
  | "Snacks"
  | "Meat dishes"
  | "Vegetarian dishes"
  | "Sweets";

export const REGIONAL_CATEGORIES: RegionalCategory[] = [
  "All Categories",
  "Rice dishes",
  "Seafood",
  "Curries and gravies",
  "Breakfast dishes",
  "Snacks",
  "Meat dishes",
  "Vegetarian dishes",
  "Sweets",
];

export type VerificationStatus =
  | "verified"
  | "estimated"
  | "pending"
  | "community_submitted";

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  food_id?: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string; // 'g', 'ml', 'cup', 'tbsp', 'tsp', 'piece', 'pinch'
  weight_in_grams: number;
  preparation_notes?: string;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fibre?: number | null;
  is_verified_ingredient?: boolean;
  is_oil_or_fat?: boolean;
}

export interface FoodAlias {
  id?: string;
  food_id?: string | null;
  recipe_id?: string | null;
  alias: string;
  language?: string; // 'Navayati', 'Kannada', 'Konkani', 'Tulu', 'Urdu', 'English'
  region?: string;
}

export interface RegionalRecipe {
  id: string;
  name: string;
  local_name?: string | null;
  region: string;
  locality?: string | null;
  cuisine: string;
  category: string;
  description?: string | null;
  cooking_method: string;
  preparation_time_minutes: number;
  cooking_time_minutes: number;
  default_servings: number;
  total_cooked_weight_g?: number | null;
  cooked_weight_per_serving_g?: number | null;
  source: string;
  verification_status: VerificationStatus;
  is_published: boolean;
  calories_per_serving: number;
  protein_per_serving: number;
  carbohydrates_per_serving: number;
  fat_per_serving: number;
  fibre_per_serving: number | null;
  cooking_instructions?: string | null;
  ingredients: RecipeIngredient[];
  aliases?: FoodAlias[];
  contributor_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CalculatedRecipeNutrition {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFibre: number | null;
  perServingCalories: number;
  perServingProtein: number;
  perServingCarbs: number;
  perServingFat: number;
  perServingFibre: number | null;
  per100gCalories?: number | null;
  per100gProtein?: number | null;
  per100gCarbs?: number | null;
  per100gFat?: number | null;
  per100gFibre?: number | null;
  verifiedIngredientsCount: number;
  estimatedIngredientsCount: number;
  missingIngredientsCount: number;
  isFullyVerified: boolean;
  summaryNotes: string[];
}

export interface RecipeSubmission {
  id: string;
  user_id: string;
  dish_name: string;
  local_name?: string | null;
  region: string;
  locality?: string | null;
  cuisine: string;
  category: string;
  ingredients_text: string;
  ingredients_json?: RecipeIngredient[] | null;
  cooking_instructions: string;
  serving_count: number;
  source_attribution: string;
  photo_url?: string | null;
  status: "pending" | "under_review" | "approved" | "rejected";
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateRecipeSubmissionInput {
  dish_name: string;
  local_name?: string;
  region: string;
  locality?: string;
  cuisine: string;
  category: string;
  ingredients_text: string;
  cooking_instructions: string;
  serving_count: number;
  source_attribution: string;
  photo_url?: string;
}
