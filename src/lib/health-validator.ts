/**
 * Health Tracking Input Validation Utilities (Stage 9.2 Backend)
 * Enforces strict validation and boundaries matching database constraints.
 */

import type {
  CreateSleepLogInput,
  CreateWaterLogInput,
  CreateWeightLogInput,
  SleepQuality,
  UpdateHealthGoalsInput,
  UpdateSleepLogInput,
  UpdateWaterLogInput,
  UpdateWeightLogInput,
} from "@/types/health-tracking";

const VALID_SLEEP_QUALITIES: SleepQuality[] = ["poor", "fair", "good", "excellent"];

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  error?: string;
}

/**
 * Validates calendar date string format (YYYY-MM-DD) and calendar correctness.
 */
export function isValidDateString(dateStr: string): boolean {
  if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const parts = dateStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];

  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const dateObj = new Date(`${dateStr}T00:00:00.000Z`);
  return (
    !isNaN(dateObj.getTime()) &&
    dateObj.getUTCFullYear() === year &&
    dateObj.getUTCMonth() + 1 === month &&
    dateObj.getUTCDate() === day
  );
}

/**
 * Validates ISO 8601 timestamp string.
 */
export function isValidTimestamp(timestampStr: string): boolean {
  if (typeof timestampStr !== "string" || !timestampStr.trim()) {
    return false;
  }
  const d = new Date(timestampStr);
  return !isNaN(d.getTime());
}

/**
 * Validates Weight creation payload.
 */
export function validateWeightLogInput(
  body: unknown
): ValidationResult<Required<CreateWeightLogInput> & { logged_date: string }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;

  // 1. weight_kg validation (20.0 - 400.0 kg)
  if (record.weight_kg === undefined || record.weight_kg === null) {
    return { valid: false, error: "weight_kg is required" };
  }

  const weight = Number(record.weight_kg);
  if (typeof record.weight_kg !== "number" || !Number.isFinite(weight)) {
    return { valid: false, error: "weight_kg must be a valid finite number" };
  }

  if (weight < 20.0 || weight > 400.0) {
    return {
      valid: false,
      error: "weight_kg must be between 20.0 and 400.0 kilograms",
    };
  }

  const cleanWeight = Math.round(weight * 100) / 100;

  // 2. logged_date validation
  let loggedDate: string;
  if (record.logged_date !== undefined && record.logged_date !== null) {
    const rawDate = String(record.logged_date).trim();
    if (!isValidDateString(rawDate)) {
      return { valid: false, error: "logged_date must be in valid YYYY-MM-DD format" };
    }
    loggedDate = rawDate;
  } else {
    // Default to current date YYYY-MM-DD
    loggedDate = new Date().toISOString().slice(0, 10);
  }

  // 3. notes validation (<= 1000 characters)
  let cleanNotes: string | null = null;
  if (record.notes !== undefined && record.notes !== null) {
    const rawNotes = String(record.notes).trim();
    if (rawNotes.length > 1000) {
      return { valid: false, error: "notes cannot exceed 1000 characters" };
    }
    cleanNotes = rawNotes.length > 0 ? rawNotes : null;
  }

  return {
    valid: true,
    data: {
      weight_kg: cleanWeight,
      logged_date: loggedDate,
      notes: cleanNotes,
    },
  };
}

/**
 * Validates Weight update payload.
 */
export function validateWeightLogUpdate(body: unknown): ValidationResult<UpdateWeightLogInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;
  const updates: UpdateWeightLogInput = {};
  let hasFields = false;

  if (record.weight_kg !== undefined) {
    const weight = Number(record.weight_kg);
    if (
      record.weight_kg === null ||
      typeof record.weight_kg !== "number" ||
      !Number.isFinite(weight)
    ) {
      return { valid: false, error: "weight_kg must be a valid finite number" };
    }
    if (weight < 20.0 || weight > 400.0) {
      return {
        valid: false,
        error: "weight_kg must be between 20.0 and 400.0 kilograms",
      };
    }
    updates.weight_kg = Math.round(weight * 100) / 100;
    hasFields = true;
  }

  if (record.logged_date !== undefined) {
    const rawDate = String(record.logged_date).trim();
    if (!isValidDateString(rawDate)) {
      return { valid: false, error: "logged_date must be in valid YYYY-MM-DD format" };
    }
    updates.logged_date = rawDate;
    hasFields = true;
  }

  if (record.notes !== undefined) {
    if (record.notes === null) {
      updates.notes = null;
    } else {
      const rawNotes = String(record.notes).trim();
      if (rawNotes.length > 1000) {
        return { valid: false, error: "notes cannot exceed 1000 characters" };
      }
      updates.notes = rawNotes.length > 0 ? rawNotes : null;
    }
    hasFields = true;
  }

  if (!hasFields) {
    return { valid: false, error: "Update payload must include at least one field to update" };
  }

  return { valid: true, data: updates };
}

