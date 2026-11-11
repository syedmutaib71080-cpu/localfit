import type { ActivityType, CalorieEstimationResult } from "@/types/activity";

/**
 * Compendium of Physical Activities METs (Metabolic Equivalent of Task):
 * - Walking (3.5 - 4.5 km/h): ~3.5 METs
 * - Brisk walking (> 5.0 km/h): ~4.3 METs
 * - Running / Jogging (~8.0 km/h): ~8.0 METs
 * - Running fast (> 10.0 km/h): ~10.5 METs
 * - Cycling (leisure / moderate 15-19 km/h): ~6.0 METs
 * - Cycling (brisk / vigorous > 20 km/h): ~8.5 METs
 *
 * Formula:
 * Active Calories (kcal) = MET × Weight (kg) × Active Duration (hours)
 */

export function getMetForActivity(
  activityType: ActivityType,
  distanceMeters: number,
  durationSeconds: number
): number {
  if (durationSeconds <= 0) return 1.0;

  const speedKmh = (distanceMeters / 1000) / (durationSeconds / 3600);

  switch (activityType) {
    case "walking":
      if (speedKmh > 5.5) return 4.5;
      if (speedKmh > 4.5) return 3.8;
      return 3.3;

    case "running":
      if (speedKmh > 11.0) return 11.0;
      if (speedKmh > 9.5) return 9.8;
      if (speedKmh > 7.5) return 8.3;
      return 7.0;

    case "cycling":
      if (speedKmh > 22.0) return 9.0;
      if (speedKmh > 18.0) return 7.5;
      if (speedKmh > 14.0) return 6.0;
      return 4.5;

    default:
      return 3.5;
  }
}

/**
 * Calculates personalized calorie estimation for an active workout.
 *
 * STRICT RULE:
 * Never assume an arbitrary weight (such as 70 kg) if user weight is missing.
 * If user weight is unavailable or invalid, returns null with a clear reason.
 */
export function calculateWorkoutCalories(
  activityType: ActivityType,
  durationSeconds: number,
  userWeightKg: number | null | undefined,
  distanceMeters: number = 0
): CalorieEstimationResult {
  if (userWeightKg === null || userWeightKg === undefined || userWeightKg <= 0 || isNaN(userWeightKg)) {
    return {
      estimatedCalories: null,
      met: null,
      weightUsedKg: null,
      reason: "PROFILE_WEIGHT_REQUIRED",
      explanation: "Personalized calorie estimation requires your body weight. Please add your weight in your Profile to enable calorie tracking.",
    };
  }

  if (durationSeconds <= 0) {
    return {
      estimatedCalories: 0,
      met: 1.0,
      weightUsedKg: userWeightKg,
      reason: "CALCULATED",
      explanation: "Workout duration is 0 seconds.",
    };
  }

  const met = getMetForActivity(activityType, distanceMeters, durationSeconds);
  const durationHours = durationSeconds / 3600;
  const rawCalories = met * userWeightKg * durationHours;
  const estimatedCalories = Math.max(1, Math.round(rawCalories));

  return {
    estimatedCalories,
    met,
    weightUsedKg: userWeightKg,
    reason: "CALCULATED",
    explanation: `Estimated ${estimatedCalories} kcal using ${met} METs based on your ${userWeightKg} kg body weight over ${Math.round(durationSeconds / 60)} minutes.`,
  };
}

/**
 * Formats pace or speed according to activity discipline:
 * - Walking / Running: Pace formatted as mm:ss /km
 * - Cycling: Speed formatted as km/h
 */
export function formatPaceOrSpeed(
  activityType: ActivityType,
  distanceMeters: number,
  durationSeconds: number
): { value: string; unit: string; raw: number } {
  if (distanceMeters <= 0 || durationSeconds <= 0) {
    if (activityType === "cycling") {
      return { value: "0.0", unit: "km/h", raw: 0 };
    }
    return { value: "--:--", unit: "/km", raw: 0 };
  }

  const distanceKm = distanceMeters / 1000;
  const hours = durationSeconds / 3600;

  if (activityType === "cycling") {
    const speedKmh = distanceKm / hours;
    return {
      value: speedKmh.toFixed(1),
      unit: "km/h",
      raw: Math.round(speedKmh * 10) / 10,
    };
  } else {
    // Pace: seconds per km
    const secondsPerKm = durationSeconds / distanceKm;
    const paceMinutes = Math.floor(secondsPerKm / 60);
    const paceSeconds = Math.floor(secondsPerKm % 60);
    const formattedPace = `${paceMinutes}:${paceSeconds.toString().padStart(2, "0")}`;
    return {
      value: formattedPace,
      unit: "/km",
      raw: Math.round(secondsPerKm),
    };
  }
}
