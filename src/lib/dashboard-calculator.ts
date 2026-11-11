import type { FoodLogEntry, DailyNutritionTotals } from "@/types/nutrition-tracking";

export interface WeeklyNutritionDay {
  date: string;
  dayLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  entriesCount: number;
}

export interface MacroDistribution {
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  totalMacroCalories: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
}

export interface UserProfileGoals {
  daily_calorie_goal?: number | null;
  daily_protein_goal?: number | null;
  // Note: Step and activity goals are not in the profiles table schema.
}

export interface GoalProgressItem {
  id: "calories" | "protein" | "steps" | "activity";
  title: string;
  targetValue: number | null;
  currentValue: number;
  unit: string;
  percent: number | null;
  isConfigured: boolean;
  statusText: string;
  note?: string;
}

/**
 * Fetches food logs for a date range via existing GET /api/food/logs?startDate=...&endDate=...
 */
export async function fetchFoodLogsRange(
  startDate: string,
  endDate: string
): Promise<{ logs: FoodLogEntry[]; error?: string; unauthorized?: boolean }> {
  try {
    const res = await fetch(
      `/api/food/logs?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&limit=200`
    );
    if (res.status === 401) {
      return { logs: [], unauthorized: true, error: "Unauthorized" };
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { logs: [], error: err.error || `HTTP ${res.status}` };
    }
    const data = await res.json();
    return { logs: (data.logs || []) as FoodLogEntry[] };
  } catch (err) {
    return {
      logs: [],
      error: err instanceof Error ? err.message : "Network error fetching food range",
    };
  }
}

/**
 * Computes a 7-day rolling daily nutrition summary leading up to and including endDateStr.
 * Timezone-safe and deterministic.
 */
export function computeWeeklyNutritionSummary(
  endDateStr: string,
  logs: FoodLogEntry[]
): WeeklyNutritionDay[] {
  const result: WeeklyNutritionDay[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const parts = endDateStr.split("-").map(Number);
  const endYear = parts[0] || 2026;
  const endMonth = (parts[1] || 11) - 1;
  const endDay = parts[2] || 11;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(endYear, endMonth, endDay);
    d.setDate(d.getDate() - i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const curDateStr = `${year}-${month}-${day}`;
    const dayLabel = dayNames[d.getDay()];

    const dayLogs = logs.filter((l) => l.consumption_date === curDateStr);

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const log of dayLogs) {
      if (typeof log.calories === "number" && Number.isFinite(log.calories)) {
        calories += log.calories;
      }
      if (typeof log.protein === "number" && Number.isFinite(log.protein)) {
        protein += log.protein;
      }
      if (typeof log.carbohydrates === "number" && Number.isFinite(log.carbohydrates)) {
        carbs += log.carbohydrates;
      }
      if (typeof log.fat === "number" && Number.isFinite(log.fat)) {
        fat += log.fat;
      }
    }

    result.push({
      date: curDateStr,
      dayLabel,
      calories: Math.round(calories * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      entriesCount: dayLogs.length,
    });
  }

  return result;
}

/**
 * Calculates macronutrient caloric distribution and percentage split.
 * Uses standard nutritional Atwater equivalents:
 * - Protein: 4 kcal/g
 * - Carbohydrates: 4 kcal/g
 * - Fat: 9 kcal/g
 * Safely handles 0 totals without producing NaN or DivisionByZero.
 */
export function calculateMacroDistribution(
  totals: DailyNutritionTotals | null | {
    totalProtein?: number | null;
    totalCarbohydrates?: number | null;
    totalFat?: number | null;
  }
): MacroDistribution {
  const proteinGrams = Math.max(0, totals?.totalProtein || 0);
  const carbsGrams = Math.max(0, totals?.totalCarbohydrates || 0);
  const fatGrams = Math.max(0, totals?.totalFat || 0);

  const proteinCalories = Math.round(proteinGrams * 4 * 10) / 10;
  const carbsCalories = Math.round(carbsGrams * 4 * 10) / 10;
  const fatCalories = Math.round(fatGrams * 9 * 10) / 10;
  const totalMacroCalories = Math.round((proteinCalories + carbsCalories + fatCalories) * 10) / 10;

  if (totalMacroCalories <= 0) {
    return {
      proteinGrams: Math.round(proteinGrams * 10) / 10,
      carbsGrams: Math.round(carbsGrams * 10) / 10,
      fatGrams: Math.round(fatGrams * 10) / 10,
      proteinCalories: 0,
      carbsCalories: 0,
      fatCalories: 0,
      totalMacroCalories: 0,
      proteinPercent: 0,
      carbsPercent: 0,
      fatPercent: 0,
    };
  }

  const proteinPercent = Math.round((proteinCalories / totalMacroCalories) * 100);
  const carbsPercent = Math.round((carbsCalories / totalMacroCalories) * 100);
  // Guarantee exact 100% sum for visual consistency
  const fatPercent = Math.max(0, 100 - proteinPercent - carbsPercent);

  return {
    proteinGrams: Math.round(proteinGrams * 10) / 10,
    carbsGrams: Math.round(carbsGrams * 10) / 10,
    fatGrams: Math.round(fatGrams * 10) / 10,
    proteinCalories,
    carbsCalories,
    fatCalories,
    totalMacroCalories,
    proteinPercent,
    carbsPercent,
    fatPercent,
  };
}

/**
 * Formats duration in seconds to a human-friendly string.
 * e.g. 1800 -> "30m", 4500 -> "1h 15m", 0 -> "0m"
 */
export function formatActiveDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "0m";
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours === 0) {
    return `${Math.max(1, minutes)}m`;
  }
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Calculates net calorie balance (Consumed - Burned).
 */