/**
 * Validates Water intake creation payload.
 */
export function validateWaterLogInput(
  body: unknown
): ValidationResult<Required<CreateWaterLogInput> & { intake_date: string }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;

  // 1. amount_ml validation (1 - 10000 ml)
  if (record.amount_ml === undefined || record.amount_ml === null) {
    return { valid: false, error: "amount_ml is required" };
  }

  const amount = Number(record.amount_ml);
  if (
    typeof record.amount_ml !== "number" ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return { valid: false, error: "amount_ml must be a positive integer greater than 0" };
  }

  if (amount > 10000) {
    return { valid: false, error: "amount_ml cannot exceed 10,000 ml (10 liters)" };
  }

  // 2. intake_date validation
  let intakeDate: string;
  if (record.intake_date !== undefined && record.intake_date !== null) {
    const rawDate = String(record.intake_date).trim();
    if (!isValidDateString(rawDate)) {
      return { valid: false, error: "intake_date must be in valid YYYY-MM-DD format" };
    }
    intakeDate = rawDate;
  } else {
    intakeDate = new Date().toISOString().slice(0, 10);
  }

  // 3. notes validation (<= 500 characters)
  let cleanNotes: string | null = null;
  if (record.notes !== undefined && record.notes !== null) {
    const rawNotes = String(record.notes).trim();
    if (rawNotes.length > 500) {
      return { valid: false, error: "notes cannot exceed 500 characters" };
    }
    cleanNotes = rawNotes.length > 0 ? rawNotes : null;
  }

  return {
    valid: true,
    data: {
      amount_ml: amount,
      intake_date: intakeDate,
      notes: cleanNotes,
    },
  };
}

/**
 * Validates Water intake update payload.
 */
export function validateWaterLogUpdate(body: unknown): ValidationResult<UpdateWaterLogInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;
  const updates: UpdateWaterLogInput = {};
  let hasFields = false;

  if (record.amount_ml !== undefined) {
    const amount = Number(record.amount_ml);
    if (
      record.amount_ml === null ||
      typeof record.amount_ml !== "number" ||
      !Number.isFinite(amount) ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return { valid: false, error: "amount_ml must be a positive integer greater than 0" };
    }
    if (amount > 10000) {
      return { valid: false, error: "amount_ml cannot exceed 10,000 ml (10 liters)" };
    }
    updates.amount_ml = amount;
    hasFields = true;
  }

  if (record.intake_date !== undefined) {
    const rawDate = String(record.intake_date).trim();
    if (!isValidDateString(rawDate)) {
      return { valid: false, error: "intake_date must be in valid YYYY-MM-DD format" };
    }
    updates.intake_date = rawDate;
    hasFields = true;
  }

  if (record.notes !== undefined) {
    if (record.notes === null) {
      updates.notes = null;
    } else {
      const rawNotes = String(record.notes).trim();
      if (rawNotes.length > 500) {
        return { valid: false, error: "notes cannot exceed 500 characters" };
      }
      updates.notes = rawNotes.length > 0 ? rawNotes : null;
    }
    hasFields = true;
  }

  if (!hasFields) {
    return { valid: false, error: "Update payload must include at least one field to update" };
  }

  return { valid: true, data: updates };
}

/**
 * Validates Sleep log creation payload.
 */
