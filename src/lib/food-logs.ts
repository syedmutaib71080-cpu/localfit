import { createClient } from "@/lib/supabase/client";
import type {
  FoodLog,
  CreateFoodLogInput,
  UpdateFoodLogInput,
  DayNutritionSummary,
  MealType,
} from "@/types/food-log";

const STORAGE_KEY = "localfit_food_logs_v1";

/**
 * Standard seed logs used as initial fallback for demo / guest mode.
 */
function getInitialLocalLogs(): FoodLog[] {
  const todayStr = "2026-11-11";
  return [
    {
      id: "fl-seed-1",
      user_id: "demo-user",
      food_id: "11111111-1111-4111-a111-111111111101",
      food_name: "White Rice (Cooked)",
      meal_type: "Lunch",
      quantity_g: 158,
      serving_name: "1 cup cooked (158g)",
      calories: 205,
      protein: 4.3,
      carbohydrates: 44.6,
      fat: 0.5,
      fibre: 0.6,
      logged_at: `${todayStr}T13:15:00.000Z`,
      created_at: `${todayStr}T13:15:00.000Z`,
    },
    {
      id: "fl-seed-2",
      user_id: "demo-user",
      food_id: "11111111-1111-4111-a111-111111111111",
      food_name: "Pomfret Fish (Steamed)",
      meal_type: "Lunch",
      quantity_g: 120,
      serving_name: "1 whole fillet (120g)",
      calories: 122,
      protein: 23.2,
      carbohydrates: 0,
      fat: 3.4,
      fibre: 0,
      logged_at: `${todayStr}T13:20:00.000Z`,
      created_at: `${todayStr}T13:20:00.000Z`,
    },
    {
      id: "fl-seed-3",
      user_id: "demo-user",
      food_id: "11111111-1111-4111-a111-111111111103",
      food_name: "Boiled Egg",
      meal_type: "Breakfast",
      quantity_g: 100,
      serving_name: "2 large eggs (100g)",
      calories: 155,
      protein: 12.6,
      carbohydrates: 1.1,
      fat: 10.6,
      fibre: 0,
      logged_at: `${todayStr}T08:30:00.000Z`,
      created_at: `${todayStr}T08:30:00.000Z`,
    },
  ];
}

let inMemoryLogs: FoodLog[] | null = null;

function getStoredLogs(): FoodLog[] {
  if (typeof window === "undefined") {
    if (!inMemoryLogs) {
      inMemoryLogs = getInitialLocalLogs();
    }
    return inMemoryLogs;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialLocalLogs();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw) as FoodLog[];
  } catch {
    return getInitialLocalLogs();
  }
}

function saveStoredLogs(logs: FoodLog[]): void {
  if (typeof window === "undefined") {
    inMemoryLogs = [...logs];
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch {
    // quota exceeded or private mode
  }
}

/**
 * Returns YYYY-MM-DD for a given Date in local time.
 */
export function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  if (typeof window === "undefined") {
    return "2026-11-11";
  }
  return formatDateToLocalString(new Date());
}

/**
 * Normalize any meal type to standard Title Case ('Breakfast', 'Lunch', 'Dinner', 'Snacks').
 */
export function normalizeMealType(mealType: string): MealType {
  const lower = (mealType || "").toLowerCase().trim();
  if (lower.startsWith("break")) return "Breakfast";
  if (lower.startsWith("lunch")) return "Lunch";
  if (lower.startsWith("dinn")) return "Dinner";
  return "Snacks";
}

/**
 * Fetches food logs for a given local date string (YYYY-MM-DD).
 */
