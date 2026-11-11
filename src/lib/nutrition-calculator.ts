import type {
  CalculatedNutrients,
  DailyNutritionTotals,
  FoodLogEntry,
  MealType,
} from "@/types/nutrition-tracking";
import { normalizeMealType } from "@/types/nutrition-tracking";
import type {
  FoodItem,
  FoodServing,
  CalculatedNutrients as ClientCalculatedNutrients,
} from "@/types/nutrition";

export interface ValidatedFoodLogInput {
  food_id: string | null;
  food_name: string;
  meal_type: MealType;
  quantity_g: number;
  serving_name: string | null;
  consumption_date: string;
  logged_at: string;
  notes: string | null;
  // Per-100g values for custom/manual foods
  calories_per_100g: number | null;
  protein_per_100g: number | null;
  carbohydrates_per_100g: number | null;
  fat_per_100g: number | null;
  fibre_per_100g: number | null;
}

export interface ValidationResult<T> {
  valid: boolean;
  error?: string;
  data?: T;
}

/**
 * Calculates a single nutrient amount based on the per-100g value and portion weight in grams.
 * 
 * Formula: (nutrientPer100g * quantityG) / 100
 * 
 * Rules:
 * - If nutrientPer100g is null or undefined, returns null.
 * - Unknown nutrients are never converted to 0.
 * - If quantityG is non-positive or non-finite, returns null.
 * - Rounded to 1 decimal place.
 */
export function calculateNutrientAmount(
  nutrientPer100g: number | null | undefined,
  quantityG: number
): number | null {
  if (nutrientPer100g === null || nutrientPer100g === undefined) {
    return null;
  }

  if (
    typeof nutrientPer100g !== "number" ||
    !Number.isFinite(nutrientPer100g) ||
    nutrientPer100g < 0
  ) {
    return null;
  }

  if (
    typeof quantityG !== "number" ||
    !Number.isFinite(quantityG) ||
    quantityG <= 0
  ) {
    return null;
  }

  const raw = (nutrientPer100g * quantityG) / 100;
  return Math.round(raw * 10) / 10;
}

/**
 * Calculates all macronutrients and fiber for a given portion weight in grams.
 * Discards any client-supplied calculated values.
 */
export function calculateFoodNutrients(
  per100g: {
    calories_per_100g?: number | null;
    protein_per_100g?: number | null;
    carbohydrates_per_100g?: number | null;
    fat_per_100g?: number | null;
    fibre_per_100g?: number | null;
  },
  quantityG: number
): CalculatedNutrients {
  return {
    calories: calculateNutrientAmount(per100g.calories_per_100g, quantityG),
    protein: calculateNutrientAmount(per100g.protein_per_100g, quantityG),
    carbohydrates: calculateNutrientAmount(per100g.carbohydrates_per_100g, quantityG),
    fat: calculateNutrientAmount(per100g.fat_per_100g, quantityG),
    fibre: calculateNutrientAmount(per100g.fibre_per_100g, quantityG),
  };
}

/**
 * Validates a per-100g nutrient value.
 * Must be finite, non-negative, or null/undefined.
 */
function validateNutrientPer100g(
  value: unknown,
  name: string,
  maxAllowed: number
): { valid: boolean; value: number | null; error?: string } {
  if (value === undefined || value === null || value === "") {
    return { valid: true, value: null };
  }

  if (typeof value !== "number" || !Number.isFinite(value)) {
    return {
      valid: false,
      value: null,
      error: `${name} must be a valid finite number or null`,
    };
  }

  if (value < 0) {
    return {
      valid: false,
      value: null,
      error: `${name} cannot be negative`,
    };
  }

  if (value > maxAllowed) {
    return {
      valid: false,
      value: null,
      error: `${name} exceeds realistic maximum (${maxAllowed})`,
    };
  }

  return { valid: true, value };
}

/**
 * Validates food log creation payload.
 */
