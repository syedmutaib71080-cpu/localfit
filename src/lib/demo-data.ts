import {
  MealItem,
  DayNutrition,
  WorkoutSession,
  DailyActivityRecord,
  WeightRecord,
  UserProfileData,
  UserSettingsData,
} from "@/types/demo-data";

/**
 * -------------------------------------------------------------
 * LOCALFIT DEMO DATA REPOSITORY
 * NOTICE: All metrics, readings, and logs below are STATIC SAMPLE
 * DATA provided solely for Stage 2 UI prototype evaluation.
 * No live telemetry, medical advice, or personal sensors connected.
 * -------------------------------------------------------------
 */

export const DEMO_DATA_TAG = "SAMPLE PROTOTYPE DATA";

export const demoUserProfile: UserProfileData = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  age: 29,
  heightCm: 178,
  weightKg: 73.4,
  goalWeightKg: 70.0,
  fitnessGoal: "Build lean strength & sustain metabolic vitality",
  activityLevel: "Moderately Active (4–5 workouts/week)",
  joinedDate: "January 2026",
};

export const demoTodayNutrition: DayNutrition = {
  date: "Today, Nov 10",
  totalCalories: 1680,
  targetCalories: 2200,
  proteinG: 118,
  targetProteinG: 150,
  carbsG: 164,
  targetCarbsG: 220,
  fatG: 52,
  targetFatG: 70,
  waterMl: 1750,
  targetWaterMl: 2500,
};

export const demoRecentMeals: MealItem[] = [
  {
    id: "m-1",
    name: "Wild Salmon Bowl & Avocado",
    portion: "1 medium bowl (340g)",
    calories: 540,
    proteinG: 42,
    carbsG: 38,
    fatG: 22,
    category: "lunch",
    time: "1:15 PM",
  },
  {
    id: "m-2",
    name: "Sprouted Oats, Berries & Whey",
    portion: "1 bowl (280g)",
    calories: 420,
    proteinG: 32,
    carbsG: 54,
    fatG: 8,
    category: "breakfast",
    time: "8:30 AM",
  },
  {
    id: "m-3",
    name: "Greek Yogurt with Chia & Honey",
    portion: "1 cup (200g)",
    calories: 220,
    proteinG: 18,
    carbsG: 20,
    fatG: 6,
    category: "snack",
    time: "4:00 PM",
  },
  {
    id: "m-4",
    name: "Grilled Herb Chicken & Sweet Potato",
    portion: "1 plate (380g)",
    calories: 500,
    proteinG: 46,
    carbsG: 44,
    fatG: 12,
    category: "dinner",
    time: "7:45 PM",
  },
];

export const demoWeeklyActivity: DailyActivityRecord[] = [
  { day: "Monday", shortDay: "Mon", steps: 8420, stepGoal: 10000, distanceKm: 6.1, caloriesBurned: 410, activeMinutes: 45 },
  { day: "Tuesday", shortDay: "Tue", steps: 10250, stepGoal: 10000, distanceKm: 7.8, caloriesBurned: 520, activeMinutes: 62 },
  { day: "Wednesday", shortDay: "Wed", steps: 7910, stepGoal: 10000, distanceKm: 5.8, caloriesBurned: 390, activeMinutes: 40 },
  { day: "Thursday", shortDay: "Thu", steps: 11400, stepGoal: 10000, distanceKm: 8.7, caloriesBurned: 580, activeMinutes: 70 },
  { day: "Friday", shortDay: "Fri", steps: 9100, stepGoal: 10000, distanceKm: 6.9, caloriesBurned: 460, activeMinutes: 50 },
  { day: "Saturday", shortDay: "Sat", steps: 12800, stepGoal: 10000, distanceKm: 9.8, caloriesBurned: 640, activeMinutes: 85 },
  { day: "Sunday", shortDay: "Sun", steps: 8750, stepGoal: 10000, distanceKm: 6.4, caloriesBurned: 430, activeMinutes: 48 },
];

export const demoWorkouts: WorkoutSession[] = [
  {
    id: "w-1",
    type: "running",
    title: "Morning Forest Trail Run",
    durationMinutes: 38,
    distanceKm: 5.6,
    caloriesBurned: 410,
    pace: "6'47\" /km",
    heartRateAvg: 154,
    date: "Today, 7:15 AM",
    intensity: "high",
  },
  {
    id: "w-2",
    type: "walking",
    title: "Sunset Brisk Walk",
    durationMinutes: 45,
    distanceKm: 3.8,
    caloriesBurned: 195,
    pace: "11'50\" /km",
    heartRateAvg: 108,
    date: "Yesterday, 6:30 PM",
    intensity: "low",
  },
  {
    id: "w-3",
    type: "cycling",
    title: "Coastal Road Interval Ride",
    durationMinutes: 52,
    distanceKm: 18.4,
    caloriesBurned: 490,
    pace: "21.2 km/h",
    heartRateAvg: 142,
    date: "Nov 8, 2026",
    intensity: "moderate",
  },
  {
    id: "w-4",
    type: "running",
    title: "Tempo Interval Session",
    durationMinutes: 30,
    distanceKm: 4.8,
    caloriesBurned: 360,
    pace: "6'15\" /km",
    heartRateAvg: 162,
    date: "Nov 6, 2026",
    intensity: "high",
  },
];

export const demoWeightHistory: WeightRecord[] = [
  { date: "Oct 1", weightKg: 75.8, bmi: 23.9 },
  { date: "Oct 8", weightKg: 75.2, bmi: 23.7 },
  { date: "Oct 15", weightKg: 74.8, bmi: 23.6 },
  { date: "Oct 22", weightKg: 74.3, bmi: 23.5 },
  { date: "Oct 29", weightKg: 73.9, bmi: 23.3 },
  { date: "Nov 5", weightKg: 73.6, bmi: 23.2 },
  { date: "Nov 10", weightKg: 73.4, bmi: 23.2 },
];

export const demoUserSettings: UserSettingsData = {
  mealReminders: true,
  workoutReminders: true,
  waterReminders: true,
  weeklyDigest: false,
  units: "metric",
  dataSharing: false,
  fontSize: "default",
};

export const demoCommonFoods = [
  { name: "Organic Rolled Oats (dry)", calories: 150, protein: 5, carbs: 27, fat: 3, portion: "40g" },
  { name: "Blueberries (fresh)", calories: 57, protein: 0.7, carbs: 14, fat: 0.3, portion: "100g" },
  { name: "Chicken Breast (grilled)", calories: 165, protein: 31, carbs: 0, fat: 3.6, portion: "100g" },
  { name: "Brown Basmati Rice (cooked)", calories: 150, protein: 3.5, carbs: 32, fat: 1, portion: "125g" },
  { name: "Hass Avocado", calories: 160, protein: 2, carbs: 8.5, fat: 14.7, portion: "100g" },
  { name: "Organic Whole Eggs (boiled)", calories: 140, protein: 12, carbs: 1, fat: 10, portion: "2 large" },
  { name: "Baby Spinach (steamed)", calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, portion: "100g" },
  { name: "Almonds (raw, unsalted)", calories: 164, protein: 6, carbs: 6, fat: 14, portion: "28g" },
  { name: "Atlantic Salmon Fillet (baked)", calories: 208, protein: 22, carbs: 0, fat: 13, portion: "100g" },
  { name: "Sweet Potato (roasted)", calories: 90, protein: 2, carbs: 21, fat: 0.1, portion: "100g" },
];
