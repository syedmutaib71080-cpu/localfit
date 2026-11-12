/**
 * Health Tracking Domain Types (Stage 9 Foundation)
 * Covers Weight, Water, Sleep, BMI, and Health Goals.
 */

export type SleepQuality = "poor" | "fair" | "good" | "excellent";

export type BmiCategory =
  | "Underweight"
  | "Normal weight"
  | "Overweight"
  | "Obese Class I"
  | "Obese Class II"
  | "Obese Class III";

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_date: string; // YYYY-MM-DD
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  intake_date: string; // YYYY-MM-DD
  amount_ml: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  sleep_date: string; // YYYY-MM-DD
  duration_minutes: number;
  bedtime: string | null;
  wake_time: string | null;
  sleep_quality: SleepQuality | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BmiResult {
  bmi: number | null;
  category: BmiCategory | null;
  healthyWeightRangeKg: { min: number; max: number } | null;
  isHealthy: boolean;
}

export interface WaterIntakeSummary {
  date: string;
  totalMl: number;
  entryCount: number;
  goalMl: number | null;
  progressPercent: number | null;
  remainingMl: number | null;
}

export interface SleepSummary {
  date: string;
  durationMinutes: number;
  formattedDuration: string;
  quality: SleepQuality | null;
  goalMinutes: number | null;
  progressPercent: number | null;
}

export interface WeightChangeResult {
  currentWeight: number;
  previousWeight: number;
  differenceKg: number;
  direction: "loss" | "gain" | "neutral";
}

export interface HealthGoalSettings {
  daily_water_goal_ml?: number | null;
  daily_sleep_goal_minutes?: number | null;
}

export interface CreateWeightLogInput {
  weight_kg: number;
  logged_date?: string;
  notes?: string | null;
}

export interface UpdateWeightLogInput {
  weight_kg?: number;
  logged_date?: string;
  notes?: string | null;
}

export interface CreateWaterLogInput {
  amount_ml: number;
  intake_date?: string;
  notes?: string | null;
}

export interface UpdateWaterLogInput {
  amount_ml?: number;
  intake_date?: string;
  notes?: string | null;
}

export interface CreateSleepLogInput {
  sleep_date?: string;
  duration_minutes?: number;
  bedtime?: string | null;
  wake_time?: string | null;
  sleep_quality?: SleepQuality | null;
  notes?: string | null;
}

export interface UpdateSleepLogInput {
  sleep_date?: string;
  duration_minutes?: number;
  bedtime?: string | null;
  wake_time?: string | null;
  sleep_quality?: SleepQuality | null;
  notes?: string | null;
}

export interface UpdateHealthGoalsInput {
  daily_water_goal_ml?: number | null;
  daily_sleep_goal_minutes?: number | null;
}