export function validateSleepLogInput(
  body: unknown
): ValidationResult<Required<CreateSleepLogInput> & { sleep_date: string }> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;

  // 1. sleep_date validation
  let sleepDate: string;
  if (record.sleep_date !== undefined && record.sleep_date !== null) {
    const rawDate = String(record.sleep_date).trim();
    if (!isValidDateString(rawDate)) {
      return { valid: false, error: "sleep_date must be in valid YYYY-MM-DD format" };
    }
    sleepDate = rawDate;
  } else {
    sleepDate = new Date().toISOString().slice(0, 10);
  }

  // 2. Timestamps validation
  let bedtime: string | null = null;
  if (record.bedtime !== undefined && record.bedtime !== null) {
    const rawBed = String(record.bedtime).trim();
    if (!isValidTimestamp(rawBed)) {
      return { valid: false, error: "bedtime must be a valid ISO timestamp" };
    }
    bedtime = new Date(rawBed).toISOString();
  }

  let wakeTime: string | null = null;
  if (record.wake_time !== undefined && record.wake_time !== null) {
    const rawWake = String(record.wake_time).trim();
    if (!isValidTimestamp(rawWake)) {
      return { valid: false, error: "wake_time must be a valid ISO timestamp" };
    }
    wakeTime = new Date(rawWake).toISOString();
  }

  // 3. duration_minutes calculation or validation
  let duration: number;

  if (record.duration_minutes !== undefined && record.duration_minutes !== null) {
    const rawDuration = Number(record.duration_minutes);
    if (
      typeof record.duration_minutes !== "number" ||
      !Number.isFinite(rawDuration) ||
      !Number.isInteger(rawDuration)
    ) {
      return { valid: false, error: "duration_minutes must be an integer" };
    }
    duration = rawDuration;
  } else if (bedtime && wakeTime) {
    // Auto-calculate from bedtime and wake_time
    const bedMs = new Date(bedtime).getTime();
    const wakeMs = new Date(wakeTime).getTime();
    if (wakeMs <= bedMs) {
      return { valid: false, error: "wake_time must be later than bedtime" };
    }
    duration = Math.round((wakeMs - bedMs) / 60000);
  } else {
    return {
      valid: false,
      error: "duration_minutes is required when bedtime and wake_time are not both provided",
    };
  }

  // Validate bounds (30 - 1440 minutes)
  if (duration < 30 || duration > 1440) {
    return {
      valid: false,
      error: "duration_minutes must be between 30 and 1440 minutes (24 hours)",
    };
  }

  // 4. Validate contradiction when both timestamps are present
  if (bedtime && wakeTime) {
    const bedMs = new Date(bedtime).getTime();
    const wakeMs = new Date(wakeTime).getTime();

    if (wakeMs <= bedMs) {
      return { valid: false, error: "wake_time must be later than bedtime" };
    }

    const elapsedMinutes = Math.round((wakeMs - bedMs) / 60000);
    // 2-minute tolerance for rounding
    if (duration > elapsedMinutes + 2) {
      return {
        valid: false,
        error: `duration_minutes (${duration}m) cannot exceed time elapsed between bedtime and wake_time (${elapsedMinutes}m)`,
      };
    }
  }

  // 5. sleep_quality validation ('poor', 'fair', 'good', 'excellent')
  let cleanQuality: SleepQuality | null = null;
  if (record.sleep_quality !== undefined && record.sleep_quality !== null) {
    const rawQuality = String(record.sleep_quality).trim().toLowerCase() as SleepQuality;
    if (!VALID_SLEEP_QUALITIES.includes(rawQuality)) {
      return {
        valid: false,
        error: "sleep_quality must be one of: 'poor', 'fair', 'good', 'excellent'",
      };
    }
    cleanQuality = rawQuality;
  }

  // 6. notes validation (<= 1000 characters)
  let cleanNotes: string | null = null;
  if (record.notes !== undefined && record.notes !== null) {
    const rawNotes = String(record.notes).trim();
    if (rawNotes.length > 1000) {
      return { valid: false, error: "notes cannot exceed 1000 characters" };
    }
    cleanNotes = rawNotes.length > 0 ? rawNotes : null;
  }

  return {
    valid: true,
    data: {
      sleep_date: sleepDate,
      duration_minutes: duration,
      bedtime,
      wake_time: wakeTime,
      sleep_quality: cleanQuality,
      notes: cleanNotes,
    },
  };
}

/**
 * Validates Sleep log update payload against existing record values.
 */
