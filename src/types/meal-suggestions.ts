export type MealCategory = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export interface MealSuggestionItem {
  id: string;
  meal_category: MealCategory;
  food_name: string;
  local_name?: string | null;
  serving_size: string;
  portion_grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g?: number | null;
  why_suggested: string;
  is_verified: boolean;
  is_ai_estimate: boolean;
  catalogue_id: string | null;
  source?: string | null;
  confidence_note?: string;
  recipe_id?: string | null;
}

export interface MealSuggestionsSummary {
  calorie_goal: number | null;
  protein_goal: number | null;
  calories_consumed: number;
  protein_consumed: number;
  calories_remaining: number | null;
  protein_remaining: number | null;
  target_date: string;
  logged_meal_count: number;
}

export interface MealSuggestionsResponse {
  success: boolean;
  suggestions: MealSuggestionItem[];
  summary: MealSuggestionsSummary;
  disclaimer: string;
  code?: string;
  error?: string;
  message?: string;
}

export interface MealSuggestionsRequestPayload {
  targetDate?: string;
  mealCategory?: MealCategory | "All";
  timezone?: string;
}
