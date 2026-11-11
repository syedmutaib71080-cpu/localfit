export type ActivityType = "walking" | "running" | "cycling";

export type StepSource = "manual" | "device_sensor" | "workout_estimate";

export interface RouteCoordinate {
  lat: number;
  lng: number;
  timestamp_offset_sec: number;
  accuracy_m?: number;
  altitude_m?: number | null;
  speed_mps?: number | null;
}

export interface ActivityWorkout {
  id: string;
  user_id: string;
  session_token: string;
  activity_type: ActivityType;
  start_time: string;
  finish_time: string;
  duration_seconds: number;
  distance_meters: number;
  avg_pace_or_speed: number; // For walking/running: pace in seconds/km. For cycling: speed in km/h.
  estimated_calories: number | null;
  step_count: number | null;
  route_data: RouteCoordinate[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateWorkoutInput {
  session_token: string;
  activity_type: ActivityType;
  start_time: string;
  finish_time: string;
  duration_seconds: number;
  distance_meters: number;
  avg_pace_or_speed: number;
  step_count?: number | null;
  route_data?: RouteCoordinate[] | null;
  notes?: string | null;
}

export interface DailyStepEntry {
  id: string;
  user_id: string;
  step_date: string;
  steps: number;
  source: StepSource;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStepInput {
  step_date: string;
  steps: number;
  source?: StepSource;
  notes?: string | null;
}

export interface UpdateStepInput {
  steps?: number;
  notes?: string | null;
}

export interface CalorieEstimationResult {
  estimatedCalories: number | null;
  met: number | null;
  weightUsedKg: number | null;
  reason?: "PROFILE_WEIGHT_REQUIRED" | "CALCULATED";
  explanation: string;
}

export interface DailyActivitySummary {
  date: string;
  total_steps: number;
  step_entries_count: number;
  walking_distance_km: number;
  running_distance_km: number;
  cycling_distance_km: number;
  total_workout_duration_seconds: number;
  total_estimated_calories: number;
  workouts_with_calories_count: number;
  workouts_without_calories_count: number;
  workouts_count: number;
}

export interface WeeklyDaySummary {
  date: string;
  dayLabel: string;
  steps: number;
  totalDistanceKm: number;
  activeDurationMinutes: number;
  estimatedCalories: number;
}