export function validateFoodLogInput(
  input: unknown
): ValidationResult<ValidatedFoodLogInput> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const data = input as Record<string, unknown>;

  // 1. Food Name
  if (typeof data.food_name !== "string" || !data.food_name.trim()) {
    return { valid: false, error: "food_name is required and cannot be empty" };
  }
  const food_name = data.food_name.trim();
  if (food_name.length > 200) {
    return { valid: false, error: "food_name cannot exceed 200 characters" };
  }

  // 2. Quantity (g)
  if (data.quantity_g === undefined || data.quantity_g === null) {
    return { valid: false, error: "quantity_g is required" };
  }
  if (typeof data.quantity_g !== "number" || !Number.isFinite(data.quantity_g)) {
    return { valid: false, error: "quantity_g must be a valid finite number" };
  }
  if (data.quantity_g <= 0) {
    return { valid: false, error: "quantity_g must be strictly greater than 0" };
  }
  if (data.quantity_g > 10000) {
    return { valid: false, error: "quantity_g cannot exceed 10,000 grams (10 kg)" };
  }
  const quantity_g = Math.round(data.quantity_g * 10) / 10;

  // 3. Meal Type
  if (typeof data.meal_type !== "string") {
    return { valid: false, error: "meal_type is required" };
  }
  const meal_type = normalizeMealType(data.meal_type);
  if (!meal_type) {
    return {
      valid: false,
      error: "Invalid meal_type. Allowed values are: breakfast, lunch, dinner, snack",
    };
  }

  // 4. Notes (max 2000 chars)
  let notes: string | null = null;
  if (data.notes !== undefined && data.notes !== null) {
    if (typeof data.notes !== "string") {
      return { valid: false, error: "notes must be a string or null" };
    }
    if (data.notes.length > 2000) {
      return { valid: false, error: "notes cannot exceed 2,000 characters" };
    }
    notes = data.notes.trim() || null;
  }

  // 5. Serving Name
  let serving_name: string | null = null;
  if (data.serving_name !== undefined && data.serving_name !== null) {
    if (typeof data.serving_name !== "string") {
      return { valid: false, error: "serving_name must be a string or null" };
    }
    if (data.serving_name.length > 100) {
      return { valid: false, error: "serving_name cannot exceed 100 characters" };
    }
    serving_name = data.serving_name.trim() || null;
  }

  // 6. Food ID
  let food_id: string | null = null;
  if (data.food_id !== undefined && data.food_id !== null) {
    if (typeof data.food_id !== "string") {
      return { valid: false, error: "food_id must be a string or null" };
    }
    food_id = data.food_id.trim() || null;
  }

  // 7. Consumption Date (YYYY-MM-DD)
  let consumption_date = new Date().toISOString().split("T")[0];
  if (data.consumption_date !== undefined && data.consumption_date !== null) {
    if (typeof data.consumption_date !== "string") {
      return { valid: false, error: "consumption_date must be a string in YYYY-MM-DD format" };
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(data.consumption_date.trim())) {
      return { valid: false, error: "consumption_date must be formatted as YYYY-MM-DD" };
    }
    const parsedDate = new Date(data.consumption_date.trim());
    if (isNaN(parsedDate.getTime())) {
      return { valid: false, error: "consumption_date is not a valid date" };
    }
    consumption_date = data.consumption_date.trim();
  }

  // 8. Logged At
  let logged_at = new Date().toISOString();
  if (data.logged_at !== undefined && data.logged_at !== null) {
    if (typeof data.logged_at !== "string") {
      return { valid: false, error: "logged_at must be an ISO timestamp string" };
    }
    const parsedTime = new Date(data.logged_at);
    if (isNaN(parsedTime.getTime())) {
      return { valid: false, error: "logged_at is not a valid timestamp" };
    }
    logged_at = parsedTime.toISOString();
  }

  // 9. Per-100g nutrients validation (if provided)
  const calCheck = validateNutrientPer100g(data.calories_per_100g, "calories_per_100g", 950);
  if (!calCheck.valid) return { valid: false, error: calCheck.error };

  const protCheck = validateNutrientPer100g(data.protein_per_100g, "protein_per_100g", 100);
  if (!protCheck.valid) return { valid: false, error: protCheck.error };

  const carbCheck = validateNutrientPer100g(data.carbohydrates_per_100g, "carbohydrates_per_100g", 100);
  if (!carbCheck.valid) return { valid: false, error: carbCheck.error };

  const fatCheck = validateNutrientPer100g(data.fat_per_100g, "fat_per_100g", 100);
  if (!fatCheck.valid) return { valid: false, error: fatCheck.error };

  const fibCheck = validateNutrientPer100g(data.fibre_per_100g, "fibre_per_100g", 100);
  if (!fibCheck.valid) return { valid: false, error: fibCheck.error };

  return {
    valid: true,
    data: {
      food_id,
      food_name,
      meal_type,
      quantity_g,
      serving_name,
      consumption_date,
      logged_at,
      notes,
      calories_per_100g: calCheck.value,
      protein_per_100g: protCheck.value,
      carbohydrates_per_100g: carbCheck.value,
      fat_per_100g: fatCheck.value,
      fibre_per_100g: fibCheck.value,
    },
  };
}

