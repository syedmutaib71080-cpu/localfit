import type { MealType } from "@/types/food-log";

export type FoodScanSource = "database_match" | "recipe_calculated" | "ai_estimate";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface FoodScanIngredient {
  name: string;
  estimated_weight_g?: number;
  confidence?: number;
  notes?: string;
  matched_database_food_id?: string | null;
}

/**
 * Represents a single distinct food item identified by the AI on a plate/meal.
 */
export interface IdentifiedFoodItem {
  id: string; // unique identifier for frontend tracking (e.g., item_1)
  food_name: string;
  alternative_names: string[];
  category: string;
  portion_grams: number;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  fibre_g: number | null;
  confidence: ConfidenceLevel;
  confidence_score?: number; // 0 - 100
  notes: string;
  is_catalogue_match: boolean;
  matched_database_food_id: string | null;
  matched_database_food_name: string | null;
  nutrition_per_100g: {
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fibre: number | null;
  };
  selected_for_saving?: boolean;
}

/**
 * Comprehensive Food Scan Estimate returned by the server.
 * Supports both multi-item meal scans and backward-compatible single-item fields.
 */
export interface FoodScanEstimate {
  is_food_detected: boolean;
  meal_summary?: string;
  items: IdentifiedFoodItem[];
  // Legacy / top-level convenience fields for primary identified dish
  food_name: string;
  alternative_names: string[];
  ingredients: FoodScanIngredient[];
  cooking_method: string;
  estimated_weight_g: number;
  estimated_calories: number;
  estimated_protein: number;
  estimated_carbohydrates: number;
  estimated_fat: number;
  estimated_fibre: number | null;
  confidence: number; // 0 - 100
  uncertainty_notes: string;
  estimation_source: FoodScanSource;
  matched_database_food_id?: string | null;
  matched_database_food_name?: string | null;
  nutrition_per_100g: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    fibre: number | null;
  };
}

export type ScanErrorCode =
  | "API_KEY_MISSING"
  | "UNAUTHORIZED"
  | "RATE_LIMIT_EXCEEDED"
  | "QUOTA_EXCEEDED"
  | "INVALID_IMAGE"
  | "PAYLOAD_TOO_LARGE"
  | "NO_FOOD_DETECTED"
  | "MODEL_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN_ERROR";

export interface FoodScanSuccessResponse {
  success: true;
  data: FoodScanEstimate;
  model: string;
}

export interface FoodScanErrorResponse {
  success: false;
  error: string;
  message: string;
  code: ScanErrorCode;
}

export type FoodScanApiResponse = FoodScanSuccessResponse | FoodScanErrorResponse;

export type ScannerScreenState =
  | "waiting_for_image"
  | "image_selected"
  | "scanning"
  | "results_ready"
  | "scan_failed"
  | "api_key_not_configured"
  | "unauthorized"
  | "quota_exceeded"
  | "unsupported_image"
  | "payload_too_large"
  | "no_food_detected";

export interface SaveScannedFoodInput {
  food_name: string;
  meal_type: MealType;
  quantity_g: number;
  serving_name?: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fibre: number | null;
  food_id?: string | null;
}