export async function getFoodLogsForDate(dateStr: string): Promise<FoodLog[]> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const startOfDay = new Date(`${dateStr}T00:00:00`).toISOString();
      const endOfDay = new Date(`${dateStr}T23:59:59.999`).toISOString();

      const { data, error } = await supabase
        .from("food_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", startOfDay)
        .lte("logged_at", endOfDay)
        .order("created_at", { ascending: true });

      if (!error && data) {
        return data.map((d) => ({
          ...d,
          meal_type: normalizeMealType(d.meal_type),
        })) as FoodLog[];
      }
    }
  } catch {
    // Fallback to local storage
  }

  // Fallback: match local date substring in logged_at (YYYY-MM-DD)
  const localLogs = getStoredLogs();
  return localLogs.filter((log) => {
    const logDatePart = (log.logged_at || "").slice(0, 10);
    return logDatePart === dateStr;
  });
}

/**
 * Adds a new food log to the diary with exact snapshot values.
 */
export async function addFoodLog(input: CreateFoodLogInput): Promise<FoodLog> {
  const normalizedMeal = normalizeMealType(input.meal_type);
  const now = new Date();
  const loggedAt = input.logged_at || now.toISOString();

  const newLogPayload: Omit<FoodLog, "id" | "user_id"> = {
    food_id: input.food_id || null,
    food_name: input.food_name.trim(),
    meal_type: normalizedMeal,
    quantity_g: Math.max(0.1, Number(input.quantity_g) || 100),
    serving_name: input.serving_name || null,
    calories: Math.max(0, Math.round(Number(input.calories) || 0)),
    protein: Math.max(0, Math.round((Number(input.protein) || 0) * 10) / 10),
    carbohydrates: Math.max(0, Math.round((Number(input.carbohydrates) || 0) * 10) / 10),
    fat: Math.max(0, Math.round((Number(input.fat) || 0) * 10) / 10),
    fibre: input.fibre !== null && input.fibre !== undefined
      ? Math.max(0, Math.round(Number(input.fibre) * 10) / 10)
      : null,
    is_manual_entry: Boolean(input.is_manual_entry),
    is_ai_estimate: Boolean(input.is_ai_estimate),
    logged_at: loggedAt,
  };

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("food_logs")
        .insert([
          {
            ...newLogPayload,
            user_id: user.id,
          },
        ])
        .select()
        .single();

      if (!error && data) {
        const created = {
          ...data,
          meal_type: normalizeMealType(data.meal_type),
        } as FoodLog;

        // Sync local cache
        const localLogs = getStoredLogs();
        saveStoredLogs([created, ...localLogs]);
        return created;
      }
    }
  } catch {
    // Local fallback
  }

  // Fallback storage
  const fallbackLog: FoodLog = {
    ...newLogPayload,
    id: `fl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    user_id: "local-user",
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  const localLogs = getStoredLogs();
  saveStoredLogs([fallbackLog, ...localLogs]);
  return fallbackLog;
}

/**
 * Updates an existing food log entry.
 */
export async function updateFoodLog(
  id: string,
  updates: UpdateFoodLogInput
): Promise<FoodLog | null> {
  const safeUpdates: Partial<FoodLog> = {};

  if (updates.food_name !== undefined) safeUpdates.food_name = updates.food_name.trim();
  if (updates.meal_type !== undefined) safeUpdates.meal_type = normalizeMealType(updates.meal_type);
  if (updates.quantity_g !== undefined) safeUpdates.quantity_g = Math.max(0.1, Number(updates.quantity_g));
  if (updates.serving_name !== undefined) safeUpdates.serving_name = updates.serving_name;
  if (updates.calories !== undefined) safeUpdates.calories = Math.max(0, Math.round(Number(updates.calories)));
  if (updates.protein !== undefined) safeUpdates.protein = Math.max(0, Math.round(Number(updates.protein) * 10) / 10);
  if (updates.carbohydrates !== undefined) safeUpdates.carbohydrates = Math.max(0, Math.round(Number(updates.carbohydrates) * 10) / 10);
  if (updates.fat !== undefined) safeUpdates.fat = Math.max(0, Math.round(Number(updates.fat) * 10) / 10);
  if (updates.fibre !== undefined) safeUpdates.fibre = updates.fibre !== null ? Math.max(0, Math.round(Number(updates.fibre) * 10) / 10) : null;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase
        .from("food_logs")
        .update(safeUpdates)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();

      if (!error && data) {
        const updated = {
          ...data,
          meal_type: normalizeMealType(data.meal_type),
        } as FoodLog;

        const localLogs = getStoredLogs();
        saveStoredLogs(localLogs.map((l) => (l.id === id ? updated : l)));
        return updated;
      }
    }
  } catch {
    // Local fallback
  }

  const localLogs = getStoredLogs();
  const target = localLogs.find((l) => l.id === id);
  if (!target) return null;

  const updated: FoodLog = {
    ...target,
    ...safeUpdates,
    updated_at: new Date().toISOString(),
  };

  saveStoredLogs(localLogs.map((l) => (l.id === id ? updated : l)));
  return updated;
}

/**
 * Deletes a food log entry.
 */
export async function deleteFoodLog(id: string): Promise<boolean> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from("food_logs")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (!error) {
        const localLogs = getStoredLogs();
        saveStoredLogs(localLogs.filter((l) => l.id !== id));
        return true;
      }
    }
  } catch {
    // Local fallback
  }

  const localLogs = getStoredLogs();
  saveStoredLogs(localLogs.filter((l) => l.id !== id));
  return true;
}

/**
 * Fetches recent food logs for dashboard display (defaults to today's recent entries).
 */
export async function getRecentFoodLogs(limit = 4): Promise<FoodLog[]> {
  const todayStr = getTodayDateString();
  const logs = await getFoodLogsForDate(todayStr);
  return logs.slice(0, limit);
}

/**
 * Calculates daily nutrition summary and goal comparison from an array of food logs.
 */
export function calculateDayNutritionSummary(
  logs: FoodLog[],
  dateStr: string,
  userGoals?: {
    daily_calorie_goal?: number | null;
    daily_protein_goal?: number | null;
  }
): DayNutritionSummary {
  const targetCalories = userGoals?.daily_calorie_goal && userGoals.daily_calorie_goal > 800
    ? userGoals.daily_calorie_goal
    : 2200;

  const targetProtein = userGoals?.daily_protein_goal && userGoals.daily_protein_goal > 20
    ? userGoals.daily_protein_goal
    : Math.round((targetCalories * 0.3) / 4); // 30% ratio

  const targetCarbs = Math.round((targetCalories * 0.45) / 4); // 45% ratio
  const targetFat = Math.round((targetCalories * 0.25) / 9); // 25% ratio

  const totalCalories = logs.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
  const totalProtein = Math.round(logs.reduce((sum, item) => sum + (Number(item.protein) || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(logs.reduce((sum, item) => sum + (Number(item.carbohydrates) || 0), 0) * 10) / 10;
  const totalFat = Math.round(logs.reduce((sum, item) => sum + (Number(item.fat) || 0), 0) * 10) / 10;
  const totalFibre = Math.round(logs.reduce((sum, item) => sum + (Number(item.fibre) || 0), 0) * 10) / 10;

  return {
    date: dateStr,
    totalCalories,
    targetCalories,
    caloriesRemaining: Math.max(0, targetCalories - totalCalories),
    caloriesPercent: targetCalories > 0 ? Math.min(100, Math.round((totalCalories / targetCalories) * 100)) : 0,
    totalProtein,
    targetProtein,
    proteinRemaining: Math.max(0, Math.round((targetProtein - totalProtein) * 10) / 10),
    proteinPercent: targetProtein > 0 ? Math.min(100, Math.round((totalProtein / targetProtein) * 100)) : 0,
    totalCarbs,
    targetCarbs,
    carbsRemaining: Math.max(0, Math.round((targetCarbs - totalCarbs) * 10) / 10),
    carbsPercent: targetCarbs > 0 ? Math.min(100, Math.round((totalCarbs / targetCarbs) * 100)) : 0,
    totalFat,
    targetFat,
    fatRemaining: Math.max(0, Math.round((targetFat - totalFat) * 10) / 10),
    fatPercent: targetFat > 0 ? Math.min(100, Math.round((totalFat / targetFat) * 100)) : 0,
    totalFibre,
  };
}
