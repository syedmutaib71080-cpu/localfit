import type {
  FoodCatalogueItem,
  FoodLogEntry,
  DailyNutritionTotals,
  CreateFoodLogRequest,
  UpdateFoodLogRequest,
  MealType,
} from "@/types/nutrition-tracking";

/**
 * Returns today's local date as YYYY-MM-DD.
 * Uses local time components to completely prevent timezone drift.
 */
export function getTodayDateString(): string {
  if (typeof window === "undefined") {
    return "2026-11-11";
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date object to YYYY-MM-DD using local time components.
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Adds or subtracts days from a YYYY-MM-DD string without timezone offset drift.
 */
export function shiftDateString(dateStr: string, deltaDays: number): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return getTodayDateString();
  }
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + deltaDays);
  return formatDateToLocalString(d);
}

/**
 * Formats YYYY-MM-DD to a human-readable display string (e.g. "Wednesday, Nov 11, 2026").
 */
export function formatDisplayDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return dateStr;
  }
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Validates a YYYY-MM-DD date string format and value.
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== "string") return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const parts = dateStr.split("-").map(Number);
  const [y, m, d] = parts;
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const testDate = new Date(y, m - 1, d);
  return (
    testDate.getFullYear() === y &&
    testDate.getMonth() === m - 1 &&
    testDate.getDate() === d
  );
}

/**
 * Computes meal-level nutrient totals for an array of FoodLogEntry items.
 */
export interface MealTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fibre: number;
  count: number;
}

export function calculateMealTotals(entries: FoodLogEntry[]): MealTotals {
  let calories = 0;
  let protein = 0;
  let carbohydrates = 0;
  let fat = 0;
  let fibre = 0;

  for (const item of entries) {
    if (typeof item.calories === "number" && Number.isFinite(item.calories)) {
      calories += item.calories;
    }
    if (typeof item.protein === "number" && Number.isFinite(item.protein)) {
      protein += item.protein;
    }
    if (typeof item.carbohydrates === "number" && Number.isFinite(item.carbohydrates)) {
      carbohydrates += item.carbohydrates;
    }
    if (typeof item.fat === "number" && Number.isFinite(item.fat)) {
      fat += item.fat;
    }
    if (typeof item.fibre === "number" && Number.isFinite(item.fibre)) {
      fibre += item.fibre;
    }
  }

  return {
    calories: Math.round(calories * 10) / 10,
    protein: Math.round(protein * 10) / 10,
    carbohydrates: Math.round(carbohydrates * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fibre: Math.round(fibre * 10) / 10,
    count: entries.length,
  };
}

/**
 * Calculates calorie & protein goal comparisons safely without fabricating missing goals.
 */
export interface TargetComparison {
  calorieTarget: number | null;
  caloriesRemaining: number | null;
  calorieProgressPercent: number | null;
  proteinTarget: number | null;
  proteinRemaining: number | null;
  proteinProgressPercent: number | null;
  hasCalorieGoal: boolean;
  hasProteinGoal: boolean;
}

export function calculateTargetComparison(
  totals: DailyNutritionTotals | null,
  goals?: {
    daily_calorie_goal?: number | null;
    daily_protein_goal?: number | null;
  }
): TargetComparison {
  const consumedCalories = totals ? totals.totalCalories : 0;
  const consumedProtein = totals ? totals.totalProtein : 0;

  const rawCalTarget = goals?.daily_calorie_goal;
  const hasCalorieGoal =
    typeof rawCalTarget === "number" && Number.isFinite(rawCalTarget) && rawCalTarget > 0;
  const calorieTarget = hasCalorieGoal ? rawCalTarget : null;
  const caloriesRemaining =
    calorieTarget !== null ? Math.max(0, Math.round(calorieTarget - consumedCalories)) : null;
  const calorieProgressPercent =
    calorieTarget !== null && calorieTarget > 0
      ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100))
      : null;

  const rawProtTarget = goals?.daily_protein_goal;
  const hasProteinGoal =
    typeof rawProtTarget === "number" && Number.isFinite(rawProtTarget) && rawProtTarget > 0;
  const proteinTarget = hasProteinGoal ? rawProtTarget : null;
  const proteinRemaining =
    proteinTarget !== null
      ? Math.max(0, Math.round((proteinTarget - consumedProtein) * 10) / 10)
      : null;
  const proteinProgressPercent =
    proteinTarget !== null && proteinTarget > 0
      ? Math.min(100, Math.round((consumedProtein / proteinTarget) * 100))
      : null;

  return {
    calorieTarget,
    caloriesRemaining,
    calorieProgressPercent,
    proteinTarget,
    proteinRemaining,
    proteinProgressPercent,
    hasCalorieGoal,
    hasProteinGoal,
  };
}