/**
 * Validates food log update payload.
 */
export function validateFoodLogUpdate(
  input: unknown
): ValidationResult<{
  quantity_g?: number;
  meal_type?: MealType;
  notes?: string | null;
  consumption_date?: string;
  logged_at?: string;
}> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const data = input as Record<string, unknown>;
  const result: {
    quantity_g?: number;
    meal_type?: MealType;
    notes?: string | null;
    consumption_date?: string;
    logged_at?: string;
  } = {};

  if (data.quantity_g !== undefined) {
    if (typeof data.quantity_g !== "number" || !Number.isFinite(data.quantity_g)) {
      return { valid: false, error: "quantity_g must be a valid finite number" };
    }
    if (data.quantity_g <= 0) {
      return { valid: false, error: "quantity_g must be strictly greater than 0" };
    }
    if (data.quantity_g > 10000) {
      return { valid: false, error: "quantity_g cannot exceed 10,000 grams (10 kg)" };
    }
    result.quantity_g = Math.round(data.quantity_g * 10) / 10;
  }

  if (data.meal_type !== undefined) {
    if (typeof data.meal_type !== "string") {
      return { valid: false, error: "meal_type must be a string" };
    }
    const normalized = normalizeMealType(data.meal_type);
    if (!normalized) {
      return {
        valid: false,
        error: "Invalid meal_type. Allowed values are: breakfast, lunch, dinner, snack",
      };
    }
    result.meal_type = normalized;
  }

  if (data.notes !== undefined) {
    if (data.notes !== null && typeof data.notes !== "string") {
      return { valid: false, error: "notes must be a string or null" };
    }
    if (typeof data.notes === "string" && data.notes.length > 2000) {
      return { valid: false, error: "notes cannot exceed 2,000 characters" };
    }
    result.notes = data.notes ? data.notes.trim() : null;
  }

  if (data.consumption_date !== undefined) {
    if (typeof data.consumption_date !== "string") {
      return { valid: false, error: "consumption_date must be a string in YYYY-MM-DD format" };
    }
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(data.consumption_date.trim())) {
      return { valid: false, error: "consumption_date must be formatted as YYYY-MM-DD" };
    }
    const parsedDate = new Date(data.consumption_date.trim());
    if (isNaN(parsedDate.getTime())) {
      return { valid: false, error: "consumption_date is not a valid date" };
    }
    result.consumption_date = data.consumption_date.trim();
  }

  if (data.logged_at !== undefined) {
    if (typeof data.logged_at !== "string") {
      return { valid: false, error: "logged_at must be an ISO timestamp string" };
    }
    const parsedTime = new Date(data.logged_at);
    if (isNaN(parsedTime.getTime())) {
      return { valid: false, error: "logged_at is not a valid timestamp" };
    }
    result.logged_at = parsedTime.toISOString();
  }

  if (Object.keys(result).length === 0) {
    return { valid: false, error: "At least one valid field must be provided for update" };
  }

  return { valid: true, data: result };
}

