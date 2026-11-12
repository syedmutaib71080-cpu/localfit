/**
 * Health Tracking Calculator Utilities (Stage 9 Foundation)
 * Pure domain logic for BMI, Water intake, Sleep metrics, and Weight changes.
 * Calorie balance is reused from dashboard-calculator without duplication.
 */

import type {
  BmiCategory,
  BmiResult,
  SleepLog,
  SleepSummary,
  WaterIntakeSummary,
  WaterLog,
  WeightChangeResult,
} from "@/types/health-tracking";

// Re-export existing net calorie balance without duplicating calculation logic
export { calculateNetCalories } from "./dashboard-calculator";

/**
 * Calculates Body Mass Index (BMI) using weight in kg and height in cm.
 * Formula: weight (kg) / (height (m))^2
 * Returns rounded to 1 decimal place, or null if inputs are invalid.
 */
export function calculateBmi(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined
): number | null {
  if (
    typeof weightKg !== "number" ||
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    typeof heightCm !== "number" ||
    !Number.isFinite(heightCm) ||
    heightCm <= 0
  ) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const bmi = weightKg / (heightMeters * heightMeters);

  if (!Number.isFinite(bmi) || bmi <= 0) {
    return null;
  }

  return Math.round(bmi * 10) / 10;
}

/**
 * Classifies an adult BMI value according to standard WHO guidelines:
 * - Underweight: < 18.5
 * - Normal weight: 18.5 - 24.9
 * - Overweight: 25.0 - 29.9
 * - Obese Class I: 30.0 - 34.9
 * - Obese Class II: 35.0 - 39.9
 * - Obese Class III: >= 40.0
 */
export function classifyBmi(bmi: number | null | undefined): BmiCategory | null {
  if (typeof bmi !== "number" || !Number.isFinite(bmi) || bmi <= 0) {
    return null;
  }

  if (bmi < 18.5) {
    return "Underweight";
  }
  if (bmi < 25.0) {
    return "Normal weight";
  }
  if (bmi < 30.0) {
    return "Overweight";
  }
  if (bmi < 35.0) {
    return "Obese Class I";
  }
  if (bmi < 40.0) {
    return "Obese Class II";
  }
  return "Obese Class III";
}

/**
 * Computes healthy adult weight range (kg) for a given height (cm)
 * based on standard normal BMI range (18.5 - 24.9).
 */
export function getHealthyWeightRange(
  heightCm: number | null | undefined
): { min: number; max: number } | null {
  if (typeof heightCm !== "number" || !Number.isFinite(heightCm) || heightCm <= 0) {
    return null;
  }

  const heightMeters = heightCm / 100;
  const h2 = heightMeters * heightMeters;

  const min = Math.round(18.5 * h2 * 10) / 10;
  const max = Math.round(24.9 * h2 * 10) / 10;

  return { min, max };
}

/**
 * Generates complete BMI analysis including BMI value, classification,
 * healthy target weight range, and healthiness flag.
 */
export function getBmiAnalysis(
  weightKg: number | null | undefined,
  heightCm: number | null | undefined
): BmiResult {
  const bmi = calculateBmi(weightKg, heightCm);
  const category = classifyBmi(bmi);
  const healthyWeightRangeKg = getHealthyWeightRange(heightCm);
  const isHealthy = category === "Normal weight";

  return {
    bmi,
    category,
    healthyWeightRangeKg,
    isHealthy,
  };
}

/**
 * Calculates water goal progress percentage.
 * Returns null if goal is not configured or <= 0 (never fabricates default goal).
 */
export function calculateWaterGoalProgress(
  totalMl: number,
  goalMl: number | null | undefined
): number | null {
  if (typeof goalMl !== "number" || !Number.isFinite(goalMl) || goalMl <= 0) {
    return null;
  }
  const safeTotal = Number.isFinite(totalMl) && totalMl > 0 ? totalMl : 0;
  return Math.min(100, Math.round((safeTotal / goalMl) * 100));
}

/**
 * Aggregates all water intake logs for a specific calendar date (YYYY-MM-DD).
 * Safely handles missing goal (returns null without inventing defaults).
 */
export function aggregateDailyWater(
  logs: WaterLog[],
  intakeDate: string,
  goalMl?: number | null
): WaterIntakeSummary {
  const dayLogs = Array.isArray(logs)
    ? logs.filter((log) => log && log.intake_date === intakeDate)
    : [];

  let totalMl = 0;
  for (const log of dayLogs) {
    if (typeof log.amount_ml === "number" && Number.isFinite(log.amount_ml) && log.amount_ml > 0) {
      totalMl += Math.round(log.amount_ml);
    }
  }

  const hasGoal = typeof goalMl === "number" && Number.isFinite(goalMl) && goalMl > 0;
  const progressPercent = hasGoal ? calculateWaterGoalProgress(totalMl, goalMl) : null;
  const remainingMl = hasGoal ? Math.max(0, goalMl - totalMl) : null;

  return {
    date: intakeDate,
    totalMl,
    entryCount: dayLogs.length,
    goalMl: hasGoal ? goalMl : null,
    progressPercent,
    remainingMl,
  };
}

