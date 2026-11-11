export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

export const MEAL_TYPES: MealType[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

export interface FoodLog {
  id: string;
  user_id: string;
  food_id: string | null;
  food_name: string;
  meal_type: MealType;
  quantity_g: number;
  serving_name: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fibre: number | null;
  is_manual_entry?: boolean;
  is_ai_estimate?: boolean;
  logged_at: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFoodLogInput {
  food_id?: string | null;
  food_name: string;
  meal_type: MealType;
  quantity_g: number;
  serving_name?: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fibre?: number | null;
  is_manual_entry?: boolean;
  is_ai_estimate?: boolean;
  logged_at?: string;
}

export interface UpdateFoodLogInput {
  food_name?: string;
  meal_type?: MealType;
  quantity_g?: number;
  serving_name?: string | null;
  calories?: number;
  protein?: number;
  carbohydrates?: number;
  fat?: number;
  fibre?: number | null;
}

export interface DayNutritionSummary {
  date: string;
  totalCalories: number;
  targetCalories: number;
  caloriesRemaining: number;
  caloriesPercent: number;
  totalProtein: number;
  targetProtein: number;
  proteinRemaining: number;
  proteinPercent: number;
  totalCarbs: number;
  targetCarbs: number;
  carbsRemaining: number;
  carbsPercent: number;
  totalFat: number;
  targetFat: number;
  fatRemaining: number;
  fatPercent: number;
  totalFibre: number;
}