export function calculateNetCalories(consumed: number, burned: number): number {
  const safeConsumed = Number.isFinite(consumed) && consumed > 0 ? consumed : 0;
  const safeBurned = Number.isFinite(burned) && burned > 0 ? burned : 0;
  return Math.round(safeConsumed - safeBurned);
}

/**
 * Evaluates goal progress strictly against real profile settings.
 * NEVER adds default targets or fabricates missing goals.
 */
export function evaluateGoalProgress(
  goals: UserProfileGoals | undefined,
  currentValues: {
    consumedCalories: number;
    consumedProtein: number;
    steps: number;
    activeMinutes: number;
  }
): GoalProgressItem[] {
  // 1. Calorie Goal
  const calTarget = goals?.daily_calorie_goal;
  const hasCalGoal = typeof calTarget === "number" && Number.isFinite(calTarget) && calTarget > 0;
  const calPercent = hasCalGoal ? Math.min(100, Math.round((currentValues.consumedCalories / calTarget) * 100)) : null;

  // 2. Protein Goal
  const protTarget = goals?.daily_protein_goal;
  const hasProtGoal = typeof protTarget === "number" && Number.isFinite(protTarget) && protTarget > 0;
  const protPercent = hasProtGoal ? Math.min(100, Math.round((currentValues.consumedProtein / protTarget) * 100)) : null;

  return [
    {
      id: "calories",
      title: "Daily Calorie Budget",
      targetValue: hasCalGoal ? calTarget : null,
      currentValue: Math.round(currentValues.consumedCalories),
      unit: "kcal",
      percent: calPercent,
      isConfigured: hasCalGoal,
      statusText: hasCalGoal
        ? `${Math.round(currentValues.consumedCalories)} / ${calTarget} kcal (${calPercent}%)`
        : "No calorie target set in profile",
      note: hasCalGoal ? `${Math.max(0, calTarget - Math.round(currentValues.consumedCalories))} kcal remaining` : undefined,
    },
    {
      id: "protein",
      title: "Daily Protein Target",
      targetValue: hasProtGoal ? protTarget : null,
      currentValue: Math.round(currentValues.consumedProtein * 10) / 10,
      unit: "g",
      percent: protPercent,
      isConfigured: hasProtGoal,
      statusText: hasProtGoal
        ? `${Math.round(currentValues.consumedProtein * 10) / 10} / ${protTarget}g (${protPercent}%)`
        : "No protein target set in profile",
      note: hasProtGoal
        ? `${Math.max(0, Math.round((protTarget - currentValues.consumedProtein) * 10) / 10)}g remaining`
        : undefined,
    },
    {
      id: "steps",
      title: "Daily Steps",
      targetValue: null,
      currentValue: currentValues.steps,
      unit: "steps",
      percent: null,
      isConfigured: false,
      statusText: `${currentValues.steps.toLocaleString()} steps logged`,
      note: "Target not configured in profile",
    },
    {
      id: "activity",
      title: "Active Workout Duration",
      targetValue: null,
      currentValue: currentValues.activeMinutes,
      unit: "min",
      percent: null,
      isConfigured: false,
      statusText: `${currentValues.activeMinutes} min active duration`,
      note: "Target not configured in profile",
    },
  ];
}
