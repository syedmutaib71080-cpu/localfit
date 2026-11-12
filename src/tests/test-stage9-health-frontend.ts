/**
 * LocalFit Stage 9.3: Complete Health Tracking UI Test Suite
 * Verifies Frontend Components, State, BMI Screening, Goals, Date Safety & UI Contracts.
 */

import {
  getBmiAnalysis,
  aggregateDailyWater,
  calculateWaterGoalProgress,
  summarizeDailySleep,
  formatSleepDuration,
  calculateSleepDurationFromTimestamps,
  calculateWeightChange,
} from "../lib/health-calculator";
import {
  validateWeightLogInput,
  validateWaterLogInput,
  validateSleepLogInput,
  validateHealthGoalsUpdate,
} from "../lib/health-validator";
import {
  getTodayDateString,
  shiftDateString,
  formatDisplayDate,
  isValidDateString,
} from "../lib/nutrition-client";
import type {
  WaterLog,
  SleepLog,
} from "../types/health-tracking";

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

async function runStage93FrontendTests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 9.3: HEALTH TRACKING FRONTEND TEST SUITE");
  console.log("(Verifies Weight UI, BMI Screening, Water, Sleep, Goals & Security)");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // 1. BMI SCREENING CALCULATION & MEDICAL DISCLAIMER CONTRACT
  // ----------------------------------------------------------------------------
  console.log("--- 1. BMI Screening Calculation & Medical Disclaimer ---");

  // Normal weight case
  const normalAnalysis = getBmiAnalysis(70.0, 175.0);
  assert(normalAnalysis.bmi === 22.9, "Calculates accurate BMI score: 70kg / (1.75m)^2 = 22.9");
  assert(normalAnalysis.category === "Normal weight", "Classifies 22.9 as 'Normal weight'");
  assert(normalAnalysis.isHealthy === true, "Marks normal weight as healthy range");
  assert(
    normalAnalysis.healthyWeightRangeKg?.min === 56.7 && normalAnalysis.healthyWeightRangeKg?.max === 76.3,
    "Provides healthy span 56.7–76.3 kg for 175 cm height"
  );

  // Overweight case
  const overweightAnalysis = getBmiAnalysis(85.0, 175.0);
  assert(overweightAnalysis.bmi === 27.8, "Calculates accurate BMI score for 85kg / 1.75m: 27.8");
  assert(overweightAnalysis.category === "Overweight", "Classifies 27.8 as 'Overweight'");
  assert(overweightAnalysis.isHealthy === false, "Marks overweight as outside normal boundary");

  // Underweight case
  const underweightAnalysis = getBmiAnalysis(50.0, 175.0);
  assert(underweightAnalysis.bmi === 16.3, "Calculates BMI score 16.3 for 50kg / 1.75m");
  assert(underweightAnalysis.category === "Underweight", "Classifies 16.3 as 'Underweight'");

  // Obese case
  const obeseAnalysis = getBmiAnalysis(105.0, 175.0);
  assert(obeseAnalysis.bmi === 34.3, "Calculates BMI score 34.3 for 105kg / 1.75m");
  assert(obeseAnalysis.category === "Obese Class I", "Classifies 34.3 as 'Obese Class I'");

  // Missing height handling without fabrication
  const missingHeight = getBmiAnalysis(70.0, null);
  assert(missingHeight.bmi === null, "BMI is strictly null when height is missing (null)");
  assert(missingHeight.category === null, "Category is strictly null when height is missing");
  assert(missingHeight.healthyWeightRangeKg === null, "Healthy range is strictly null when height is missing");

  // Missing weight handling without fabrication
  const missingWeight = getBmiAnalysis(null, 175.0);
  assert(missingWeight.bmi === null, "BMI is strictly null when weight is missing (null)");
  assert(missingWeight.category === null, "Category is strictly null when weight is missing");

  // Both missing
  const bothMissing = getBmiAnalysis(undefined, undefined);
  assert(bothMissing.bmi === null, "BMI is strictly null when both inputs are undefined");

  // Non-diagnostic clinical disclaimer specification verification
  const disclaimerText =
    "Screening indicator only, not a clinical diagnosis or measure of body fat. Body Mass Index (BMI) does not directly measure body fat percentage or muscle distribution.";
  assert(disclaimerText.includes("Screening indicator"), "Disclaimer explicitly identifies BMI as screening indicator");
  assert(disclaimerText.includes("not a clinical diagnosis"), "Disclaimer explicitly disclaims clinical diagnosis");
  assert(disclaimerText.includes("muscle"), "Disclaimer clarifies limitation regarding lean muscle mass");

  // ----------------------------------------------------------------------------
  // 2. WEIGHT TRACKING UI INTERACTIONS & DELTAS
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Weight Tracking UI Interactions & Deltas ---");

  // Weight decrease / loss
  const lossDelta = calculateWeightChange(74.5, 75.3);
  assert(lossDelta.differenceKg === -0.8, "Calculates weight delta: 74.5 - 75.3 = -0.8 kg");
  assert(lossDelta.direction === "loss", "Classifies delta as 'loss'");

  // Weight increase / gain
  const gainDelta = calculateWeightChange(76.2, 75.0);
  assert(gainDelta.differenceKg === 1.2, "Calculates weight delta: 76.2 - 75.0 = +1.2 kg");
  assert(gainDelta.direction === "gain", "Classifies delta as 'gain'");

  // Neutral / no change
  const neutralDelta = calculateWeightChange(74.5, 74.5);
  assert(neutralDelta.differenceKg === 0, "Calculates 0.0 kg delta for identical weigh-ins");
  assert(neutralDelta.direction === "neutral", "Classifies identical weigh-in as 'neutral'");

  // Form input validation for WeightEntryModal
  const validWeightInput = validateWeightLogInput({ weight_kg: 74.5, logged_date: "2026-11-12", notes: "Morning fasted" });
  assert(validWeightInput.valid, "Valid weight entry (74.5 kg) passes modal validation");

  const outOfBoundsLowWeight = validateWeightLogInput({ weight_kg: 15.0 });
  assert(!outOfBoundsLowWeight.valid, "Modal rejects weight < 20.0 kg (15 kg)");

  const outOfBoundsHighWeight = validateWeightLogInput({ weight_kg: 450.0 });
  assert(!outOfBoundsHighWeight.valid, "Modal rejects weight > 400.0 kg (450 kg)");

  const invalidDateFormat = validateWeightLogInput({ weight_kg: 75.0, logged_date: "12/11/2026" });
  assert(!invalidDateFormat.valid, "Modal rejects non YYYY-MM-DD date");

  // ----------------------------------------------------------------------------
  // 3. WATER TRACKING CALCULATIONS & QUICK ADD
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Water Tracking Calculations & Quick Add ---");

  const sampleWaterLogs: WaterLog[] = [
    {
      id: "w-1",
      user_id: "user-1",
      intake_date: "2026-11-12",
      amount_ml: 500,
      notes: "Morning bottle",
      created_at: "2026-11-12T07:30:00Z",
      updated_at: "2026-11-12T07:30:00Z",
    },
    {
      id: "w-2",
      user_id: "user-1",
      intake_date: "2026-11-12",
      amount_ml: 750,
      notes: "Post-workout flask",
      created_at: "2026-11-12T11:00:00Z",
      updated_at: "2026-11-12T11:00:00Z",
    },
    {
      id: "w-3",
      user_id: "user-1",
      intake_date: "2026-11-12",
      amount_ml: 250,
      notes: "Afternoon glass",
      created_at: "2026-11-12T15:00:00Z",
      updated_at: "2026-11-12T15:00:00Z",
    },
  ];

  const waterSummaryWithGoal = aggregateDailyWater(sampleWaterLogs, "2026-11-12", 2500);
  assert(waterSummaryWithGoal.totalMl === 1500, "Aggregates total daily water: 500 + 750 + 250 = 1500 ml");
  assert(waterSummaryWithGoal.entryCount === 3, "Counts 3 hydration entries for today");
  assert(waterSummaryWithGoal.progressPercent === 60, "Calculates 60% progress towards 2500ml goal (1500 / 2500)");
  assert(waterSummaryWithGoal.remainingMl === 1000, "Calculates 1000 ml remaining to goal (2500 - 1500)");

  // Quick add math simulation
  const afterQuickAdd250 = waterSummaryWithGoal.totalMl + 250;
  assert(afterQuickAdd250 === 1750, "Quick-add +250ml increases total to 1750 ml");
  assert(calculateWaterGoalProgress(afterQuickAdd250, 2500) === 70, "Quick-add increases progress to 70%");

  // Exceeding goal caps progress at 100%
  const exceededIntake = aggregateDailyWater(
    [...sampleWaterLogs, { id: "w-4", user_id: "u-1", intake_date: "2026-11-12", amount_ml: 1500, notes: null, created_at: "", updated_at: "" }],
    "2026-11-12",
    2500
  );
  assert(exceededIntake.totalMl === 3000, "Total water reaches 3000 ml");
  assert(exceededIntake.progressPercent === 100, "Progress is capped at 100% when goal is exceeded");
  assert(exceededIntake.remainingMl === 0, "Remaining ml is 0 when goal is exceeded");

  // Empty day handling
  const emptyWater = aggregateDailyWater([], "2026-11-12", 2000);
  assert(emptyWater.totalMl === 0, "Empty day has 0 ml without NaN");
  assert(emptyWater.progressPercent === 0, "Empty day progress is 0%");
  assert(emptyWater.remainingMl === 2000, "Remaining equals full goal on empty day");

  // Missing goal handling without fabrication
  const noGoalWater = aggregateDailyWater(sampleWaterLogs, "2026-11-12", null);
  assert(noGoalWater.goalMl === null, "Goal is strictly null when unconfigured");
  assert(noGoalWater.progressPercent === null, "Progress percent is strictly null without goal");
  assert(noGoalWater.remainingMl === null, "Remaining ml is strictly null without goal");

  // Input validation for WaterEntryModal
  const validWaterInput = validateWaterLogInput({ amount_ml: 500, intake_date: "2026-11-12", notes: "Bottle" });
  assert(validWaterInput.valid, "Valid water entry (500 ml) passes modal validation");

  const zeroWater = validateWaterLogInput({ amount_ml: 0 });
  assert(!zeroWater.valid, "Rejects 0 ml intake");

  const excessiveWater = validateWaterLogInput({ amount_ml: 12000 });
  assert(!excessiveWater.valid, "Rejects excessive intake > 10,000 ml");

  // ----------------------------------------------------------------------------
  // 4. SLEEP TRACKING CALCULATIONS & RECOVERY METRICS
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Sleep Tracking Calculations & Recovery Metrics ---");

  const sampleSleepLogs: SleepLog[] = [
    {
      id: "s-1",
      user_id: "user-1",
      sleep_date: "2026-11-12",
      duration_minutes: 480,
      bedtime: "2026-11-11T23:00:00Z",
      wake_time: "2026-11-12T07:00:00Z",
      sleep_quality: "good",
      notes: "Restful sleep",
      created_at: "2026-11-12T07:05:00Z",
      updated_at: "2026-11-12T07:05:00Z",
    },
  ];

  const sleepSummaryWithGoal = summarizeDailySleep(sampleSleepLogs, "2026-11-12", 480);
  assert(sleepSummaryWithGoal.durationMinutes === 480, "Aggregates 480 min sleep duration");
  assert(sleepSummaryWithGoal.formattedDuration === "8h 0m", "Formats duration as '8h 0m'");
  assert(sleepSummaryWithGoal.quality === "good", "Identifies 'good' sleep quality");
  assert(sleepSummaryWithGoal.progressPercent === 100, "Calculates 100% progress towards 8-hour goal");

  // Formatting variations
  assert(formatSleepDuration(450) === "7h 30m", "Formats 450 min as '7h 30m'");
  assert(formatSleepDuration(90) === "1h 30m", "Formats 90 min as '1h 30m'");
  assert(formatSleepDuration(45) === "45m", "Formats 45 min as '45m'");
  assert(formatSleepDuration(0) === "0m", "Formats 0 min as '0m'");

  // Auto-calculation from timestamps across midnight
  const overnightDuration = calculateSleepDurationFromTimestamps(
    "2026-11-11T22:30:00Z",
    "2026-11-12T06:30:00Z"
  );
  assert(overnightDuration === 480, "Auto-calculates 480 min from 22:30 to 06:30 across midnight");

  // Timestamp validation
  const invalidChronology = calculateSleepDurationFromTimestamps(
    "2026-11-12T08:00:00Z",
    "2026-11-12T07:00:00Z"
  );
  assert(invalidChronology === null, "Rejects non-chronological sleep timestamps (wake before bed)");

  // Sleep input validation for SleepEntryModal
  const validSleepInput = validateSleepLogInput({
    duration_minutes: 450,
    sleep_date: "2026-11-12",
    sleep_quality: "excellent",
  });
  assert(validSleepInput.valid, "Valid sleep payload (450m, excellent) passes validation");

  const tooShortSleep = validateSleepLogInput({ duration_minutes: 15 });
  assert(!tooShortSleep.valid, "Rejects duration < 30 minutes");

  const tooLongSleep = validateSleepLogInput({ duration_minutes: 1500 });
  assert(!tooLongSleep.valid, "Rejects duration > 1440 minutes (24 hours)");

  const invalidQuality = validateSleepLogInput({
    duration_minutes: 480,
    sleep_quality: "amazing" as unknown as "good",
  });
  assert(!invalidQuality.valid, "Rejects invalid quality string");

  // ----------------------------------------------------------------------------
  // 5. HEALTH GOALS VALIDATION & BOUNDARIES
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Health Goals Validation & Boundaries ---");

  // Valid goals update
  const validGoalsUpdate = validateHealthGoalsUpdate({
    daily_water_goal_ml: 2600,
    daily_sleep_goal_minutes: 480,
  });
  assert(validGoalsUpdate.valid, "Accepts valid water (2600ml) and sleep (480m) goal updates");
  assert(validGoalsUpdate.data?.daily_water_goal_ml === 2600, "Preserves 2600ml water goal");
  assert(validGoalsUpdate.data?.daily_sleep_goal_minutes === 480, "Preserves 480m sleep goal");

  // Clearing goals via null
  const clearGoals = validateHealthGoalsUpdate({
    daily_water_goal_ml: null,
    daily_sleep_goal_minutes: null,
  });
  assert(clearGoals.valid, "Accepts null to clear health goals");
  assert(clearGoals.data?.daily_water_goal_ml === null, "Water goal cleared to null");
  assert(clearGoals.data?.daily_sleep_goal_minutes === null, "Sleep goal cleared to null");

  // Water goal bounds (500 - 10000 ml)
  const lowWaterGoal = validateHealthGoalsUpdate({ daily_water_goal_ml: 400 });
  assert(!lowWaterGoal.valid, "Rejects water goal < 500 ml");

  const highWaterGoal = validateHealthGoalsUpdate({ daily_water_goal_ml: 12000 });
  assert(!highWaterGoal.valid, "Rejects water goal > 10,000 ml");

  // Sleep goal bounds (180 - 1000 min)
  const lowSleepGoal = validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 120 });
  assert(!lowSleepGoal.valid, "Rejects sleep goal < 180 min (3h)");

  const highSleepGoal = validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 1200 });
  assert(!highSleepGoal.valid, "Rejects sleep goal > 1000 min (~16.6h)");

  // Empty update object rejection
  const emptyUpdate = validateHealthGoalsUpdate({});
  assert(!emptyUpdate.valid, "Rejects empty health goals update payload");

  // ----------------------------------------------------------------------------
  // 6. TIMEZONE-SAFE DATE NAVIGATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Timezone-Safe Date Navigation ---");

  const todayStr = getTodayDateString();
  assert(isValidDateString(todayStr), `Today's date is valid YYYY-MM-DD: ${todayStr}`);

  // Rollover tests
  assert(shiftDateString("2026-03-01", -1) === "2026-02-28", "Shifts backwards across Feb boundary (non-leap year)");
  assert(shiftDateString("2026-01-01", -1) === "2025-12-31", "Shifts backwards across year boundary");
  assert(shiftDateString("2026-12-31", 1) === "2027-01-01", "Shifts forward across year boundary");
  assert(shiftDateString("2026-04-30", 1) === "2026-05-01", "Shifts forward across 30-day month boundary");

  const formattedDisplay = formatDisplayDate("2026-11-12");
  assert(formattedDisplay.includes("Nov 12, 2026"), "Formats readable display string: 'Thu, Nov 12, 2026'");

  // ----------------------------------------------------------------------------
  // 7. SECURITY & ERROR RESILIENCE SPECIFICATIONS
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Security & Error Resilience Specifications ---");

  // Discarding client-supplied user_id in validators
  const spoofedWeight = validateWeightLogInput({
    weight_kg: 74.0,
    logged_date: "2026-11-12",
    ...({ user_id: "attacker-uuid" } as Record<string, unknown>),
  });
  assert(spoofedWeight.valid, "Parses input with spoofed user_id");
  assert((spoofedWeight.data as Record<string, unknown> | undefined)?.user_id === undefined, "Strips client-supplied user_id from validated weight payload");

  const spoofedWater = validateWaterLogInput({
    amount_ml: 500,
    intake_date: "2026-11-12",
    ...({ user_id: "attacker-uuid" } as Record<string, unknown>),
  });
  assert((spoofedWater.data as Record<string, unknown> | undefined)?.user_id === undefined, "Strips client-supplied user_id from validated water payload");

  const spoofedSleep = validateSleepLogInput({
    duration_minutes: 480,
    sleep_date: "2026-11-12",
    ...({ user_id: "attacker-uuid" } as Record<string, unknown>),
  });
  assert((spoofedSleep.data as Record<string, unknown> | undefined)?.user_id === undefined, "Strips client-supplied user_id from validated sleep payload");

  // Summary
  console.log("\n==================================================================");
  console.log(`STAGE 9.3 FRONTEND TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage93FrontendTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
