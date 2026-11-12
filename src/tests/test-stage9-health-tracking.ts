/**
 * Test Suite: LocalFit Stage 9.1 — Health Tracking Foundation
 * Verifies pure domain calculations, boundary conditions, edge cases,
 * and strict handling of missing goals (no fabricated targets).
 */

import {
  calculateBmi,
  classifyBmi,
  getHealthyWeightRange,
  getBmiAnalysis,
  calculateWaterGoalProgress,
  aggregateDailyWater,
  calculateSleepDurationFromTimestamps,
  calculateSleepGoalProgress,
  formatSleepDuration,
  summarizeDailySleep,
  calculateWeightChange,
  calculateNetCalories,
} from "../lib/health-calculator";
import { calculateNetCalories as calculateNetCaloriesDashboard } from "../lib/dashboard-calculator";
import type { WaterLog, SleepLog } from "../types/health-tracking";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failedCount++;
  }
}

function assertStrictEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    console.log(`  [PASS] ${message} (${JSON.stringify(actual)})`);
    passedCount++;
  } else {
    console.error(
      `  [FAIL] ${message} - Expected: ${JSON.stringify(expected)}, Got: ${JSON.stringify(actual)}`
    );
    failedCount++;
  }
}

console.log("==================================================================");
console.log("RUNNING LOCALFIT STAGE 9.1: HEALTH TRACKING FOUNDATION TESTS");
console.log("(BMI, Water, Sleep, Weight Changes & Missing Goals Integrity)");
console.log("==================================================================\n");

// --- 1. BMI Calculation & Edge Cases ---
console.log("--- 1. BMI Calculation & Boundaries ---");
// 70kg, 175cm -> 70 / (1.75^2) = 22.857... -> 22.9
assertStrictEqual(calculateBmi(70, 175), 22.9, "Calculates standard BMI accurately");
// 100kg, 180cm -> 100 / (1.80^2) = 30.864... -> 30.9
assertStrictEqual(calculateBmi(100, 180), 30.9, "Calculates obese BMI accurately");
// 45kg, 160cm -> 45 / (1.60^2) = 17.578... -> 17.6
assertStrictEqual(calculateBmi(45, 160), 17.6, "Calculates underweight BMI accurately");

// Invalid inputs
assertStrictEqual(calculateBmi(0, 175), null, "Rejects zero weight");
assertStrictEqual(calculateBmi(70, 0), null, "Rejects zero height");
assertStrictEqual(calculateBmi(-70, 175), null, "Rejects negative weight");
assertStrictEqual(calculateBmi(70, -175), null, "Rejects negative height");
assertStrictEqual(calculateBmi(null, 175), null, "Rejects null weight");
assertStrictEqual(calculateBmi(70, null), null, "Rejects null height");
assertStrictEqual(calculateBmi(undefined, 175), null, "Rejects undefined weight");
assertStrictEqual(calculateBmi(70, undefined), null, "Rejects undefined height");
assertStrictEqual(calculateBmi(NaN, 175), null, "Rejects NaN weight");
assertStrictEqual(calculateBmi(70, NaN), null, "Rejects NaN height");
assertStrictEqual(calculateBmi(Infinity, 175), null, "Rejects Infinity weight");

// --- 2. Adult BMI WHO Classification ---
console.log("\n--- 2. Adult BMI Classification ---");
assertStrictEqual(classifyBmi(16.0), "Underweight", "Classifies severe underweight (<18.5)");
assertStrictEqual(classifyBmi(18.4), "Underweight", "Classifies borderline underweight");
assertStrictEqual(classifyBmi(18.5), "Normal weight", "Classifies lower bound of normal weight");
assertStrictEqual(classifyBmi(22.0), "Normal weight", "Classifies mid normal weight");
assertStrictEqual(classifyBmi(24.9), "Normal weight", "Classifies upper bound of normal weight");
assertStrictEqual(classifyBmi(25.0), "Overweight", "Classifies lower bound of overweight");
assertStrictEqual(classifyBmi(29.9), "Overweight", "Classifies upper bound of overweight");
assertStrictEqual(classifyBmi(30.0), "Obese Class I", "Classifies lower bound of Obese Class I");
assertStrictEqual(classifyBmi(34.9), "Obese Class I", "Classifies upper bound of Obese Class I");
assertStrictEqual(classifyBmi(35.0), "Obese Class II", "Classifies lower bound of Obese Class II");
assertStrictEqual(classifyBmi(39.9), "Obese Class II", "Classifies upper bound of Obese Class II");
assertStrictEqual(classifyBmi(40.0), "Obese Class III", "Classifies lower bound of Obese Class III");
assertStrictEqual(classifyBmi(50.0), "Obese Class III", "Classifies severe Obese Class III");

