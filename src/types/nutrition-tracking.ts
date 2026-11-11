export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const VALID_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function normalizeMealType(input: string): MealType | null {
  if (!input || typeof input !== "string") return null;
  const lower = input.trim().toLowerCase();
  if (lower === "breakfast") return "breakfast";
  if (lower === "lunch") return "lunch";
  if (lower === "dinner") return "dinner";
  if (lower === "snack" || lower === "snacks") return "snack";
  return null;
}

export interface FoodCatalogueItem {
  id: string;
  name: string;
  local_name: string | null;
  category: string;
  description: string | null;
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbohydrates_per_100g: number | null;
  fat_per_100g: number | null;
  fibre_per_100g: number | null;
  serving_name: string | null;
  serving_weight_g: number | null;
  region: string | null;
  source: string | null;
  confidence_level: "high" | "medium" | "low" | "estimated";
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface FoodLogEntry {
  id: string;
  user_id: string;
  food_id: string | null;
  food_name: string;
  meal_type: MealType;
  quantity_g: number;
  serving_name: string | null;
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fibre: number | null;
  consumption_date: string;
  logged_at: string;
  notes: string | null;
  is_ai_estimate?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CalculatedNutrients {
  calories: number | null;
  protein: number | null;
  carbohydrates: number | null;
  fat: number | null;
  fibre: number | null;
}

export interface CreateFoodLogRequest {
  food_id?: string | null;
  food_name: string;
  meal_type: string;
  quantity_g: number;
  serving_name?: string | null;
  // Per-100g nutrients provided for custom/manual foods
  calories_per_100g?: number | null;
  protein_per_100g?: number | null;
  carbohydrates_per_100g?: number | null;
  fat_per_100g?: number | null;
  fibre_per_100g?: number | null;
  consumption_date?: string;
  logged_at?: string;
  notes?: string | null;
  // Any client-supplied calculated calories/nutrients will be discarded by server
  calories?: number | null;
  protein?: number | null;
  carbohydrates?: number | null;
  fat?: number | null;
  fibre?: number | null;
}

export interface UpdateFoodLogRequest {
  quantity_g?: number;
  meal_type?: string;
  notes?: string | null;
  consumption_date?: string;
  logged_at?: string;
}

export interface DailyNutritionTotals {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbohydrates: number;
  totalFat: number;
  totalFibre: number;
  entriesCount: number;
}
