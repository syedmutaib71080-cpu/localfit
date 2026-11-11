export type FoodCategory =
  | "Rice and grains"
  | "Bread and roti"
  | "Seafood"
  | "Chicken and meat"
  | "Eggs"
  | "Dairy"
  | "Vegetables"
  | "Fruits"
  | "Pulses and legumes"
  | "Snacks"
  | "Beverages"
  | "Indian regional dishes"
  | "Coastal Karnataka dishes";

export const ALL_FOOD_CATEGORIES: FoodCategory[] = [
  "Rice and grains",
  "Bread and roti",
  "Seafood",
  "Chicken and meat",
  "Eggs",
  "Dairy",
  "Vegetables",
  "Fruits",
  "Pulses and legumes",
  "Snacks",
  "Beverages",
  "Indian regional dishes",
  "Coastal Karnataka dishes",
];

export type ConfidenceLevel = "high" | "medium" | "low" | "estimated";

export type ServingUnit =
  | "gram"
  | "ml"
  | "piece"
  | "cup"
  | "bowl"
  | "roti"
  | "tbsp"
  | "serving";

export interface FoodServing {
  id?: string;
  food_id?: string;
  serving_unit: string;
  serving_label: string;
  weight_g: number;
  is_default: boolean;
}

export interface FoodItem {
  id: string;
  name: string;
  local_name: string | null;
  category: FoodCategory;
  description: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbohydrates_per_100g: number;
  fat_per_100g: number;
  fibre_per_100g: number | null;
  serving_name: string | null;
  serving_weight_g: number | null;
  region: string | null;
  source: string | null;
  confidence_level: ConfidenceLevel;
  is_verified: boolean;
  servings?: FoodServing[];
  created_at?: string;
  updated_at?: string;
}

export interface CalculatedNutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  weightG: number;
  servingLabel: string;
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  food_id?: string | null;
  ingredient_name: string;
  quantity: number;
  unit: string;
  weight_g: number;
  is_oil_or_fat: boolean;
  notes?: string | null;
}

export interface Recipe {
  id: string;
  food_id?: string | null;
  name: string;
  local_name: string | null;
  region: string;
  description: string | null;
  cooking_method: string | null;
  servings_yield: number;
  total_cooked_weight_g: number | null;
  is_verified: boolean;
  confidence_level: ConfidenceLevel;
  source: string | null;
  ingredients?: RecipeIngredient[];
}