// Invalid inputs
assertStrictEqual(classifyBmi(null), null, "Returns null category for null BMI");
assertStrictEqual(classifyBmi(undefined), null, "Returns null category for undefined BMI");
assertStrictEqual(classifyBmi(0), null, "Returns null category for zero BMI");
assertStrictEqual(classifyBmi(-10), null, "Returns null category for negative BMI");
assertStrictEqual(classifyBmi(NaN), null, "Returns null category for NaN BMI");

// --- 3. Healthy Weight Range ---
console.log("\n--- 3. Healthy Weight Range ---");
const range175 = getHealthyWeightRange(175);
assert(range175 !== null, "Generates healthy range for 175cm");
if (range175) {
  // 18.5 * 1.75^2 = 56.656 -> 56.7kg; 24.9 * 1.75^2 = 76.256 -> 76.3kg
  assertStrictEqual(range175.min, 56.7, "Healthy min weight for 175cm is 56.7kg");
  assertStrictEqual(range175.max, 76.3, "Healthy max weight for 175cm is 76.3kg");
}
assertStrictEqual(getHealthyWeightRange(0), null, "Rejects 0cm height for healthy range");
assertStrictEqual(getHealthyWeightRange(-150), null, "Rejects negative height for healthy range");
assertStrictEqual(getHealthyWeightRange(null), null, "Rejects null height for healthy range");

// --- 4. Comprehensive BMI Analysis ---
console.log("\n--- 4. Comprehensive BMI Analysis ---");
const analysisNormal = getBmiAnalysis(70, 175);
assertStrictEqual(analysisNormal.bmi, 22.9, "Analysis reports 22.9 BMI");
assertStrictEqual(analysisNormal.category, "Normal weight", "Analysis reports Normal weight");
assertStrictEqual(analysisNormal.isHealthy, true, "Normal weight is marked isHealthy=true");
assert(analysisNormal.healthyWeightRangeKg !== null, "Healthy range is populated");

const analysisOver = getBmiAnalysis(95, 175);
assertStrictEqual(analysisOver.bmi, 31.0, "Analysis reports 31.0 BMI");
assertStrictEqual(analysisOver.category, "Obese Class I", "Analysis reports Obese Class I");
assertStrictEqual(analysisOver.isHealthy, false, "Obese is marked isHealthy=false");

const analysisInvalid = getBmiAnalysis(null, 175);
assertStrictEqual(analysisInvalid.bmi, null, "BMI is null on missing weight");
assertStrictEqual(analysisInvalid.category, null, "Category is null on missing weight");
assertStrictEqual(analysisInvalid.isHealthy, false, "isHealthy is false on missing weight");

// --- 5. Daily Water Intake Aggregation & Goal Progress ---
console.log("\n--- 5. Daily Water Intake Aggregation & Goals ---");
const mockWaterLogs: WaterLog[] = [
  {
    id: "w1",
    user_id: "user-1",
    intake_date: "2026-11-12",
    amount_ml: 500,
    notes: "Morning glass",
    created_at: "2026-11-12T07:00:00Z",
    updated_at: "2026-11-12T07:00:00Z",
  },
  {
    id: "w2",
    user_id: "user-1",
    intake_date: "2026-11-12",
    amount_ml: 750,
    notes: "Post-workout bottle",
    created_at: "2026-11-12T10:30:00Z",
    updated_at: "2026-11-12T10:30:00Z",
  },
  {
    id: "w3",
    user_id: "user-1",
    intake_date: "2026-11-12",
    amount_ml: 350,
    notes: "Lunch water",
    created_at: "2026-11-12T13:00:00Z",
    updated_at: "2026-11-12T13:00:00Z",
  },
  {
    id: "w4",
    user_id: "user-1",
    intake_date: "2026-11-11", // Yesterday
    amount_ml: 2000,
    notes: "Yesterday total",
    created_at: "2026-11-11T12:00:00Z",
    updated_at: "2026-11-11T12:00:00Z",
  },
];