export function validateSleepLogUpdate(
  body: unknown,
  existing?: {
    bedtime?: string | null;
    wake_time?: string | null;
    duration_minutes?: number;
  }
): ValidationResult<UpdateSleepLogInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;
  const updates: UpdateSleepLogInput = {};
  let hasFields = false;

  if (record.sleep_date !== undefined) {
    const rawDate = String(record.sleep_date).trim();
    if (!isValidDateString(rawDate)) {
      return { valid: false, error: "sleep_date must be in valid YYYY-MM-DD format" };
    }
    updates.sleep_date = rawDate;
    hasFields = true;
  }

  if (record.bedtime !== undefined) {
    if (record.bedtime === null) {
      updates.bedtime = null;
    } else {
      const rawBed = String(record.bedtime).trim();
      if (!isValidTimestamp(rawBed)) {
        return { valid: false, error: "bedtime must be a valid ISO timestamp" };
      }
      updates.bedtime = new Date(rawBed).toISOString();
    }
    hasFields = true;
  }

  if (record.wake_time !== undefined) {
    if (record.wake_time === null) {
      updates.wake_time = null;
    } else {
      const rawWake = String(record.wake_time).trim();
      if (!isValidTimestamp(rawWake)) {
        return { valid: false, error: "wake_time must be a valid ISO timestamp" };
      }
      updates.wake_time = new Date(rawWake).toISOString();
    }
    hasFields = true;
  }

  if (record.duration_minutes !== undefined) {
    const rawDuration = Number(record.duration_minutes);
    if (
      record.duration_minutes === null ||
      typeof record.duration_minutes !== "number" ||
      !Number.isFinite(rawDuration) ||
      !Number.isInteger(rawDuration)
    ) {
      return { valid: false, error: "duration_minutes must be an integer" };
    }
    if (rawDuration < 30 || rawDuration > 1440) {
      return {
        valid: false,
        error: "duration_minutes must be between 30 and 1440 minutes (24 hours)",
      };
    }
    updates.duration_minutes = rawDuration;
    hasFields = true;
  }

  // Cross-timestamp boundary check with merged values
  const finalBedtime = updates.bedtime !== undefined ? updates.bedtime : existing?.bedtime;
  const finalWakeTime = updates.wake_time !== undefined ? updates.wake_time : existing?.wake_time;
  const finalDuration =
    updates.duration_minutes !== undefined ? updates.duration_minutes : existing?.duration_minutes;

  if (finalBedtime && finalWakeTime) {
    const bedMs = new Date(finalBedtime).getTime();
    const wakeMs = new Date(finalWakeTime).getTime();

    if (wakeMs <= bedMs) {
      return { valid: false, error: "wake_time must be later than bedtime" };
    }

    if (finalDuration !== undefined) {
      const elapsedMinutes = Math.round((wakeMs - bedMs) / 60000);
      if (finalDuration > elapsedMinutes + 2) {
        return {
          valid: false,
          error: `duration_minutes (${finalDuration}m) cannot exceed time elapsed between bedtime and wake_time (${elapsedMinutes}m)`,
        };
      }
    }
  }

  if (record.sleep_quality !== undefined) {
    if (record.sleep_quality === null) {
      updates.sleep_quality = null;
    } else {
      const rawQuality = String(record.sleep_quality).trim().toLowerCase() as SleepQuality;
      if (!VALID_SLEEP_QUALITIES.includes(rawQuality)) {
        return {
          valid: false,
          error: "sleep_quality must be one of: 'poor', 'fair', 'good', 'excellent'",
        };
      }
      updates.sleep_quality = rawQuality;
    }
    hasFields = true;
  }

  if (record.notes !== undefined) {
    if (record.notes === null) {
      updates.notes = null;
    } else {
      const rawNotes = String(record.notes).trim();
      if (rawNotes.length > 1000) {
        return { valid: false, error: "notes cannot exceed 1000 characters" };
      }
      updates.notes = rawNotes.length > 0 ? rawNotes : null;
    }
    hasFields = true;
  }

  if (!hasFields) {
    return { valid: false, error: "Update payload must include at least one field to update" };
  }

  return { valid: true, data: updates };
}

/**
 * Validates Health Goals update payload for profiles.
 */
export function validateHealthGoalsUpdate(body: unknown): ValidationResult<UpdateHealthGoalsInput> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a valid JSON object" };
  }

  const record = body as Record<string, unknown>;
  const updates: UpdateHealthGoalsInput = {};
  let hasFields = false;

  // 1. daily_water_goal_ml validation (500 - 10000 ml or null)
  if (record.daily_water_goal_ml !== undefined) {
    if (record.daily_water_goal_ml === null) {
      updates.daily_water_goal_ml = null;
    } else {
      const waterGoal = Number(record.daily_water_goal_ml);
      if (
        typeof record.daily_water_goal_ml !== "number" ||
        !Number.isFinite(waterGoal) ||
        !Number.isInteger(waterGoal)
      ) {
        return { valid: false, error: "daily_water_goal_ml must be an integer" };
      }
      if (waterGoal < 500 || waterGoal > 10000) {
        return {
          valid: false,
          error: "daily_water_goal_ml must be between 500 and 10,000 milliliters",
        };
      }
      updates.daily_water_goal_ml = waterGoal;
    }
    hasFields = true;
  }

  // 2. daily_sleep_goal_minutes validation (180 - 1000 minutes or null)
  if (record.daily_sleep_goal_minutes !== undefined) {
    if (record.daily_sleep_goal_minutes === null) {
      updates.daily_sleep_goal_minutes = null;
    } else {
      const sleepGoal = Number(record.daily_sleep_goal_minutes);
      if (
        typeof record.daily_sleep_goal_minutes !== "number" ||
        !Number.isFinite(sleepGoal) ||
        !Number.isInteger(sleepGoal)
      ) {
        return { valid: false, error: "daily_sleep_goal_minutes must be an integer" };
      }
      if (sleepGoal < 180 || sleepGoal > 1000) {
        return {
          valid: false,
          error: "daily_sleep_goal_minutes must be between 180 and 1000 minutes (3 to 16.6 hours)",
        };
      }
      updates.daily_sleep_goal_minutes = sleepGoal;
    }
    hasFields = true;
  }

  if (!hasFields) {
    return {
      valid: false,
      error:
        "Update payload must include daily_water_goal_ml or daily_sleep_goal_minutes",
    };
  }

  return { valid: true, data: updates };
}
