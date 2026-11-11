import type { ActivityType } from "@/types/activity";

export interface WorkoutValidationResult {
  valid: boolean;
  error?: string;
  data?: {
    session_token: string;
    activity_type: ActivityType;
    start_time: string;
    finish_time: string;
    duration_seconds: number;
    distance_meters: number;
    avg_pace_or_speed: number;
    step_count: number | null;
    client_estimated_calories: number | null;
    notes: string | null;
  };
}

const MIN_WORKOUT_DURATION_SECONDS = 5; // Minimum plausible workout duration
const MAX_WORKOUT_DURATION_SECONDS = 86400; // 24 hours maximum
const MAX_DISTANCE_METERS = 500000; // 500 km max single workout
const MAX_PACE_OR_SPEED = 10000;
const MAX_STEP_COUNT = 150000;
const MAX_NOTES_LENGTH = 2000;
const MAX_CALORIES = 50000;

// Maximum humanly plausible speeds in meters/second
// Used to reject implausibly short duration_seconds for a given distance
const MAX_SPEED_MPS: Record<ActivityType, number> = {
  walking: 6.94, // ~25 km/h (Olympic race walk world record ~15 km/h with margin)
  running: 13.89, // ~50 km/h (Usain Bolt top sprint speed ~44.7 km/h with margin)
  cycling: 36.11, // ~130 km/h (Track cycling sprint record ~78 km/h, downhill margin)
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Server-side validator for workout creation payloads.
 * Strictly verifies:
 * 1. session_token format and presence (valid UUID)
 * 2. activity_type ('walking', 'running', 'cycling')
 * 3. start_time and finish_time are valid ISO timestamps with finish_time > start_time
 * 4. duration_seconds is a positive integer >= 5s and <= 86,400s (24h)
 * 5. duration_seconds does not exceed wall-clock elapsed time (properly accounting for pauses)
 * 6. duration_seconds is not implausibly short for the reported distance
 * 7. distance_meters is finite, non-negative, and <= 500,000m
 * 8. avg_pace_or_speed is finite, non-negative, and <= 10,000
 * 9. step_count (if provided) is finite, non-negative integer <= 150,000
 * 10. estimated_calories (if provided) is null or a finite, non-negative number <= 50,000
 * 11. notes (if provided) is <= 2,000 characters
 */
export function validateWorkoutInput(input: unknown): WorkoutValidationResult {
  if (typeof input !== "object" || input === null) {
    return { valid: false, error: "Workout payload must be a JSON object." };
  }

  const raw = input as Record<string, unknown>;

  // 1. session_token
  if (!raw.session_token || typeof raw.session_token !== "string") {
    return { valid: false, error: "Missing or invalid session_token." };
  }
  const sessionToken = raw.session_token.trim();
  if (!UUID_REGEX.test(sessionToken)) {
    return { valid: false, error: "session_token must be a valid UUID string." };
  }

  // 2. activity_type
  const activityType = raw.activity_type as ActivityType;
  if (!activityType || !["walking", "running", "cycling"].includes(activityType)) {
    return {
      valid: false,
      error: "Invalid activity_type. Must be walking, running, or cycling.",
    };
  }

  // 3. start_time & finish_time timestamps
  if (!raw.start_time || typeof raw.start_time !== "string") {
    return { valid: false, error: "start_time is required and must be an ISO timestamp string." };
  }
  if (!raw.finish_time || typeof raw.finish_time !== "string") {
    return { valid: false, error: "finish_time is required and must be an ISO timestamp string." };
  }

  const startMs = Date.parse(raw.start_time);
  if (isNaN(startMs)) {
    return { valid: false, error: "start_time is an invalid timestamp." };
  }

  const finishMs = Date.parse(raw.finish_time);
  if (isNaN(finishMs)) {
    return { valid: false, error: "finish_time is an invalid timestamp." };
  }

  if (finishMs <= startMs) {
    return {
      valid: false,
      error: "finish_time must be strictly after start_time.",
    };
  }

  // 4. duration_seconds consistency & bounds
  const durationSeconds = Number(raw.duration_seconds);
  if (!Number.isFinite(durationSeconds) || !Number.isInteger(durationSeconds) || durationSeconds < MIN_WORKOUT_DURATION_SECONDS) {
    return {
      valid: false,
      error: `duration_seconds must be a positive finite whole integer of at least ${MIN_WORKOUT_DURATION_SECONDS} seconds.`,
    };
  }

  if (durationSeconds > MAX_WORKOUT_DURATION_SECONDS) {
    return {
      valid: false,
      error: `duration_seconds exceeds maximum allowable workout duration of 24 hours (${MAX_WORKOUT_DURATION_SECONDS}s).`,
    };
  }

  const wallClockSeconds = Math.floor((finishMs - startMs) / 1000);
  // Active duration cannot exceed total elapsed wall-clock duration (plus 2s clock jitter tolerance)
  // Pauses mean durationSeconds can be less than wallClockSeconds, which is completely valid
  if (durationSeconds > wallClockSeconds + 2) {
    return {
      valid: false,
      error: `duration_seconds (${durationSeconds}s) cannot exceed total wall-clock elapsed time (${wallClockSeconds}s).`,
    };
  }

  // 5. distance_meters
  const distanceMeters = Number(raw.distance_meters);
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return {
      valid: false,
      error: "distance_meters must be a finite, non-negative number.",
    };
  }
  if (distanceMeters > MAX_DISTANCE_METERS) {
    return {
      valid: false,
      error: `distance_meters exceeds reasonable physical limit (${MAX_DISTANCE_METERS / 1000} km).`,
    };
  }

  // 6. Plausibility check: Reject implausibly short duration for recorded distance
  if (distanceMeters > 50) {
    const impliedSpeedMps = distanceMeters / durationSeconds;
    if (impliedSpeedMps > MAX_SPEED_MPS[activityType]) {
      const impliedKmh = Math.round(impliedSpeedMps * 3.6);
      return {
        valid: false,
        error: `Implausibly short duration (${durationSeconds}s) for distance (${distanceMeters}m). Implied speed (${impliedKmh} km/h) exceeds physical limit for ${activityType}.`,
      };
    }
  }

  // 7. avg_pace_or_speed
  const avgPaceOrSpeed = Number(raw.avg_pace_or_speed);
  if (!Number.isFinite(avgPaceOrSpeed) || avgPaceOrSpeed < 0 || avgPaceOrSpeed > MAX_PACE_OR_SPEED) {
    return {
      valid: false,
      error: `avg_pace_or_speed must be a finite, non-negative number <= ${MAX_PACE_OR_SPEED}.`,
    };
  }

  // 8. step_count
  let stepCount: number | null = null;
  if (raw.step_count !== undefined && raw.step_count !== null) {
    const parsedStep = Number(raw.step_count);
    if (!Number.isFinite(parsedStep) || !Number.isInteger(parsedStep) || parsedStep < 0) {
      return {
        valid: false,
        error: "step_count must be a finite, non-negative whole integer.",
      };
    }
    if (parsedStep > MAX_STEP_COUNT) {
      return {
        valid: false,
        error: `step_count exceeds physical maximum limit (${MAX_STEP_COUNT.toLocaleString()} steps).`,
      };
    }
    stepCount = parsedStep;
  }

  // 9. estimated_calories validation (Item 4)
  // Rejects negative, NaN, Infinity, or invalid client calories; null remains allowed
  let clientCalories: number | null = null;
  if (raw.estimated_calories !== undefined) {
    if (raw.estimated_calories === null) {
      clientCalories = null;
    } else {
      if (typeof raw.estimated_calories !== "number" || !Number.isFinite(raw.estimated_calories)) {
        return {
          valid: false,
          error: "estimated_calories must be a finite, non-negative number or null.",
        };
      }
      if (raw.estimated_calories < 0) {
        return {
          valid: false,
          error: "estimated_calories cannot be negative.",
        };
      }
      if (raw.estimated_calories > MAX_CALORIES) {
        return {
          valid: false,
          error: `estimated_calories exceeds maximum physical limit (${MAX_CALORIES.toLocaleString()} kcal).`,
        };
      }
      clientCalories = Math.round(raw.estimated_calories);
    }
  }

  // 10. notes length limit
  let notes: string | null = null;
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== "string") {
      return { valid: false, error: "notes must be a string." };
    }
    const trimmed = raw.notes.trim();
    if (trimmed.length > MAX_NOTES_LENGTH) {
      return {
        valid: false,
        error: `notes length (${trimmed.length}) exceeds maximum limit of ${MAX_NOTES_LENGTH} characters.`,
      };
    }
    notes = trimmed.length > 0 ? trimmed : null;
  }

  return {
    valid: true,
    data: {
      session_token: sessionToken,
      activity_type: activityType,
      start_time: new Date(startMs).toISOString(),
      finish_time: new Date(finishMs).toISOString(),
      duration_seconds: durationSeconds,
      distance_meters: Math.round(distanceMeters * 10) / 10,
      avg_pace_or_speed: Math.round(avgPaceOrSpeed * 10) / 10,
      step_count: stepCount,
      client_estimated_calories: clientCalories,
      notes,
    },
  };
}