// Aggregation with configured goal (2500 ml)
const waterSummary = aggregateDailyWater(mockWaterLogs, "2026-11-12", 2500);
// 500 + 750 + 350 = 1600 ml
assertStrictEqual(waterSummary.totalMl, 1600, "Sums multiple water logs for date (1600 ml)");
assertStrictEqual(waterSummary.entryCount, 3, "Counts 3 entries for selected date");
assertStrictEqual(waterSummary.goalMl, 2500, "Goal is preserved as 2500 ml");
// 1600 / 2500 = 64%
assertStrictEqual(waterSummary.progressPercent, 64, "Calculates 64% progress against water goal");
assertStrictEqual(waterSummary.remainingMl, 900, "Calculates 900 ml remaining to goal");

// Aggregation with NO configured goal (null profile goal) - MUST NOT FABRICATE
const waterSummaryNoGoal = aggregateDailyWater(mockWaterLogs, "2026-11-12", null);
assertStrictEqual(waterSummaryNoGoal.totalMl, 1600, "Sums intake correctly even without goal");
assertStrictEqual(waterSummaryNoGoal.goalMl, null, "Goal is strictly null without fabrication");
assertStrictEqual(waterSummaryNoGoal.progressPercent, null, "Progress is strictly null without fabrication");
assertStrictEqual(waterSummaryNoGoal.remainingMl, null, "Remaining is strictly null without fabrication");

// Zero-intake day
const emptyWater = aggregateDailyWater([], "2026-11-12", 2000);
assertStrictEqual(emptyWater.totalMl, 0, "Empty water logs yield 0 ml (no NaN)");
assertStrictEqual(emptyWater.entryCount, 0, "Empty entry count is 0");
assertStrictEqual(emptyWater.progressPercent, 0, "Empty progress is 0%");
assertStrictEqual(emptyWater.remainingMl, 2000, "Remaining equals full goal on empty day");

// Progress cap when intake exceeds goal
const excessProgress = calculateWaterGoalProgress(3200, 2500);
assertStrictEqual(excessProgress, 100, "Caps progress percentage at 100% when goal is exceeded");

// Progress calculation invalid goals
assertStrictEqual(calculateWaterGoalProgress(1500, null), null, "Rejects null goal");
assertStrictEqual(calculateWaterGoalProgress(1500, undefined), null, "Rejects undefined goal");
assertStrictEqual(calculateWaterGoalProgress(1500, 0), null, "Rejects 0 goal");
assertStrictEqual(calculateWaterGoalProgress(1500, -500), null, "Rejects negative goal");

// --- 6. Sleep Duration & Goal Calculation ---
console.log("\n--- 6. Sleep Duration & Goal Calculation ---");
// Same-day nap: 13:00 to 14:30 (90 min)
const sameDayDuration = calculateSleepDurationFromTimestamps(
  "2026-11-12T13:00:00Z",
  "2026-11-12T14:30:00Z"
);
assertStrictEqual(sameDayDuration, 90, "Calculates same-day sleep duration (90 min)");

// Overnight sleep across midnight: 23:00 (Nov 11) to 07:00 (Nov 12) (8 hours = 480 min)
const overnightDuration = calculateSleepDurationFromTimestamps(
  "2026-11-11T23:00:00Z",
  "2026-11-12T07:00:00Z"
);
assertStrictEqual(overnightDuration, 480, "Calculates overnight sleep across midnight (480 min / 8h)");

// Overnight sleep starting late: 01:15 to 08:45 (7 hours 30 min = 450 min)
const lateNightDuration = calculateSleepDurationFromTimestamps(
  "2026-11-12T01:15:00Z",
  "2026-11-12T08:45:00Z"
);
assertStrictEqual(lateNightDuration, 450, "Calculates late-night sleep (450 min)");

// Contradictory records: wake_time <= bedtime
assertStrictEqual(
  calculateSleepDurationFromTimestamps("2026-11-12T08:00:00Z", "2026-11-12T07:00:00Z"),
  null,
  "Rejects contradictory timestamp where wake is before bedtime"
);
assertStrictEqual(
  calculateSleepDurationFromTimestamps("2026-11-12T08:00:00Z", "2026-11-12T08:00:00Z"),
  null,
  "Rejects equal bedtime and wake_time"
);

