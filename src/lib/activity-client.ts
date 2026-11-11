import type {
  ActivityWorkout,
  CreateWorkoutInput,
  DailyStepEntry,
  CreateStepInput,
  UpdateStepInput,
  DailyActivitySummary,
  WeeklyDaySummary,
} from "@/types/activity";

const ACTIVE_WORKOUT_STORAGE_KEY = "localfit_active_workout_session_v1";

export interface ActiveWorkoutState {
  sessionToken: string;
  activityType: "walking" | "running" | "cycling";
  status: "active" | "paused";
  startTime: string;
  intervals: Array<{ startMs: number; endMs: number | null }>;
  distanceMeters: number;
  routeData: Array<{ lat: number; lng: number; timestamp_offset_sec: number; accuracy_m?: number }>;
  stepCount?: number;
}

/**
 * Transient localStorage persistence for recovering in-flight active workouts across accidental refreshes.
 * STRICT RULE: Only used for in-flight recovery; immediately purged upon workout completion or cancellation.
 */
export function saveActiveWorkoutToStorage(state: ActiveWorkoutState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_WORKOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadActiveWorkoutFromStorage(): ActiveWorkoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVE_WORKOUT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearActiveWorkoutFromStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_WORKOUT_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Fetches user workouts.
 */
export async function fetchWorkouts(type?: string): Promise<ActivityWorkout[]> {
  try {
    const url = type ? `/api/activity/workouts?type=${type}` : "/api/activity/workouts";
    const res = await fetch(url);
    if (!res.ok) {
      return [];
    }
    const data = await res.json();
    return data.workouts || [];
  } catch {
    return [];
  }
}

/**
 * Saves a completed workout to the server.
 */
export async function saveWorkout(input: CreateWorkoutInput): Promise<{
  success: boolean;
  workout?: ActivityWorkout;
  error?: string;
  duplicate?: boolean;
}> {
  try {
    const res = await fetch("/api/activity/workouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || "Failed to save workout",
        duplicate: res.status === 409,
      };
    }

    // Immediately clear in-flight session recovery
    clearActiveWorkoutFromStorage();
    return { success: true, workout: data.workout };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

/**
 * Deletes a workout record.
 */
export async function deleteWorkout(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/activity/workouts/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetches step entries for a given date.
 */
export async function fetchDailySteps(dateStr: string): Promise<DailyStepEntry[]> {
  try {
    const res = await fetch(`/api/activity/steps?date=${dateStr}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.steps || [];
  } catch {
    return [];
  }
}

/**
 * Fetches step entries for a date range (for weekly summary).
 */
export async function fetchStepsRange(startDate: string, endDate: string): Promise<DailyStepEntry[]> {
  try {
    const res = await fetch(`/api/activity/steps?startDate=${startDate}&endDate=${endDate}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.steps || [];
  } catch {
    return [];
  }
}

/**
 * Adds a new step entry.
 */
export async function addStepEntry(input: CreateStepInput): Promise<{
  success: boolean;
  stepEntry?: DailyStepEntry;
  error?: string;
}> {
  try {
    const res = await fetch("/api/activity/steps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to log steps" };
    }
    return { success: true, stepEntry: data.stepEntry };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Updates an existing step entry.
 */
export async function updateStepEntry(
  id: string,
  input: UpdateStepInput
): Promise<{ success: boolean; stepEntry?: DailyStepEntry; error?: string }> {
  try {
    const res = await fetch(`/api/activity/steps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || "Failed to update step entry" };
    }
    return { success: true, stepEntry: data.stepEntry };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

/**
 * Deletes a step entry.
 */
export async function deleteStepEntry(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/activity/steps/${id}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Aggregates today's activity metrics from real recorded workouts and steps.
 * STRICT RULE: Never fabricates data. Workouts without calorie estimates are
 * strictly excluded from calorie totals.
 */
export function computeDailyActivitySummary(
  dateStr: string,
  workouts: ActivityWorkout[],
  stepsList: DailyStepEntry[]
): DailyActivitySummary {
  // Filter for workouts on this date
  const dayWorkouts = workouts.filter((w) => {
    const workoutDate = w.start_time.split("T")[0];
    return workoutDate === dateStr;
  });

  // Calculate cumulative steps
  const daySteps = stepsList.filter((s) => s.step_date === dateStr);
  const totalSteps = daySteps.reduce((acc, curr) => acc + curr.steps, 0);

  let walkingMeters = 0;
  let runningMeters = 0;
  let cyclingMeters = 0;
  let totalDurationSec = 0;
  let totalCalories = 0;
  let withCaloriesCount = 0;
  let withoutCaloriesCount = 0;

  for (const w of dayWorkouts) {
    totalDurationSec += w.duration_seconds;

    if (w.activity_type === "walking") walkingMeters += w.distance_meters;
    else if (w.activity_type === "running") runningMeters += w.distance_meters;
    else if (w.activity_type === "cycling") cyclingMeters += w.distance_meters;

    // Strict Requirement #3: Exclude workouts where calorie estimation is unavailable (null)
    if (w.estimated_calories !== null && w.estimated_calories !== undefined) {
      totalCalories += w.estimated_calories;
      withCaloriesCount++;
    } else {
      withoutCaloriesCount++;
    }
  }

  return {
    date: dateStr,
    total_steps: totalSteps,
    step_entries_count: daySteps.length,
    walking_distance_km: Math.round((walkingMeters / 1000) * 10) / 10,
    running_distance_km: Math.round((runningMeters / 1000) * 10) / 10,
    cycling_distance_km: Math.round((cyclingMeters / 1000) * 10) / 10,
    total_workout_duration_seconds: totalDurationSec,
    total_estimated_calories: totalCalories,
    workouts_with_calories_count: withCaloriesCount,
    workouts_without_calories_count: withoutCaloriesCount,
    workouts_count: dayWorkouts.length,
  };
}

/**
 * Computes 7-day weekly activity breakdown from recorded workouts and steps.
 * Safe for Next.js 16 static prerendering: defaults to deterministic date if referenceDate is omitted.
 */
export function computeWeeklySummary(
  workouts: ActivityWorkout[],
  stepsList: DailyStepEntry[],
  referenceDateInput?: Date | string
): WeeklyDaySummary[] {
  const result: WeeklyDaySummary[] = [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  let referenceDate: Date;
  if (!referenceDateInput) {
    referenceDate = new Date("2026-11-11T12:00:00Z");
  } else if (typeof referenceDateInput === "string") {
    referenceDate = new Date(`${referenceDateInput}T12:00:00Z`);
  } else {
    referenceDate = referenceDateInput;
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date(referenceDate);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const dayLabel = dayNames[d.getDay()];

    const summary = computeDailyActivitySummary(dateStr, workouts, stepsList);
    const totalDistanceKm =
      summary.walking_distance_km + summary.running_distance_km + summary.cycling_distance_km;

    result.push({
      date: dateStr,
      dayLabel,
      steps: summary.total_steps,
      totalDistanceKm: Math.round(totalDistanceKm * 10) / 10,
      activeDurationMinutes: Math.round(summary.total_workout_duration_seconds / 60),
      estimatedCalories: summary.total_estimated_calories,
    });
  }

  return result;
}
