/**
 * Health Tracking API Client (Stage 9.3)
 * Provides typed HTTP fetchers for Weight, Water, Sleep, and Health Goals.
 */

import { createClient } from "@/lib/supabase/client";
import type {
  CreateSleepLogInput,
  CreateWaterLogInput,
  CreateWeightLogInput,
  SleepLog,
  SleepSummary,
  UpdateHealthGoalsInput,
  UpdateSleepLogInput,
  UpdateWaterLogInput,
  UpdateWeightLogInput,
  WaterIntakeSummary,
  WaterLog,
  WeightChangeResult,
  WeightLog,
} from "@/types/health-tracking";

export interface WeightResponse {
  weights: WeightLog[];
  count: number;
  latestWeight: WeightLog | null;
  weightChange: WeightChangeResult | null;
}

export interface WaterResponse {
  logs: WaterLog[];
  summary?: WaterIntakeSummary;
  count: number;
}

export interface SleepResponse {
  logs: SleepLog[];
  summary?: SleepSummary;
  count: number;
}

export interface HealthGoalsResponse {
  goals: {
    daily_water_goal_ml: number | null;
    daily_sleep_goal_minutes: number | null;
    daily_calorie_goal: number | null;
    daily_protein_goal: number | null;
  };
}

export interface UserBiometrics {
  heightCm: number | null;
  weightKg: number | null;
  fullName: string | null;
  dailyCalorieGoal: number | null;
  dailyProteinGoal: number | null;
  dailyWaterGoalMl: number | null;
  dailySleepGoalMinutes: number | null;
}

// ----------------------------------------------------------------------------
// 1. User Biometrics (Height, Weight, Goals from profiles table)
// ----------------------------------------------------------------------------

export async function fetchUserBiometrics(): Promise<UserBiometrics | null> {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select(
      "height_cm, weight_kg, full_name, daily_calorie_goal, daily_protein_goal, daily_water_goal_ml, daily_sleep_goal_minutes"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return {
    heightCm: profile.height_cm ? Number(profile.height_cm) : null,
    weightKg: profile.weight_kg ? Number(profile.weight_kg) : null,
    fullName: profile.full_name || null,
    dailyCalorieGoal: profile.daily_calorie_goal ? Number(profile.daily_calorie_goal) : null,
    dailyProteinGoal: profile.daily_protein_goal ? Number(profile.daily_protein_goal) : null,
    dailyWaterGoalMl: profile.daily_water_goal_ml ? Number(profile.daily_water_goal_ml) : null,
    dailySleepGoalMinutes: profile.daily_sleep_goal_minutes
      ? Number(profile.daily_sleep_goal_minutes)
      : null,
  };
}

// ----------------------------------------------------------------------------
// 2. Weight Tracking APIs
// ----------------------------------------------------------------------------

export async function fetchWeightLogs(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<WeightResponse> {
  const params = new URLSearchParams();
  if (options?.date) params.set("date", options.date);
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  if (options?.limit) params.set("limit", options.limit.toString());

  const query = params.toString();
  const url = `/api/health/weight${query ? `?${query}` : ""}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch weight logs (HTTP ${res.status})`);
  }

  return res.json();
}

export async function createWeightLog(input: CreateWeightLogInput): Promise<WeightLog> {
  const res = await fetch("/api/health/weight", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create weight entry (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.weight;
}

export async function updateWeightLog(
  id: string,
  input: UpdateWeightLogInput
): Promise<WeightLog> {
  const res = await fetch(`/api/health/weight/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update weight entry (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.weight;
}

export async function deleteWeightLog(id: string): Promise<void> {
  const res = await fetch(`/api/health/weight/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete weight entry (HTTP ${res.status})`);
  }
}

// ----------------------------------------------------------------------------
// 3. Water Tracking APIs
// ----------------------------------------------------------------------------

export async function fetchWaterLogs(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<WaterResponse> {
  const params = new URLSearchParams();
  if (options?.date) params.set("date", options.date);
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  if (options?.limit) params.set("limit", options.limit.toString());

  const query = params.toString();
  const url = `/api/health/water${query ? `?${query}` : ""}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch water logs (HTTP ${res.status})`);
  }

  return res.json();
}

export async function createWaterLog(input: CreateWaterLogInput): Promise<WaterLog> {
  const res = await fetch("/api/health/water", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create water entry (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.log;
}

export async function updateWaterLog(
  id: string,
  input: UpdateWaterLogInput
): Promise<WaterLog> {
  const res = await fetch(`/api/health/water/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update water entry (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.log;
}

export async function deleteWaterLog(id: string): Promise<void> {
  const res = await fetch(`/api/health/water/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete water entry (HTTP ${res.status})`);
  }
}

// ----------------------------------------------------------------------------
// 4. Sleep Tracking APIs
// ----------------------------------------------------------------------------

export async function fetchSleepLogs(options?: {
  date?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<SleepResponse> {
  const params = new URLSearchParams();
  if (options?.date) params.set("date", options.date);
  if (options?.startDate) params.set("startDate", options.startDate);
  if (options?.endDate) params.set("endDate", options.endDate);
  if (options?.limit) params.set("limit", options.limit.toString());

  const query = params.toString();
  const url = `/api/health/sleep${query ? `?${query}` : ""}`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch sleep logs (HTTP ${res.status})`);
  }

  return res.json();
}

export async function createSleepLog(input: CreateSleepLogInput): Promise<SleepLog> {
  const res = await fetch("/api/health/sleep", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create sleep entry (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.log;
}

export async function updateSleepLog(
  id: string,
  input: UpdateSleepLogInput
): Promise<SleepLog> {
  const res = await fetch(`/api/health/sleep/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update sleep entry (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.log;
}

export async function deleteSleepLog(id: string): Promise<void> {
  const res = await fetch(`/api/health/sleep/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete sleep entry (HTTP ${res.status})`);
  }
}

// ----------------------------------------------------------------------------
// 5. Health Goals APIs
// ----------------------------------------------------------------------------

export async function fetchHealthGoals(): Promise<HealthGoalsResponse["goals"]> {
  const res = await fetch("/api/health/goals", { method: "GET" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch health goals (HTTP ${res.status})`);
  }

  const data: HealthGoalsResponse = await res.json();
  return data.goals;
}

export async function updateHealthGoals(
  input: UpdateHealthGoalsInput
): Promise<HealthGoalsResponse["goals"]> {
  const res = await fetch("/api/health/goals", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update health goals (HTTP ${res.status})`);
  }

  const data = await res.json();
  return data.goals;
}