// Invalid inputs
assertStrictEqual(calculateSleepDurationFromTimestamps(null, "2026-11-12T07:00:00Z"), null, "Rejects null bedtime");
assertStrictEqual(calculateSleepDurationFromTimestamps("2026-11-12T07:00:00Z", null), null, "Rejects null wake_time");
assertStrictEqual(calculateSleepDurationFromTimestamps("invalid-date", "2026-11-12T07:00:00Z"), null, "Rejects invalid date");

// Sleep formatting
assertStrictEqual(formatSleepDuration(480), "8h 0m", "Formats 480 min as '8h 0m'");
assertStrictEqual(formatSleepDuration(450), "7h 30m", "Formats 450 min as '7h 30m'");
assertStrictEqual(formatSleepDuration(45), "45m", "Formats 45 min as '45m'");
assertStrictEqual(formatSleepDuration(0), "0m", "Formats 0 min as '0m'");

// Sleep goal progress
assertStrictEqual(calculateSleepGoalProgress(450, 480), 94, "Calculates 94% sleep progress (450/480 min)");
assertStrictEqual(calculateSleepGoalProgress(480, null), null, "Sleep progress is null when goal is null");
assertStrictEqual(calculateSleepGoalProgress(480, undefined), null, "Sleep progress is null when goal is undefined");

// Daily sleep summary
const mockSleepLogs: SleepLog[] = [
  {
    id: "s1",
    user_id: "user-1",
    sleep_date: "2026-11-12",
    duration_minutes: 450,
    bedtime: "2026-11-11T23:30:00Z",
    wake_time: "2026-11-12T07:00:00Z",
    sleep_quality: "good",
    notes: "Woke up refreshed",
    created_at: "2026-11-12T07:05:00Z",
    updated_at: "2026-11-12T07:05:00Z",
  },
];

const sleepSummary = summarizeDailySleep(mockSleepLogs, "2026-11-12", 480);
assertStrictEqual(sleepSummary.durationMinutes, 450, "Daily sleep duration is 450 min");
assertStrictEqual(sleepSummary.formattedDuration, "7h 30m", "Formatted duration is '7h 30m'");
assertStrictEqual(sleepSummary.quality, "good", "Sleep quality is 'good'");
assertStrictEqual(sleepSummary.progressPercent, 94, "Sleep progress is 94%");

const sleepSummaryNoGoal = summarizeDailySleep(mockSleepLogs, "2026-11-12", null);
assertStrictEqual(sleepSummaryNoGoal.goalMinutes, null, "Sleep goal is strictly null when unconfigured");
assertStrictEqual(sleepSummaryNoGoal.progressPercent, null, "Sleep progress is strictly null when unconfigured");

// --- 7. Weight Change Calculations ---
console.log("\n--- 7. Weight Change Calculations ---");
const weightLoss = calculateWeightChange(78.5, 80.0);
assertStrictEqual(weightLoss.differenceKg, -1.5, "Detects weight loss (-1.5 kg)");
assertStrictEqual(weightLoss.direction, "loss", "Classifies direction as 'loss'");

const weightGain = calculateWeightChange(81.2, 80.0);
assertStrictEqual(weightGain.differenceKg, 1.2, "Detects weight gain (+1.2 kg)");
assertStrictEqual(weightGain.direction, "gain", "Classifies direction as 'gain'");

const weightNeutral = calculateWeightChange(80.0, 80.0);
assertStrictEqual(weightNeutral.differenceKg, 0.0, "Detects zero change (0.0 kg)");
assertStrictEqual(weightNeutral.direction, "neutral", "Classifies direction as 'neutral'");

// --- 8. Calorie Balance Re-export Integrity ---
console.log("\n--- 8. Calorie Balance Re-export Integrity ---");
const net1 = calculateNetCalories(2200, 500);
const net2 = calculateNetCaloriesDashboard(2200, 500);
assertStrictEqual(net1, 1700, "Re-exported calculateNetCalories calculates 2200 - 500 = 1700 kcal");
assertStrictEqual(net1, net2, "Re-exported function matches dashboard-calculator exactly");

console.log("\n==================================================================");
console.log(`STAGE 9.1 HEALTH TRACKING TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("==================================================================");

if (failedCount > 0) {
  process.exit(1);
}
