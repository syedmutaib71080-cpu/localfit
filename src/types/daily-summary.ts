export type DataState = "recorded" | "empty" | "error" | "unconfigured";

export interface LoggedMealItem {
  id: string;
  name: string;
  mealType: string;
  calories: number;
  proteinG: number;
}

export interface NutritionPillarSummary {
  status: DataState;
  caloriesConsumed: number | null;
  calorieGoal: number | null;
  caloriesRemaining: number | null;
  proteinConsumedG: number | null;
  proteinGoalG: number | null;
  proteinRemainingG: number | null;
  loggedMealCount: number;
  loggedMeals: LoggedMealItem[];
  completeness: {
    hasBreakfast: boolean;
    hasLunch: boolean;
    hasDinner: boolean;
    hasSnacks: boolean;
  };
  errorMessage?: string;
}

export interface ActivityWorkoutSummaryItem {
  id: string;
  activityType: string;
  durationSeconds: number;
  distanceMeters: number;
  estimatedCalories: number | null;
}

export interface ActivityPillarSummary {
  status: DataState;
  totalWorkouts: number;
  totalDurationSeconds: number;
  totalDistanceMeters: number;
  totalActiveCalories: number | null;
  totalSteps: number | null;
  workouts: ActivityWorkoutSummaryItem[];
  errorMessage?: string;
}

export interface HealthPillarSummary {
  weightStatus: DataState;
  weightKg: number | null;
  weightChangeKg: number | null;
  weightChangeDirection: "loss" | "gain" | "neutral" | null;
  heightCm: number | null;
  bmi: number | null;
  bmiCategory: string | null;

  waterStatus: DataState;
  waterTotalMl: number | null;
  waterGoalMl: number | null;
  waterRemainingMl: number | null;
  waterProgressPercent: number | null;

  sleepStatus: DataState;
  sleepDurationMinutes: number | null;
  sleepGoalMinutes: number | null;
  sleepQuality: string | null;
  sleepProgressPercent: number | null;

  errorMessage?: string;
}

export interface HealthInsightItem {
  id: string;
  pillar: "nutrition" | "activity" | "health" | "multi_pillar";
  category: "target_progress" | "consistency" | "caution" | "trend" | "balance";
  title: string;
  observation: string;
  isAiGenerated: boolean;
}

export interface DailyHealthSummaryResponse {
  success: boolean;
  targetDate: string;
  nutrition: NutritionPillarSummary;
  activity: ActivityPillarSummary;
  health: HealthPillarSummary;
  insights: HealthInsightItem[];
  disclaimer: string;
  code?: string;
  error?: string;
  message?: string;
}

export interface DailyHealthSummaryRequestPayload {
  date?: string;
  timezone?: string;
}