/**
 * Calculates sleep duration in minutes from bedtime and wake time ISO strings or Date objects.
 * Handles sleep intervals across midnight accurately.
 * Rejects invalid, non-chronological, or excessive (>24h) records.
 */
export function calculateSleepDurationFromTimestamps(
  bedtime: string | Date | null | undefined,
  wakeTime: string | Date | null | undefined
): number | null {
  if (!bedtime || !wakeTime) {
    return null;
  }

  const bedDate = typeof bedtime === "string" ? new Date(bedtime) : bedtime;
  const wakeDate = typeof wakeTime === "string" ? new Date(wakeTime) : wakeTime;

  const bedMs = bedDate.getTime();
  const wakeMs = wakeDate.getTime();

  if (!Number.isFinite(bedMs) || !Number.isFinite(wakeMs)) {
    return null;
  }

  // Wake time must be strictly after bedtime
  if (wakeMs <= bedMs) {
    return null;
  }

  const durationMinutes = Math.round((wakeMs - bedMs) / 60000);

  // Must be within reasonable range (between 1 minute and 24 hours / 1440 minutes)
  if (durationMinutes <= 0 || durationMinutes > 1440) {
    return null;
  }

  return durationMinutes;
}

/**
 * Calculates sleep goal progress percentage.
 * Returns null if goal is not configured or <= 0 (never fabricates default goal).
 */
export function calculateSleepGoalProgress(
  durationMinutes: number,
  goalMinutes: number | null | undefined
): number | null {
  if (typeof goalMinutes !== "number" || !Number.isFinite(goalMinutes) || goalMinutes <= 0) {
    return null;
  }
  const safeDuration = Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 0;
  return Math.min(100, Math.round((safeDuration / goalMinutes) * 100));
}

/**
 * Formats duration in minutes to human-readable format.
 * e.g. 480 -> "8h 0m", 450 -> "7h 30m", 45 -> "45m", 0 -> "0m"
 */
export function formatSleepDuration(durationMinutes: number): string {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return "0m";
  }

  const hours = Math.floor(durationMinutes / 60);
  const minutes = Math.round(durationMinutes % 60);

  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${minutes}m`;
}

/**
 * Aggregates daily sleep logs for a given date.
 */
export function summarizeDailySleep(
  logs: SleepLog[],
  sleepDate: string,
  goalMinutes?: number | null
): SleepSummary {
  const dayLogs = Array.isArray(logs)
    ? logs.filter((log) => log && log.sleep_date === sleepDate)
    : [];

  let totalMinutes = 0;
  let latestQuality: SleepLog["sleep_quality"] = null;

  for (const log of dayLogs) {
    if (
      typeof log.duration_minutes === "number" &&
      Number.isFinite(log.duration_minutes) &&
      log.duration_minutes > 0
    ) {
      totalMinutes += Math.round(log.duration_minutes);
      if (log.sleep_quality) {
        latestQuality = log.sleep_quality;
      }
    }
  }

  const hasGoal = typeof goalMinutes === "number" && Number.isFinite(goalMinutes) && goalMinutes > 0;
  const progressPercent = hasGoal ? calculateSleepGoalProgress(totalMinutes, goalMinutes) : null;

  return {
    date: sleepDate,
    durationMinutes: totalMinutes,
    formattedDuration: formatSleepDuration(totalMinutes),
    quality: latestQuality,
    goalMinutes: hasGoal ? goalMinutes : null,
    progressPercent,
  };
}

/**
 * Computes difference and direction between current and previous weight measurements.
 */
export function calculateWeightChange(
  currentWeight: number,
  previousWeight: number
): WeightChangeResult {
  const safeCurrent = Number.isFinite(currentWeight) ? currentWeight : 0;
  const safePrevious = Number.isFinite(previousWeight) ? previousWeight : 0;

  const diff = Math.round((safeCurrent - safePrevious) * 10) / 10;
  const direction: WeightChangeResult["direction"] =
    diff < -0.01 ? "loss" : diff > 0.01 ? "gain" : "neutral";

  return {
    currentWeight: safeCurrent,
    previousWeight: safePrevious,
    differenceKg: diff,
    direction,
  };
}
