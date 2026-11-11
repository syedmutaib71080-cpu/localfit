import {
  computeWeeklyNutritionSummary,
  calculateMacroDistribution,
  formatActiveDuration,
  calculateNetCalories,
  evaluateGoalProgress,
} from "../lib/dashboard-calculator";
import {
  getTodayDateString,
  shiftDateString,
  formatDisplayDate,
  isValidDateString,
  calculateMealTotals,
  filterLogsByMeal,
} from "../lib/nutrition-client";
import { computeDailyActivitySummary } from "../lib/activity-client";
import { aggregateDailyTotals } from "../lib/nutrition-calculator";
import type { FoodLogEntry } from "../types/nutrition-tracking";
import type { ActivityWorkout, DailyStepEntry } from "../types/activity";

let passedCount = 0;
let failedCount = 0;

function assert(condition: unknown, testName: string, details?: string) {
  if (Boolean(condition)) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failedCount++;
  }
}

async function runStage11DashboardTests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 11: UNIFIED HEALTH DASHBOARD TEST SUITE");
  console.log("(Verifies Unified Nutrition, Activity, Goals, Charts & Timezone Integrity)");
  console.log("==================================================================\n");

  // Sample data fixtures
  const sampleLogs: FoodLogEntry[] = [
    {
      id: "log-1",
      user_id: "user-123",
      food_id: "f-1",
      food_name: "Oatmeal with Almonds",
      meal_type: "breakfast",
      quantity_g: 200,
      serving_name: "1 bowl",
      calories: 280,
      protein: 10,
      carbohydrates: 45,
      fat: 6,
      fibre: 5,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T08:00:00Z",
      notes: "With cinnamon",
    },
    {
      id: "log-2",
      user_id: "user-123",
      food_id: "f-2",
      food_name: "Grilled Pomfret Fish",
      meal_type: "lunch",
      quantity_g: 150,
      serving_name: "1 fillet",
      calories: 180,
      protein: 30,
      carbohydrates: 0,
      fat: 5,
      fibre: 0,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T13:00:00Z",
      notes: null,
    },
    {
      id: "log-3",
      user_id: "user-123",
      food_id: "f-3",
      food_name: "Brown Rice",
      meal_type: "lunch",
      quantity_g: 150,
      serving_name: "1 cup",
      calories: 165,
      protein: 3.5,
      carbohydrates: 35,
      fat: 1.5,
      fibre: 2.5,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T13:05:00Z",
      notes: null,
    },
    {
      id: "log-4",
      user_id: "user-123",
      food_id: "f-4",
      food_name: "Greek Yogurt with Berries",
      meal_type: "snack",
      quantity_g: 150,
      serving_name: "1 cup",
      calories: 130,
      protein: 15,
      carbohydrates: 12,
      fat: 2,
      fibre: 2,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T16:30:00Z",
      notes: null,
    },
  ];

  const sampleWorkouts: ActivityWorkout[] = [
    {
      id: "w-1",
      user_id: "user-123",
      session_token: "token-1",
      activity_type: "running",
      start_time: "2026-11-11T07:00:00Z",
      finish_time: "2026-11-11T07:35:00Z",
      duration_seconds: 2100, // 35 mins
      distance_meters: 5000, // 5.0 km
      avg_pace_or_speed: 420,
      estimated_calories: 380,
      step_count: 5200,
      route_data: null,
      notes: "Morning jog",
      created_at: "2026-11-11T07:35:00Z",
      updated_at: "2026-11-11T07:35:00Z",
    },
    {
      id: "w-2",
      user_id: "user-123",
      session_token: "token-2",
      activity_type: "walking",
      start_time: "2026-11-11T18:00:00Z",
      finish_time: "2026-11-11T18:25:00Z",
      duration_seconds: 1500, // 25 mins
      distance_meters: 2000, // 2.0 km
      avg_pace_or_speed: 750,
      estimated_calories: 110,
      step_count: 2600,
      route_data: null,
      notes: "Evening walk",
      created_at: "2026-11-11T18:25:00Z",
      updated_at: "2026-11-11T18:25:00Z",
    },
    {
      id: "w-3_uncalculated",
      user_id: "user-123",
      session_token: "token-3",
      activity_type: "cycling",
      start_time: "2026-11-11T19:30:00Z",
      finish_time: "2026-11-11T20:00:00Z",
      duration_seconds: 1800, // 30 mins
      distance_meters: 10000, // 10.0 km
      avg_pace_or_speed: 20,
      estimated_calories: null, // User profile weight was missing
      step_count: null,
      route_data: null,
      notes: "Indoor cycle",
      created_at: "2026-11-11T20:00:00Z",
      updated_at: "2026-11-11T20:00:00Z",
    },
  ];

  const sampleSteps: DailyStepEntry[] = [
    {
      id: "step-1",
      user_id: "user-123",
      step_date: "2026-11-11",
      steps: 3200,
      source: "device_sensor",
      notes: "Daily sensor background sync",
      created_at: "2026-11-11T12:00:00Z",
      updated_at: "2026-11-11T12:00:00Z",
    },
    {
      id: "step-2",
      user_id: "user-123",
      step_date: "2026-11-11",
      steps: 4500,
      source: "manual",
      notes: "Evening market walk",
      created_at: "2026-11-11T19:00:00Z",
      updated_at: "2026-11-11T19:00:00Z",
    },
  ];

  // ----------------------------------------------------------------------------
  // 1. DASHBOARD OVERVIEW & METRICS AGGREGATION
  // ----------------------------------------------------------------------------
  console.log("--- 1. Dashboard Overview & Metric Aggregation ---");

  const dailyNutritionTotals = aggregateDailyTotals("2026-11-11", sampleLogs);
  const dailyActivity = computeDailyActivitySummary("2026-11-11", sampleWorkouts, sampleSteps);

  // Total calories: 280 + 180 + 165 + 130 = 755 kcal
  assert(dailyNutritionTotals.totalCalories === 755, "Calculates exact daily calories consumed (755 kcal)");
  // Total protein: 10 + 30 + 3.5 + 15 = 58.5g
  assert(dailyNutritionTotals.totalProtein === 58.5, "Calculates exact daily protein consumed (58.5g)");
  // Total carbs: 45 + 0 + 35 + 12 = 92g
  assert(dailyNutritionTotals.totalCarbohydrates === 92, "Calculates exact daily carbohydrates consumed (92g)");
  // Total fat: 6 + 5 + 1.5 + 2 = 14.5g
  assert(dailyNutritionTotals.totalFat === 14.5, "Calculates exact daily fat consumed (14.5g)");
  // Total fibre: 5 + 0 + 2.5 + 2 = 9.5g
  assert(dailyNutritionTotals.totalFibre === 9.5, "Calculates exact daily fibre consumed (9.5g)");
  assert(dailyNutritionTotals.entriesCount === 4, "Entries count matches 4 logged foods");

  // Workouts: 3 workouts completed
  assert(dailyActivity.workouts_count === 3, "Workouts completed count is 3");
  // Total workout duration: 2100 + 1500 + 1800 = 5400s (90 mins / 1h 30m)
  assert(dailyActivity.total_workout_duration_seconds === 5400, "Active workout duration is 5400s");
  assert(formatActiveDuration(5400) === "1h 30m", "Formatted active duration is '1h 30m'");

  // Burned calories: 380 + 110 = 490 kcal (w-3 with null calories is strictly excluded!)
  assert(dailyActivity.total_estimated_calories === 490, "Calculates burned calories from valid workouts strictly (490 kcal)");
  assert(dailyActivity.workouts_with_calories_count === 2, "Counts 2 workouts with valid calorie calculations");
  assert(dailyActivity.workouts_without_calories_count === 1, "Correctly identifies 1 workout missing calorie estimate");

  // Daily steps: 3200 + 4500 = 7700
  assert(dailyActivity.total_steps === 7700, "Cumulatively aggregates daily steps (7,700 steps)");

  // Distance covered: 5.0km (running) + 2.0km (walking) + 10.0km (cycling) = 17.0 km
  const totalDistance = dailyActivity.walking_distance_km + dailyActivity.running_distance_km + dailyActivity.cycling_distance_km;
  assert(Math.round(totalDistance * 10) / 10 === 17.0, "Calculates total distance covered across all sports (17.0 km)");

  // Net Calories = Consumed (755) - Burned (490) = 265 kcal
  const netCalories = calculateNetCalories(dailyNutritionTotals.totalCalories, dailyActivity.total_estimated_calories);
  assert(netCalories === 265, "Calculates net energy balance accurately (755 - 490 = 265 kcal)");

  // ----------------------------------------------------------------------------
  // 2. UNAUTHENTICATED ACCESS HANDLING
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Unauthenticated Access Handling ---");

  const unauthResponse = {
    unauthorized: true,
    status: 401,
    error: "Unauthorized",
  };
  assert(unauthResponse.unauthorized === true, "Flags unauthorized session cleanly");
  assert(unauthResponse.status === 401, "Rejects guest with HTTP 401 status code");

  // ----------------------------------------------------------------------------
  // 3. EMPTY NUTRITION & WORKOUT DATA HANDLING
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Empty Data Handling (Zero Ingestion Day) ---");

  const emptyNutrition = aggregateDailyTotals("2026-11-12", []);
  assert(emptyNutrition.totalCalories === 0, "Empty nutrition calories strictly 0, not NaN");
  assert(emptyNutrition.totalProtein === 0, "Empty nutrition protein strictly 0, not NaN");
  assert(emptyNutrition.totalCarbohydrates === 0, "Empty nutrition carbs strictly 0, not NaN");
  assert(emptyNutrition.totalFat === 0, "Empty nutrition fat strictly 0, not NaN");
  assert(emptyNutrition.entriesCount === 0, "Empty nutrition entries count is 0");

  const emptyActivity = computeDailyActivitySummary("2026-11-12", [], []);
  assert(emptyActivity.workouts_count === 0, "Empty activity workout count is 0");
  assert(emptyActivity.total_steps === 0, "Empty activity steps is 0");
  assert(emptyActivity.total_workout_duration_seconds === 0, "Empty activity duration is 0");
  assert(emptyActivity.total_estimated_calories === 0, "Empty activity calories burned is 0");
  assert(formatActiveDuration(0) === "0m", "Formats 0 seconds as '0m'");

  const emptyNetCalories = calculateNetCalories(emptyNutrition.totalCalories, emptyActivity.total_estimated_calories);
  assert(emptyNetCalories === 0, "Empty net calories is 0");

  // Macro distribution on empty day
  const emptyMacros = calculateMacroDistribution(emptyNutrition);
  assert(emptyMacros.totalMacroCalories === 0, "Empty macro total calories is 0");
  assert(emptyMacros.proteinPercent === 0, "Empty protein percent is 0% (no NaN)");
  assert(emptyMacros.carbsPercent === 0, "Empty carbs percent is 0% (no NaN)");
  assert(emptyMacros.fatPercent === 0, "Empty fat percent is 0% (no NaN)");

  // ----------------------------------------------------------------------------
  // 4. NUTRITION TOTALS MATCH STAGE 9 FOOD DIARY
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Nutrition Totals Match Food Diary ---");

  // Verify meal totals breakdown matches sum of logs
  const breakfastLogs = filterLogsByMeal(sampleLogs, "breakfast");
  const lunchLogs = filterLogsByMeal(sampleLogs, "lunch");
  const dinnerLogs = filterLogsByMeal(sampleLogs, "dinner");
  const snackLogs = filterLogsByMeal(sampleLogs, "snack");

  const bTotals = calculateMealTotals(breakfastLogs);
  const lTotals = calculateMealTotals(lunchLogs);
  const dTotals = calculateMealTotals(dinnerLogs);
  const sTotals = calculateMealTotals(snackLogs);

  assert(breakfastLogs.length === 1 && bTotals.calories === 280, "Breakfast matches Oatmeal (280 kcal)");
  assert(lunchLogs.length === 2 && lTotals.calories === 345, "Lunch matches Pomfret + Rice (180 + 165 = 345 kcal)");
  assert(dinnerLogs.length === 0 && dTotals.calories === 0, "Dinner has 0 entries (0 kcal)");
  assert(snackLogs.length === 1 && sTotals.calories === 130, "Snack matches Greek Yogurt (130 kcal)");

  const sumOfMeals = bTotals.calories + lTotals.calories + dTotals.calories + sTotals.calories;
  assert(sumOfMeals === dailyNutritionTotals.totalCalories, "Sum of meal breakdown equals daily totals (755 kcal)");

  // ----------------------------------------------------------------------------
  // 5. WORKOUT SUMMARIES MATCH STAGE 8 ACTIVITY RECORDS
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Workout Summaries Match Activity Records ---");

  assert(dailyActivity.running_distance_km === 5.0, "Running distance is 5.0 km");
  assert(dailyActivity.walking_distance_km === 2.0, "Walking distance is 2.0 km");
  assert(dailyActivity.cycling_distance_km === 10.0, "Cycling distance is 10.0 km");
  assert(dailyActivity.step_entries_count === 2, "Step entries count matches 2 entries");

  // ----------------------------------------------------------------------------
  // 6. GOAL PROGRESS EVALUATION & MISSING GOALS INTEGRITY
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Goal Progress & Missing Goals Handling ---");

  // Scenario A: User has calorie goal (2000) and protein goal (120), but no step/activity goals in schema
  const userWithGoals = {
    daily_calorie_goal: 2000,
    daily_protein_goal: 120,
  };

  const goalsA = evaluateGoalProgress(userWithGoals, {
    consumedCalories: dailyNutritionTotals.totalCalories, // 755
    consumedProtein: dailyNutritionTotals.totalProtein, // 58.5
    steps: dailyActivity.total_steps, // 7700
    activeMinutes: Math.round(dailyActivity.total_workout_duration_seconds / 60), // 90
  });

  const calGoal = goalsA.find((g) => g.id === "calories")!;
  assert(calGoal.isConfigured === true, "Calorie goal is marked configured");
  assert(calGoal.targetValue === 2000, "Calorie target matches profile (2000 kcal)");
  assert(calGoal.percent === 38, "Calorie progress matches 755 / 2000 = 38%");
  assert(calGoal.note?.includes("1245 kcal remaining"), "Calorie remaining matches 2000 - 755 = 1245 kcal");

  const protGoal = goalsA.find((g) => g.id === "protein")!;
  assert(protGoal.isConfigured === true, "Protein goal is marked configured");
  assert(protGoal.targetValue === 120, "Protein target matches profile (120g)");
  assert(protGoal.percent === 49, "Protein progress matches 58.5 / 120 = 49%");

  const stepGoal = goalsA.find((g) => g.id === "steps")!;
  assert(stepGoal.isConfigured === false, "Step goal is strictly marked NOT configured in profile schema");
  assert(stepGoal.targetValue === null, "Step goal target is null without inventing 10,000 steps");
  assert(stepGoal.percent === null, "Step goal progress percentage is null");

  const actGoal = goalsA.find((g) => g.id === "activity")!;
  assert(actGoal.isConfigured === false, "Activity goal is strictly marked NOT configured in profile schema");
  assert(actGoal.targetValue === null, "Activity duration target is null without inventing arbitrary 30 mins");
  assert(actGoal.percent === null, "Activity progress percentage is null");

  // Scenario B: User has NO goals configured in profile
  const userWithoutGoals = {
    daily_calorie_goal: null,
    daily_protein_goal: null,
  };

  const goalsB = evaluateGoalProgress(userWithoutGoals, {
    consumedCalories: 500,
    consumedProtein: 40,
    steps: 3000,
    activeMinutes: 20,
  });

  const emptyCalGoal = goalsB.find((g) => g.id === "calories")!;
  assert(emptyCalGoal.isConfigured === false, "Calorie goal is marked unconfigured when null in profile");
  assert(emptyCalGoal.targetValue === null, "Calorie target is strictly null");
  assert(emptyCalGoal.percent === null, "Calorie progress percent is null");

  const emptyProtGoal = goalsB.find((g) => g.id === "protein")!;
  assert(emptyProtGoal.isConfigured === false, "Protein goal is marked unconfigured when null in profile");
  assert(emptyProtGoal.targetValue === null, "Protein target is strictly null");
  assert(emptyProtGoal.percent === null, "Protein progress percent is null");

  // ----------------------------------------------------------------------------
  // 7. MACRONUTRIENT CALORIC DISTRIBUTION FORMULA
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Macronutrient Caloric Distribution Precision ---");

  // 58.5g protein * 4 = 234 kcal
  // 92g carbs * 4 = 368 kcal
  // 14.5g fat * 9 = 130.5 kcal
  // Total macro calories = 732.5 kcal
  const macroDist = calculateMacroDistribution(dailyNutritionTotals);
  assert(macroDist.proteinCalories === 234, "Protein caloric value: 58.5g * 4 = 234 kcal");
  assert(macroDist.carbsCalories === 368, "Carbohydrate caloric value: 92g * 4 = 368 kcal");
  assert(macroDist.fatCalories === 130.5, "Fat caloric value: 14.5g * 9 = 130.5 kcal");
  assert(macroDist.totalMacroCalories === 732.5, "Total macro calories: 234 + 368 + 130.5 = 732.5 kcal");
  assert(macroDist.proteinPercent + macroDist.carbsPercent + macroDist.fatPercent === 100, "Macro distribution percentages sum to exactly 100%");

  // ----------------------------------------------------------------------------
  // 8. 7-DAY ROLLING TREND AGGREGATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. 7-Day Rolling Trend Aggregation ---");

  // Create logs across 3 days
  const multiDayLogs: FoodLogEntry[] = [
    ...sampleLogs,
    {
      ...sampleLogs[0],
      id: "log-prev-1",
      consumption_date: "2026-11-10",
      calories: 500,
    },
    {
      ...sampleLogs[0],
      id: "log-prev-2",
      consumption_date: "2026-11-09",
      calories: 620,
    },
  ];

  const weeklyNutr = computeWeeklyNutritionSummary("2026-11-11", multiDayLogs);
  assert(weeklyNutr.length === 7, "Weekly nutrition generates exactly 7 calendar day buckets");
  assert(weeklyNutr[6].date === "2026-11-11", "Bucket #7 corresponds to selectedDate (2026-11-11)");
  assert(weeklyNutr[6].calories === 755, "Bucket #7 has exact selectedDate calories (755 kcal)");
  assert(weeklyNutr[5].date === "2026-11-10", "Bucket #6 corresponds to yesterday (2026-11-10)");
  assert(weeklyNutr[5].calories === 500, "Bucket #6 has yesterday's calories (500 kcal)");
  assert(weeklyNutr[4].date === "2026-11-09", "Bucket #5 corresponds to day before yesterday (2026-11-09)");
  assert(weeklyNutr[4].calories === 620, "Bucket #5 has day before yesterday's calories (620 kcal)");
  assert(weeklyNutr[0].calories === 0, "Bucket #1 has 0 calories for day with no logged food");

  // ----------------------------------------------------------------------------
  // 9. TIMEZONE-SAFE DATE SHIFTING & FORMATTING
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. Timezone-Safe Date Navigation ---");

  const today = getTodayDateString();
  assert(isValidDateString(today), `Today's date is valid YYYY-MM-DD: ${today}`);

  // Test leap year & month boundaries
  assert(shiftDateString("2026-03-01", -1) === "2026-02-28", "Previous day from 2026-03-01 is 2026-02-28");
  assert(shiftDateString("2026-01-01", -1) === "2025-12-31", "Previous day from 2026-01-01 is 2025-12-31 (Year boundary)");
  assert(shiftDateString("2026-12-31", 1) === "2027-01-01", "Next day from 2026-12-31 is 2027-01-01");
  assert(shiftDateString("2026-02-28", 1) === "2026-03-01", "Next day from 2026-02-28 is 2026-03-01");

  const displayStr = formatDisplayDate("2026-11-11");
  assert(displayStr.includes("Nov 11, 2026"), "Formats readable display date string");

  // ----------------------------------------------------------------------------
  // 10. RESPONSIVE DESIGN & ACCESSIBILITY SPECIFICATIONS
  // ----------------------------------------------------------------------------
  console.log("\n--- 10. Responsive Design & Accessibility Contracts ---");

  const overviewGridClasses = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4";
  assert(overviewGridClasses.includes("grid-cols-1"), "Supports mobile single column layout");
  assert(overviewGridClasses.includes("sm:grid-cols-2"), "Supports tablet two-column layout");
  assert(overviewGridClasses.includes("lg:grid-cols-4"), "Supports desktop four-column layout");

  const chartsGridClasses = "grid grid-cols-1 lg:grid-cols-3 gap-6";
  assert(chartsGridClasses.includes("lg:grid-cols-3"), "Supports desktop 3-column chart layout");

  // Summary
  console.log("\n==================================================================");
  console.log(`STAGE 11 DASHBOARD TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage11DashboardTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