/**
 * Aggregates daily nutrition totals for a set of food log entries.
 * Null nutrients are ignored during summation, never treated as 0.
 */
export function aggregateDailyTotals(
  date: string,
  entries: FoodLogEntry[]
): DailyNutritionTotals {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbohydrates = 0;
  let totalFat = 0;
  let totalFibre = 0;

  for (const entry of entries) {
    if (typeof entry.calories === "number" && Number.isFinite(entry.calories)) {
      totalCalories += entry.calories;
    }
    if (typeof entry.protein === "number" && Number.isFinite(entry.protein)) {
      totalProtein += entry.protein;
    }
    if (typeof entry.carbohydrates === "number" && Number.isFinite(entry.carbohydrates)) {
      totalCarbohydrates += entry.carbohydrates;
    }
    if (typeof entry.fat === "number" && Number.isFinite(entry.fat)) {
      totalFat += entry.fat;
    }
    if (typeof entry.fibre === "number" && Number.isFinite(entry.fibre)) {
      totalFibre += entry.fibre;
    }
  }

  return {
    date,
    totalCalories: Math.round(totalCalories * 10) / 10,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbohydrates: Math.round(totalCarbohydrates * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    totalFibre: Math.round(totalFibre * 10) / 10,
    entriesCount: entries.length,
  };
}

/**
 * Validates a numeric quantity in grams for UI components.
 */
export function validateQuantity(weight: unknown): {
  isValid: boolean;
  weight: number;
  error?: string;
} {
  if (typeof weight !== "number" || !Number.isFinite(weight)) {
    return {
      isValid: false,
      weight: 0,
      error: "Please enter a valid numeric portion weight.",
    };
  }
  if (weight <= 0) {
    return {
      isValid: false,
      weight: 0,
      error: "Portion weight must be strictly greater than 0 grams.",
    };
  }
  if (weight > 10000) {
    return {
      isValid: false,
      weight: 0,
      error: "Portion weight cannot exceed 10,000 grams (10 kg).",
    };
  }
  return { isValid: true, weight: Math.round(weight * 10) / 10 };
}

/**
 * Gets the default serving for a food item.
 */
export function getDefaultServing(food: FoodItem): FoodServing {
  if (food.servings && food.servings.length > 0) {
    const defaultServing = food.servings.find((s) => s.is_default);
    if (defaultServing) return defaultServing;
    return food.servings[0];
  }
  return {
    serving_unit: "gram",
    serving_label: "100 grams standard",
    weight_g: food.serving_weight_g || 100,
    is_default: true,
  };
}

/**
 * Client UI calculation helper for displaying nutrients in modals.
 */
export function calculateNutrients(
  food: FoodItem,
  weightG: number,
  servingLabel?: string
): ClientCalculatedNutrients {
  const effectiveWeight = Math.max(0.1, weightG);
  const factor = effectiveWeight / 100;

  const rawCalories = (food.calories_per_100g || 0) * factor;
  const rawProtein = (food.protein_per_100g || 0) * factor;
  const rawCarbs = (food.carbohydrates_per_100g || 0) * factor;
  const rawFat = (food.fat_per_100g || 0) * factor;
  const rawFibre = (food.fibre_per_100g || 0) * factor;

  return {
    calories: Math.round(rawCalories),
    protein: Math.round(rawProtein * 10) / 10,
    carbs: Math.round(rawCarbs * 10) / 10,
    fat: Math.round(rawFat * 10) / 10,
    fibre: Math.round(rawFibre * 10) / 10,
    weightG: Math.round(effectiveWeight * 10) / 10,
    servingLabel: servingLabel || `${Math.round(effectiveWeight)}g portion`,
  };
}