/**
 * Fetches food items from the catalogue API (/api/food/items).
 */
export async function fetchFoodCatalogue(params: {
  q?: string;
  category?: string;
  limit?: number;
}): Promise<{ items: FoodCatalogueItem[]; total: number; error?: string }> {
  try {
    const searchParams = new URLSearchParams();
    if (params.q?.trim()) {
      searchParams.set("q", params.q.trim());
    }
    if (params.category && params.category !== "all") {
      searchParams.set("category", params.category);
    }
    if (params.limit) {
      searchParams.set("limit", String(params.limit));
    }

    const queryStr = searchParams.toString();
    const url = queryStr ? `/api/food/items?${queryStr}` : "/api/food/items";

    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        items: [],
        total: 0,
        error: errData.error || `Failed to fetch foods (${res.status})`,
      };
    }

    const data = await res.json();
    return {
      items: (data.items || []) as FoodCatalogueItem[],
      total: data.total || 0,
    };
  } catch (err) {
    return {
      items: [],
      total: 0,
      error: err instanceof Error ? err.message : "Network error fetching food items",
    };
  }
}

/**
 * Fetches food logs and daily totals for a specific date (/api/food/logs?date=YYYY-MM-DD).
 */
export async function fetchDailyFoodLogs(date: string): Promise<{
  logs: FoodLogEntry[];
  totals: DailyNutritionTotals | null;
  count: number;
  unauthorized?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/food/logs?date=${encodeURIComponent(date)}`);
    if (res.status === 401) {
      return {
        logs: [],
        totals: null,
        count: 0,
        unauthorized: true,
        error: "User is not authenticated. Please log in to view food logs.",
      };
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        logs: [],
        totals: null,
        count: 0,
        error: errData.error || `Failed to fetch food logs (${res.status})`,
      };
    }

    const data = await res.json();
    return {
      logs: (data.logs || []) as FoodLogEntry[],
      totals: (data.totals || null) as DailyNutritionTotals | null,
      count: data.count || 0,
    };
  } catch (err) {
    return {
      logs: [],
      totals: null,
      count: 0,
      error: err instanceof Error ? err.message : "Network error fetching food logs",
    };
  }
}

/**
 * Creates a new food log entry via POST /api/food/logs.
 */
export async function createFoodLog(
  payload: CreateFoodLogRequest
): Promise<{ success: boolean; log?: FoodLogEntry; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetch("/api/food/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 401) {
      return {
        success: false,
        unauthorized: true,
        error: "Session expired or unauthenticated. Please sign in.",
      };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Failed to create food log (${res.status})`,
      };
    }

    return {
      success: true,
      log: data.log as FoodLogEntry,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error creating food log",
    };
  }
}

/**
 * Updates a food log entry via PATCH /api/food/logs/[id].
 */
export async function updateFoodLog(
  id: string,
  updates: UpdateFoodLogRequest
): Promise<{ success: boolean; log?: FoodLogEntry; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetch(`/api/food/logs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.status === 401) {
      return {
        success: false,
        unauthorized: true,
        error: "Session expired or unauthenticated. Please sign in.",
      };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Failed to update food log (${res.status})`,
      };
    }

    return {
      success: true,
      log: data.log as FoodLogEntry,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error updating food log",
    };
  }
}

/**
 * Deletes a food log entry via DELETE /api/food/logs/[id].
 */
export async function deleteFoodLog(
  id: string
): Promise<{ success: boolean; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetch(`/api/food/logs/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (res.status === 401) {
      return {
        success: false,
        unauthorized: true,
        error: "Session expired or unauthenticated. Please sign in.",
      };
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        success: false,
        error: data.error || `Failed to delete food log (${res.status})`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error deleting food log",
    };
  }
}

/**
 * Filters food logs by meal type.
 */
export function filterLogsByMeal(
  logs: FoodLogEntry[],
  mealType: MealType
): FoodLogEntry[] {
  return logs.filter((l) => l.meal_type === mealType);
}
