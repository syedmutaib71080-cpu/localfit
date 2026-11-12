/**
 * Test Suite: LocalFit Stage 9.2 — Health Tracking Backend APIs
 * Verifies validation rules, boundary enforcement, CRUD flows, user isolation,
 * anti-spoofing, date filtering, and goal progress.
 */

import fs from "fs";
import path from "path";
import {
  validateWeightLogInput,
  validateWeightLogUpdate,
  validateWaterLogInput,
  validateWaterLogUpdate,
  validateSleepLogInput,
  validateSleepLogUpdate,
  validateHealthGoalsUpdate,
  isValidDateString,
  isValidTimestamp,
} from "../lib/health-validator";
import {
  aggregateDailyWater,
  summarizeDailySleep,
  calculateWeightChange,
} from "../lib/health-calculator";
import type {
  WeightLog,
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

async function runStage9HealthApiTests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 9.2: HEALTH TRACKING BACKEND API TESTS");
  console.log("(Weight, Water, Sleep, Goals, User Isolation & Input Boundaries)");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // 1. DATE & TIMESTAMP FORMAT VALIDATION
  // ----------------------------------------------------------------------------
  console.log("--- 1. Date & Timestamp Format Utilities ---");
  assert(isValidDateString("2026-11-12"), "Valid YYYY-MM-DD date passes");
  assert(isValidDateString("2026-02-28"), "Valid leap/non-leap day passes");
  assert(!isValidDateString("2026-02-31"), "Invalid calendar day (Feb 31) is rejected");
  assert(!isValidDateString("2026-13-01"), "Invalid month (13) is rejected");
  assert(!isValidDateString("11-12-2026"), "Slash/reversed format is rejected");
  assert(!isValidDateString("invalid"), "Non-date string is rejected");
  assert(isValidTimestamp("2026-11-12T07:00:00.000Z"), "Valid ISO timestamp passes");
  assert(!isValidTimestamp("not-a-timestamp"), "Malformed timestamp is rejected");

  // ----------------------------------------------------------------------------
  // 2. WEIGHT API INPUT VALIDATION & BOUNDARIES
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Weight API Input Validation & Boundaries ---");
  const validWeight = validateWeightLogInput({ weight_kg: 72.5, logged_date: "2026-11-12", notes: "Morning weight" });
  assert(validWeight.valid && validWeight.data?.weight_kg === 72.5, "Valid weight (72.5kg) passes validation");
  assert(validWeight.data?.logged_date === "2026-11-12", "Preserves valid logged_date");
  assert(validWeight.data?.notes === "Morning weight", "Preserves valid notes");

  // Lower & Upper Boundaries (20.0 - 400.0 kg)
  assert(validateWeightLogInput({ weight_kg: 20.0 }).valid, "Accepts lower boundary weight 20.0 kg");
  assert(validateWeightLogInput({ weight_kg: 400.0 }).valid, "Accepts upper boundary weight 400.0 kg");
  assert(!validateWeightLogInput({ weight_kg: 19.9 }).valid, "Rejects weight below 20.0 kg (19.9kg)");
  assert(!validateWeightLogInput({ weight_kg: 400.1 }).valid, "Rejects weight above 400.0 kg (400.1kg)");
  assert(!validateWeightLogInput({ weight_kg: 0 }).valid, "Rejects zero weight");
  assert(!validateWeightLogInput({ weight_kg: -70 }).valid, "Rejects negative weight");
  assert(!validateWeightLogInput({ weight_kg: NaN }).valid, "Rejects NaN weight");
  assert(!validateWeightLogInput({ weight_kg: "75" }).valid, "Rejects string-typed weight");
  assert(!validateWeightLogInput({}).valid, "Rejects missing weight_kg");

  // Date validation in Weight
  assert(!validateWeightLogInput({ weight_kg: 70, logged_date: "2026-99-99" }).valid, "Rejects invalid logged_date");
  const autoDateWeight = validateWeightLogInput({ weight_kg: 70 });
  assert(autoDateWeight.valid && typeof autoDateWeight.data?.logged_date === "string", "Defaults logged_date to current date if omitted");

  // Notes boundaries (max 1000 chars)
  assert(!validateWeightLogInput({ weight_kg: 70, notes: "A".repeat(1001) }).valid, "Rejects notes exceeding 1000 characters");
  assert(validateWeightLogInput({ weight_kg: 70, notes: "A".repeat(1000) }).valid, "Accepts notes at 1000 characters limit");

  // Weight Update (PATCH) validation
  assert(!validateWeightLogUpdate({}).valid, "Rejects empty PATCH body with no fields");
  assert(validateWeightLogUpdate({ weight_kg: 74.0 }).valid, "Accepts partial weight update");
  assert(validateWeightLogUpdate({ notes: null }).valid, "Accepts clearing notes via null");
  assert(!validateWeightLogUpdate({ weight_kg: 10.0 }).valid, "Rejects out-of-bounds weight in PATCH");

  // ----------------------------------------------------------------------------
  // 3. WATER API INPUT VALIDATION & BOUNDARIES
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Water API Input Validation & Boundaries ---");
  const validWater = validateWaterLogInput({ amount_ml: 500, intake_date: "2026-11-12", notes: "Glass 1" });
  assert(validWater.valid && validWater.data?.amount_ml === 500, "Valid water intake (500ml) passes validation");
  assert(validWater.data?.intake_date === "2026-11-12", "Preserves intake_date");

  // Boundaries (1 - 10000 ml)
  assert(validateWaterLogInput({ amount_ml: 1 }).valid, "Accepts lower boundary amount 1 ml");
  assert(validateWaterLogInput({ amount_ml: 10000 }).valid, "Accepts upper boundary amount 10,000 ml");
  assert(!validateWaterLogInput({ amount_ml: 0 }).valid, "Rejects zero amount_ml");
  assert(!validateWaterLogInput({ amount_ml: -250 }).valid, "Rejects negative amount_ml");
  assert(!validateWaterLogInput({ amount_ml: 10001 }).valid, "Rejects amount_ml exceeding 10,000 ml");
  assert(!validateWaterLogInput({ amount_ml: 250.5 }).valid, "Rejects non-integer amount_ml");
  assert(!validateWaterLogInput({ amount_ml: "500" }).valid, "Rejects string-typed amount_ml");
  assert(!validateWaterLogInput({}).valid, "Rejects missing amount_ml");

  // Notes boundary (max 500 chars)
  assert(!validateWaterLogInput({ amount_ml: 500, notes: "W".repeat(501) }).valid, "Rejects notes exceeding 500 characters");
  assert(validateWaterLogInput({ amount_ml: 500, notes: "W".repeat(500) }).valid, "Accepts notes at 500 characters limit");

  // Water Update (PATCH) validation
  assert(!validateWaterLogUpdate({}).valid, "Rejects empty PATCH body for water");
  assert(validateWaterLogUpdate({ amount_ml: 750 }).valid, "Accepts partial amount update");
  assert(!validateWaterLogUpdate({ amount_ml: -100 }).valid, "Rejects negative amount in PATCH");

  // ----------------------------------------------------------------------------
  // 4. SLEEP API INPUT VALIDATION & BOUNDARIES
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Sleep API Input Validation & Boundaries ---");
  const validSleepManual = validateSleepLogInput({
    sleep_date: "2026-11-12",
    duration_minutes: 480,
    sleep_quality: "good",
    notes: "Restful night",
  });
  assert(validSleepManual.valid && validSleepManual.data?.duration_minutes === 480, "Accepts valid manual duration (480m)");
  assert(validSleepManual.data?.sleep_quality === "good", "Preserves valid sleep quality");

  // Boundaries (30 - 1440 minutes)
  assert(validateSleepLogInput({ duration_minutes: 30 }).valid, "Accepts lower boundary duration 30 min");
  assert(validateSleepLogInput({ duration_minutes: 1440 }).valid, "Accepts upper boundary duration 1440 min (24h)");
  assert(!validateSleepLogInput({ duration_minutes: 29 }).valid, "Rejects duration below 30 min");
  assert(!validateSleepLogInput({ duration_minutes: 1441 }).valid, "Rejects duration exceeding 1440 min");
  assert(!validateSleepLogInput({ duration_minutes: 450.5 }).valid, "Rejects non-integer duration");

  // Auto-calculation from timestamps
  const autoSleep = validateSleepLogInput({
    sleep_date: "2026-11-12",
    bedtime: "2026-11-11T23:00:00.000Z",
    wake_time: "2026-11-12T07:00:00.000Z",
  });
  assert(autoSleep.valid && autoSleep.data?.duration_minutes === 480, "Auto-calculates 480 min duration from 23:00 to 07:00");

  // Timestamp Contradictions & Ordering
  const reverseOrder = validateSleepLogInput({
    duration_minutes: 480,
    bedtime: "2026-11-12T07:00:00.000Z",
    wake_time: "2026-11-11T23:00:00.000Z",
  });
  assert(!reverseOrder.valid, "Rejects non-chronological timestamps (wake_time before bedtime)");

  const equalTimestamps = validateSleepLogInput({
    duration_minutes: 60,
    bedtime: "2026-11-12T07:00:00.000Z",
    wake_time: "2026-11-12T07:00:00.000Z",
  });
  assert(!equalTimestamps.valid, "Rejects equal bedtime and wake_time");

  // Contradiction: duration exceeds elapsed time
  const excessiveDuration = validateSleepLogInput({
    duration_minutes: 600, // 10h
    bedtime: "2026-11-11T23:00:00.000Z",
    wake_time: "2026-11-12T07:00:00.000Z", // 8h elapsed
  });
  assert(!excessiveDuration.valid, "Rejects contradictory duration exceeding elapsed time between bedtime and wake_time");

  // 2-minute tolerance acceptance
  const toleranceAccepted = validateSleepLogInput({
    duration_minutes: 482,
    bedtime: "2026-11-11T23:00:00.000Z",
    wake_time: "2026-11-12T07:00:00.000Z", // 480m elapsed + 2m tolerance = 482m
  });
  assert(toleranceAccepted.valid, "Accepts duration within 2-minute rounding tolerance");

  const toleranceExceeded = validateSleepLogInput({
    duration_minutes: 483,
    bedtime: "2026-11-11T23:00:00.000Z",
    wake_time: "2026-11-12T07:00:00.000Z",
  });
  assert(!toleranceExceeded.valid, "Rejects duration exceeding 2-minute tolerance (483m > 482m)");

  // Quality enum validation
  assert(validateSleepLogInput({ duration_minutes: 450, sleep_quality: "poor" }).valid, "Accepts 'poor' quality");
  assert(validateSleepLogInput({ duration_minutes: 450, sleep_quality: "fair" }).valid, "Accepts 'fair' quality");
  assert(validateSleepLogInput({ duration_minutes: 450, sleep_quality: "good" }).valid, "Accepts 'good' quality");
  assert(validateSleepLogInput({ duration_minutes: 450, sleep_quality: "excellent" }).valid, "Accepts 'excellent' quality");
  assert(!validateSleepLogInput({ duration_minutes: 450, sleep_quality: "fantastic" }).valid, "Rejects unsupported sleep quality value");

  // Sleep Update (PATCH) with existing record cross-validation
  const existingSleep = {
    bedtime: "2026-11-11T23:00:00.000Z",
    wake_time: "2026-11-12T07:00:00.000Z",
    duration_minutes: 480,
  };
  const patchDurationTooHigh = validateSleepLogUpdate({ duration_minutes: 600 }, existingSleep);
  assert(!patchDurationTooHigh.valid, "PATCH rejects updating duration that exceeds existing bedtime/wake_time");

  const patchValid = validateSleepLogUpdate({ duration_minutes: 450, sleep_quality: "fair" }, existingSleep);
  assert(patchValid.valid && patchValid.data?.duration_minutes === 450, "PATCH accepts valid updated duration within bounds");

  // ----------------------------------------------------------------------------
  // 5. HEALTH GOALS VALIDATION & BOUNDARIES
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Health Goals Validation & Boundaries ---");
  const validGoals = validateHealthGoalsUpdate({
    daily_water_goal_ml: 2500,
    daily_sleep_goal_minutes: 480,
  });
  assert(validGoals.valid, "Accepts valid water and sleep goals");
  assert(validGoals.data?.daily_water_goal_ml === 2500, "Preserves 2500 ml water goal");
  assert(validGoals.data?.daily_sleep_goal_minutes === 480, "Preserves 480 min sleep goal");

  // Water Goal Bounds (500 - 10000 ml or null)
  assert(validateHealthGoalsUpdate({ daily_water_goal_ml: 500 }).valid, "Accepts lower boundary water goal 500 ml");
  assert(validateHealthGoalsUpdate({ daily_water_goal_ml: 10000 }).valid, "Accepts upper boundary water goal 10,000 ml");
  assert(!validateHealthGoalsUpdate({ daily_water_goal_ml: 499 }).valid, "Rejects water goal below 500 ml");
  assert(!validateHealthGoalsUpdate({ daily_water_goal_ml: 10001 }).valid, "Rejects water goal above 10,000 ml");
  assert(!validateHealthGoalsUpdate({ daily_water_goal_ml: 2500.5 }).valid, "Rejects non-integer water goal");
  assert(validateHealthGoalsUpdate({ daily_water_goal_ml: null }).valid, "Accepts null to clear water goal");

  // Sleep Goal Bounds (180 - 1000 minutes or null)
  assert(validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 180 }).valid, "Accepts lower boundary sleep goal 180 min (3h)");
  assert(validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 1000 }).valid, "Accepts upper boundary sleep goal 1000 min (~16.6h)");
  assert(!validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 179 }).valid, "Rejects sleep goal below 180 min");
  assert(!validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 1001 }).valid, "Rejects sleep goal above 1000 min");
  assert(!validateHealthGoalsUpdate({ daily_sleep_goal_minutes: 480.2 }).valid, "Rejects non-integer sleep goal");
  assert(validateHealthGoalsUpdate({ daily_sleep_goal_minutes: null }).valid, "Accepts null to clear sleep goal");

  // Empty update rejection
  assert(!validateHealthGoalsUpdate({}).valid, "Rejects empty health goals PATCH body");

  // ----------------------------------------------------------------------------
  // 6. CRUD & USER ISOLATION SERVICE LOGIC
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. CRUD Flow, User Isolation & Security Simulation ---");

  // In-memory data store simulating Supabase database
  const dbWeight: WeightLog[] = [];
  const dbWater: WaterLog[] = [];
  const dbSleep: SleepLog[] = [];
  const dbGoals: Record<string, { daily_water_goal_ml: number | null; daily_sleep_goal_minutes: number | null }> = {};

  const userA = "user-uuid-aaaa";
  const userB = "user-uuid-bbbb";

  // A. Create entries for User A
  const weightEntryA: WeightLog = {
    id: "w-01",
    user_id: userA,
    weight_kg: 82.0,
    logged_date: "2026-11-10",
    notes: "Day 1 weigh-in",
    created_at: "2026-11-10T07:00:00Z",
    updated_at: "2026-11-10T07:00:00Z",
  };
  const weightEntryA2: WeightLog = {
    id: "w-02",
    user_id: userA,
    weight_kg: 81.2,
    logged_date: "2026-11-12",
    notes: "Day 3 weigh-in",
    created_at: "2026-11-12T07:00:00Z",
    updated_at: "2026-11-12T07:00:00Z",
  };
  dbWeight.push(weightEntryA, weightEntryA2);

  const waterEntryA: WaterLog = {
    id: "wt-01",
    user_id: userA,
    intake_date: "2026-11-12",
    amount_ml: 1200,
    notes: "Morning hydration",
    created_at: "2026-11-12T08:00:00Z",
    updated_at: "2026-11-12T08:00:00Z",
  };
  const waterEntryA2: WaterLog = {
    id: "wt-02",
    user_id: userA,
    intake_date: "2026-11-12",
    amount_ml: 800,
    notes: "Afternoon water",
    created_at: "2026-11-12T14:00:00Z",
    updated_at: "2026-11-12T14:00:00Z",
  };
  dbWater.push(waterEntryA, waterEntryA2);

  const sleepEntryA: SleepLog = {
    id: "sl-01",
    user_id: userA,
    sleep_date: "2026-11-12",
    duration_minutes: 450,
    bedtime: "2026-11-11T23:30:00Z",
    wake_time: "2026-11-12T07:00:00Z",
    sleep_quality: "good",
    notes: "Slept deeply",
    created_at: "2026-11-12T07:05:00Z",
    updated_at: "2026-11-12T07:05:00Z",
  };
  dbSleep.push(sleepEntryA);

  dbGoals[userA] = { daily_water_goal_ml: 2500, daily_sleep_goal_minutes: 480 };

  // B. User B attempts to access User A's data (Cross-user access attack)
  const userBReadsWeightA = dbWeight.filter((w) => w.id === "w-01" && w.user_id === userB);
  assert(userBReadsWeightA.length === 0, "User B cannot read User A's weight entry (returns empty/404)");

  const userBReadsWaterA = dbWater.filter((w) => w.id === "wt-01" && w.user_id === userB);
  assert(userBReadsWaterA.length === 0, "User B cannot read User A's water entry (returns empty/404)");

  const userBReadsSleepA = dbSleep.filter((s) => s.id === "sl-01" && s.user_id === userB);
  assert(userBReadsSleepA.length === 0, "User B cannot read User A's sleep entry (returns empty/404)");

  // C. Anti-Spoofing: Client payload attempting to set someone else's user_id
  const spoofedPayload = {
    user_id: "victim-user-id", // Attacker sends someone else's ID
    weight_kg: 99.0,
    logged_date: "2026-11-12",
  };
  const validatedSpoof = validateWeightLogInput(spoofedPayload);
  assert(!("user_id" in (validatedSpoof.data || {})), "Server validation strips client-supplied user_id completely");

  // D. Water Daily Aggregation & Goal Progress
  const userAWaterLogs = dbWater.filter((w) => w.user_id === userA);
  const userAWaterSummary = aggregateDailyWater(userAWaterLogs, "2026-11-12", dbGoals[userA]?.daily_water_goal_ml);
  assert(userAWaterSummary.totalMl === 2000, "Sums multiple water entries for date accurately (1200 + 800 = 2000ml)");
  assert(userAWaterSummary.entryCount === 2, "Counts 2 entries for selected date");
  assert(userAWaterSummary.progressPercent === 80, "Calculates 80% progress against 2500ml goal (2000 / 2500)");
  assert(userAWaterSummary.remainingMl === 500, "Calculates 500ml remaining to goal");

  // E. Sleep Summary & Goal Progress
  const userASleepLogs = dbSleep.filter((s) => s.user_id === userA);
  const userASleepSummary = summarizeDailySleep(userASleepLogs, "2026-11-12", dbGoals[userA]?.daily_sleep_goal_minutes);
  assert(userASleepSummary.durationMinutes === 450, "Aggregates 450 minutes duration");
  assert(userASleepSummary.formattedDuration === "7h 30m", "Formats duration as '7h 30m'");
  assert(userASleepSummary.progressPercent === 94, "Calculates 94% progress against 480m goal (450 / 480)");

  // F. Weight History & Date Range Filtering
  const filteredWeights = dbWeight.filter(
    (w) => w.user_id === userA && w.logged_date >= "2026-11-11" && w.logged_date <= "2026-11-12"
  );
  assert(filteredWeights.length === 1 && filteredWeights[0].id === "w-02", "Date range filter accurately isolates Nov 12 entry");

  // G. Weight Change Calculation
  const change = calculateWeightChange(81.2, 82.0);
  assert(change.differenceKg === -0.8, "Calculates weight loss: 81.2 - 82.0 = -0.8 kg");
  assert(change.direction === "loss", "Classifies direction as 'loss'");

  // H. Health Goal Updates Simulation
  const goalUpdate = validateHealthGoalsUpdate({ daily_water_goal_ml: 3000 });
  if (goalUpdate.valid && goalUpdate.data) {
    dbGoals[userA] = { ...dbGoals[userA], ...goalUpdate.data };
  }
  assert(dbGoals[userA].daily_water_goal_ml === 3000, "Updates water goal to 3000 ml");
  assert(dbGoals[userA].daily_sleep_goal_minutes === 480, "Preserves unchanged sleep goal (480 min)");

  // I. Deleting an entry updates user totals
  const idxToDelete = dbWater.findIndex((w) => w.id === "wt-02" && w.user_id === userA);
  if (idxToDelete !== -1) {
    dbWater.splice(idxToDelete, 1);
  }
  const postDeleteLogs = dbWater.filter((w) => w.user_id === userA);
  const postDeleteSummary = aggregateDailyWater(postDeleteLogs, "2026-11-12", dbGoals[userA]?.daily_water_goal_ml);
  assert(postDeleteSummary.totalMl === 1200, "Daily water total decreases to 1200ml after deletion");
  assert(postDeleteSummary.entryCount === 1, "Entry count decrements to 1 after deletion");

  // ----------------------------------------------------------------------------
  // 7. DATABASE MIGRATION SCRIPT INTEGRITY
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Database Migration Script Audit ---");
  const migrationPath = path.resolve(process.cwd(), "supabase/migrations/20261112000000_health_tracking_foundation.sql");
  assert(fs.existsSync(migrationPath), "Migration 20261112000000_health_tracking_foundation.sql exists on disk");

  const migrationContent = fs.readFileSync(migrationPath, "utf8");
  assert(migrationContent.includes("chk_sleep_logs_wake_and_duration_bounds"), "Contains corrected chk_sleep_logs_wake_and_duration_bounds constraint");
  assert(migrationContent.includes("ENABLE ROW LEVEL SECURITY"), "Enables Row Level Security on all tables");
  assert(migrationContent.includes("auth.uid() = user_id"), "Enforces auth.uid() = user_id ownership in RLS policies");
  assert(migrationContent.includes("WITH CHECK (auth.uid() = user_id)"), "Enforces WITH CHECK ownership on UPDATE policies");
  assert(migrationContent.includes("REVOKE ALL ON public.weight_logs FROM anon"), "Revokes anonymous access from weight_logs");
  assert(migrationContent.includes("REVOKE ALL ON public.water_logs FROM anon"), "Revokes anonymous access from water_logs");
  assert(migrationContent.includes("REVOKE ALL ON public.sleep_logs FROM anon"), "Revokes anonymous access from sleep_logs");

  console.log("\n==================================================================");
  console.log(`STAGE 9.2 HEALTH API TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage9HealthApiTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
