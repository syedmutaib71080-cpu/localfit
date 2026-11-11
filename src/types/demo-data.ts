export type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealItem {
  id: string;
  name: string;
  portion: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  category: MealCategory;
  time?: string;
}

export interface DayNutrition {
  date: string;
  totalCalories: number;
  targetCalories: number;
  proteinG: number;
  targetProteinG: number;
  carbsG: number;
  targetCarbsG: number;
  fatG: number;
  targetFatG: number;
  waterMl: number;
  targetWaterMl: number;
}

export type WorkoutType = "walking" | "running" | "cycling";

export interface WorkoutSession {
  id: string;
  type: WorkoutType;
  title: string;
  durationMinutes: number;
  distanceKm: number;
  caloriesBurned: number;
  pace: string;
  heartRateAvg: number;
  date: string;
  intensity: "low" | "moderate" | "high";
}

export interface DailyActivityRecord {
  day: string;
  shortDay: string;
  steps: number;
  stepGoal: number;
  distanceKm: number;
  caloriesBurned: number;
  activeMinutes: number;
}

export interface WeightRecord {
  date: string;
  weightKg: number;
  bmi: number;
}

export interface UserProfileData {
  name: string;
  email: string;
  age: number;
  heightCm: number;
  weightKg: number;
  goalWeightKg: number;
  fitnessGoal: string;
  activityLevel: string;
  joinedDate: string;
}

export interface UserSettingsData {
  mealReminders: boolean;
  workoutReminders: boolean;
  waterReminders: boolean;
  weeklyDigest: boolean;
  units: "metric" | "imperial";
  dataSharing: boolean;
  fontSize: "default" | "large";
}
