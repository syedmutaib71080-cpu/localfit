/**
 * LocalFit — Stage 9.2 Live Supabase Integration Test Harness
 * Tests live database CRUD operations, RLS enforcement, cross-user isolation,
 * and guaranteed cleanup for Weight, Water, Sleep, and Health Goals.
 *
 * Safety Rules:
 * - Uses Supabase anon key with separate User A and User B credentials.
 * - Never logs or exposes passwords, tokens, or credentials.
 * - Guaranteed cleanup in finally block for all created records and original goals.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// 1. Safe Environment Variable Loader
function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1].trim();
        let val = (match[2] || "").trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

loadEnv();

interface TestRecord {
  category: "Auth" | "Weight" | "Water" | "Sleep" | "Goals" | "Cross-User RLS" | "Cleanup";
  testName: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL";
  details?: string;
}

const testResults: TestRecord[] = [];

function record(r: TestRecord) {
  testResults.push(r);
  const mark = r.status === "PASS" ? "[PASS]" : "[FAIL]";
  console.log(`  ${mark} [${r.category}] ${r.testName}`);
  console.log(`         Expected: ${r.expected}`);
  console.log(`         Actual:   ${r.actual}`);
  if (r.details) {
    console.log(`         Details:  ${r.details}`);
  }
  console.log("");
}

// Track every record created for guaranteed cleanup and audit verification
const createdWeightIds: string[] = [];
const createdWaterIds: string[] = [];
const createdSleepIds: string[] = [];
const allCreatedWeightIds: string[] = [];
const allCreatedWaterIds: string[] = [];
const allCreatedSleepIds: string[] = [];

async function runStage9HealthLiveIntegration() {
  console.log("==================================================================");
  console.log("LOCALFIT STAGE 9.2: LIVE SUPABASE INTEGRATION TEST SUITE");
  console.log("Executing against live database with Test User A and Test User B");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // 1. SAFETY & CREDENTIAL VERIFICATION
  // ----------------------------------------------------------------------------
  console.log("--- 1. Safety Pre-flight & Credential Verification ---");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const userAEmail = process.env.TEST_USER_A_EMAIL;
  const userAPassword = process.env.TEST_USER_A_PASSWORD;
  const userBEmail = process.env.TEST_USER_B_EMAIL;
  const userBPassword = process.env.TEST_USER_B_PASSWORD;

  const hasUrl = Boolean(supabaseUrl && supabaseUrl.startsWith("https://"));
  const hasKey = Boolean(supabaseAnonKey && supabaseAnonKey.length > 20);
  const hasUserAEmail = Boolean(userAEmail && userAEmail.includes("@"));
  const hasUserAPass = Boolean(userAPassword && userAPassword.length > 0);
  const hasUserBEmail = Boolean(userBEmail && userBEmail.includes("@"));
  const hasUserBPass = Boolean(userBPassword && userBPassword.length > 0);

  console.log(`  NEXT_PUBLIC_SUPABASE_URL:    ${hasUrl ? "[CONFIGURED]" : "[MISSING]"}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${hasKey ? "[CONFIGURED]" : "[MISSING]"}`);
  console.log(`  TEST_USER_A_EMAIL:           ${hasUserAEmail ? "[CONFIGURED]" : "[MISSING]"}`);
  console.log(`  TEST_USER_A_PASSWORD:        ${hasUserAPass ? "[CONFIGURED]" : "[MISSING]"}`);
  console.log(`  TEST_USER_B_EMAIL:           ${hasUserBEmail ? "[CONFIGURED]" : "[MISSING]"}`);
  console.log(`  TEST_USER_B_PASSWORD:        ${hasUserBPass ? "[CONFIGURED]" : "[MISSING]"}`);

  if (!hasUrl || !hasKey || !hasUserAEmail || !hasUserAPass || !hasUserBEmail || !hasUserBPass) {
    console.error("\nFATAL: One or more required environment variables are missing in .env.local.");
    console.error("Halting test execution immediately per safety requirements.");
    process.exit(1);
  }

  record({
    category: "Auth",
    testName: "Safety Pre-flight: Required credentials configured without exposure",
    expected: "All 6 required variables present in .env.local",
    actual: "All 6 required variables verified",
    status: "PASS",
  });

  // Create isolated clients using anon key only (no service-role key)
  const clientA = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const clientB = createClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Authenticate User A
  const { data: authA, error: authErrA } = await clientA.auth.signInWithPassword({
    email: userAEmail!,
    password: userAPassword!,
  });

  if (authErrA || !authA.user) {
    console.error(`\nFATAL: User A authentication failed: ${authErrA?.message}`);
    process.exit(1);
  }

  record({
    category: "Auth",
    testName: "Authenticate Test User A",
    expected: "HTTP 200 with authenticated session",
    actual: `Authenticated User A (UUID: ${authA.user.id.slice(0, 8)}...)`,
    status: "PASS",
  });

  // Authenticate User B
  const { data: authB, error: authErrB } = await clientB.auth.signInWithPassword({
    email: userBEmail!,
    password: userBPassword!,
  });

  if (authErrB || !authB.user) {
    console.error(`\nFATAL: User B authentication failed: ${authErrB?.message}`);
    process.exit(1);
  }

  record({
    category: "Auth",
    testName: "Authenticate Test User B",
    expected: "HTTP 200 with authenticated session",
    actual: `Authenticated User B (UUID: ${authB.user.id.slice(0, 8)}...)`,
    status: "PASS",
  });

  // Verify User A and User B are separate accounts
  if (authA.user.id === authB.user.id) {
    console.error("\nFATAL: Test User A and Test User B have identical UUIDs! Two distinct accounts required.");
    process.exit(1);
  }

  record({
    category: "Auth",
    testName: "Verify User A and User B are distinct identities",
    expected: "Distinct user UUIDs",
    actual: `User A (${authA.user.id.slice(0, 8)}...) !== User B (${authB.user.id.slice(0, 8)}...)`,
    status: "PASS",
  });

  // Save original User A profile goals for guaranteed restoration
  let originalWaterGoal: number | null = null;
  let originalSleepGoal: number | null = null;
  let originalGoalsLoaded = false;

  try {
    const { data: origProfile, error: profileErr } = await clientA
      .from("profiles")
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .eq("id", authA.user.id)
      .maybeSingle();

    if (!profileErr && origProfile) {
      originalWaterGoal = origProfile.daily_water_goal_ml ?? null;
      originalSleepGoal = origProfile.daily_sleep_goal_minutes ?? null;
      originalGoalsLoaded = true;
    }
  } catch {
    // Continue
  }

  let activeWeightId: string | null = null;
  let activeWaterId: string | null = null;
  let activeSleepId: string | null = null;

  try {
    // ----------------------------------------------------------------------------
    // 2. WEIGHT TRACKING LIVE CRUD (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 2. Weight Tracking Live CRUD (User A) ---");
    const testDate = "2026-11-12";

    // Create Weight Record
    const { data: createdWeight, error: createWeightErr } = await clientA
      .from("weight_logs")
      .insert({
        user_id: authA.user.id,
        weight_kg: 74.5,
        logged_date: testDate,
        notes: "Live integration test weigh-in",
      })
      .select("*")
      .single();

    const weightCreated = !createWeightErr && createdWeight && createdWeight.id;
    if (weightCreated) {
      activeWeightId = createdWeight.id;
      createdWeightIds.push(createdWeight.id);
      allCreatedWeightIds.push(createdWeight.id);
    }

    record({
      category: "Weight",
      testName: "Create weight record for User A",
      expected: "HTTP 201 / inserted record with weight_kg=74.5",
      actual: weightCreated
        ? `Created record ID ${createdWeight.id} with weight_kg=${createdWeight.weight_kg}`
        : `Failed: ${createWeightErr?.message}`,
      status: weightCreated && createdWeight.weight_kg === 74.5 ? "PASS" : "FAIL",
      details: weightCreated ? `Notes: "${createdWeight.notes}"` : undefined,
    });

    // Retrieve Weight Record
    const { data: retrievedWeight, error: getWeightErr } = await clientA
      .from("weight_logs")
      .select("*")
      .eq("id", activeWeightId!)
      .eq("user_id", authA.user.id)
      .single();

    const weightRetrieved = !getWeightErr && retrievedWeight;
    record({
      category: "Weight",
      testName: "Retrieve User A's weight record",
      expected: "Record retrieved with matching ID and weight_kg=74.5",
      actual: weightRetrieved
        ? `Retrieved record ID ${retrievedWeight.id} (weight_kg=${retrievedWeight.weight_kg}, date=${retrievedWeight.logged_date})`
        : `Failed: ${getWeightErr?.message}`,
      status: weightRetrieved && retrievedWeight.weight_kg === 74.5 ? "PASS" : "FAIL",
    });

    // Update Weight Record
    const { data: updatedWeight, error: updateWeightErr } = await clientA
      .from("weight_logs")
      .update({
        weight_kg: 75.0,
        notes: "Updated post-workout weigh-in",
      })
      .eq("id", activeWeightId!)
      .eq("user_id", authA.user.id)
      .select("*")
      .single();

    const weightUpdated = !updateWeightErr && updatedWeight;
    record({
      category: "Weight",
      testName: "Update User A's weight record",
      expected: "weight_kg updated to 75.0",
      actual: weightUpdated
        ? `Updated weight_kg to ${updatedWeight.weight_kg} (notes: "${updatedWeight.notes}")`
        : `Failed: ${updateWeightErr?.message}`,
      status: weightUpdated && updatedWeight.weight_kg === 75.0 ? "PASS" : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 3. WATER TRACKING LIVE CRUD & TOTALS (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 3. Water Tracking Live CRUD & Daily Totals (User A) ---");

    // Create Water Record
    const { data: createdWater, error: createWaterErr } = await clientA
      .from("water_logs")
      .insert({
        user_id: authA.user.id,
        intake_date: testDate,
        amount_ml: 650,
        notes: "Morning hydration bottle",
      })
      .select("*")
      .single();

    const waterCreated = !createWaterErr && createdWater && createdWater.id;
    if (waterCreated) {
      activeWaterId = createdWater.id;
      createdWaterIds.push(createdWater.id);
      allCreatedWaterIds.push(createdWater.id);
    }

    record({
      category: "Water",
      testName: "Create water intake record for User A",
      expected: "Inserted record with amount_ml=650",
      actual: waterCreated
        ? `Created record ID ${createdWater.id} with amount_ml=${createdWater.amount_ml}`
        : `Failed: ${createWaterErr?.message}`,
      status: waterCreated && createdWater.amount_ml === 650 ? "PASS" : "FAIL",
    });

    // Retrieve and verify daily total
    const { data: allWaterForDate, error: getWaterErr } = await clientA
      .from("water_logs")
      .select("*")
      .eq("user_id", authA.user.id)
      .eq("intake_date", testDate);

    const waterRetrieved = !getWaterErr && Array.isArray(allWaterForDate);
    const dayTotalWater = waterRetrieved
      ? allWaterForDate.reduce((sum, item) => sum + (item.amount_ml || 0), 0)
      : 0;

    record({
      category: "Water",
      testName: "Retrieve water logs and verify daily total intake",
      expected: "Daily total >= 650 ml",
      actual: waterRetrieved
        ? `Found ${allWaterForDate.length} entries for ${testDate}, daily total: ${dayTotalWater} ml`
        : `Failed: ${getWaterErr?.message}`,
      status: waterRetrieved && dayTotalWater >= 650 ? "PASS" : "FAIL",
    });

    // Update Water Record
    const { data: updatedWater, error: updateWaterErr } = await clientA
      .from("water_logs")
      .update({
        amount_ml: 800,
        notes: "Corrected to 800ml bottle",
      })
      .eq("id", activeWaterId!)
      .eq("user_id", authA.user.id)
      .select("*")
      .single();

    const waterUpdated = !updateWaterErr && updatedWater;
    record({
      category: "Water",
      testName: "Update User A's water record",
      expected: "amount_ml updated to 800",
      actual: waterUpdated
        ? `Updated amount_ml to ${updatedWater.amount_ml}`
        : `Failed: ${updateWaterErr?.message}`,
      status: waterUpdated && updatedWater.amount_ml === 800 ? "PASS" : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 4. SLEEP TRACKING LIVE CRUD (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 4. Sleep Tracking Live CRUD (User A) ---");

    const validBedtime = "2026-11-11T23:00:00.000Z";
    const validWakeTime = "2026-11-12T07:00:00.000Z"; // 480 min elapsed
    const sleepDuration = 480;

    // Create Sleep Record
    const { data: createdSleep, error: createSleepErr } = await clientA
      .from("sleep_logs")
      .insert({
        user_id: authA.user.id,
        sleep_date: testDate,
        duration_minutes: sleepDuration,
        bedtime: validBedtime,
        wake_time: validWakeTime,
        sleep_quality: "good",
        notes: "Full 8h restorative sleep",
      })
      .select("*")
      .single();

    const sleepCreated = !createSleepErr && createdSleep && createdSleep.id;
    if (sleepCreated) {
      activeSleepId = createdSleep.id;
      createdSleepIds.push(createdSleep.id);
      allCreatedSleepIds.push(createdSleep.id);
    }

    record({
      category: "Sleep",
      testName: "Create sleep record with valid bedtime, wake time, and duration",
      expected: "Inserted record with duration_minutes=480, quality='good'",
      actual: sleepCreated
        ? `Created record ID ${createdSleep.id} with duration_minutes=${createdSleep.duration_minutes}, quality=${createdSleep.sleep_quality}`
        : `Failed: ${createSleepErr?.message}`,
      status: sleepCreated && createdSleep.duration_minutes === 480 ? "PASS" : "FAIL",
    });

    // Retrieve Sleep Record
    const { data: retrievedSleep, error: getSleepErr } = await clientA
      .from("sleep_logs")
      .select("*")
      .eq("id", activeSleepId!)
      .eq("user_id", authA.user.id)
      .single();

    const sleepRetrieved = !getSleepErr && retrievedSleep;
    record({
      category: "Sleep",
      testName: "Retrieve User A's sleep record",
      expected: "Matching duration_minutes=480 and timestamps",
      actual: sleepRetrieved
        ? `Retrieved sleep duration: ${retrievedSleep.duration_minutes} min (bedtime: ${retrievedSleep.bedtime}, wake: ${retrievedSleep.wake_time})`
        : `Failed: ${getSleepErr?.message}`,
      status: sleepRetrieved && retrievedSleep.duration_minutes === 480 ? "PASS" : "FAIL",
    });

    // Update Sleep Record
    const { data: updatedSleep, error: updateSleepErr } = await clientA
      .from("sleep_logs")
      .update({
        duration_minutes: 450,
        sleep_quality: "fair",
        notes: "Awoke early, 7.5 hours actual sleep",
      })
      .eq("id", activeSleepId!)
      .eq("user_id", authA.user.id)
      .select("*")
      .single();

    const sleepUpdated = !updateSleepErr && updatedSleep;
    record({
      category: "Sleep",
      testName: "Update User A's sleep record",
      expected: "duration_minutes updated to 450, quality to 'fair'",
      actual: sleepUpdated
        ? `Updated duration_minutes=${updatedSleep.duration_minutes}, quality='${updatedSleep.sleep_quality}'`
        : `Failed: ${updateSleepErr?.message}`,
      status: sleepUpdated && updatedSleep.duration_minutes === 450 ? "PASS" : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 5. CROSS-USER SECURITY & RLS ENFORCEMENT (USER B vs USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 5. Cross-User Security & RLS Enforcement ---");

    // 5.1 User B attempts to read User A's weight record
    const { data: bReadWeight, error: bReadWeightErr } = await clientB
      .from("weight_logs")
      .select("*")
      .eq("id", activeWeightId!);

    const bReadWeightBlocked = !bReadWeightErr && Array.isArray(bReadWeight) && bReadWeight.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot read User A's weight record",
      expected: "Empty result array (0 rows) enforced by RLS",
      actual: bReadWeightBlocked
        ? "0 rows returned to User B"
        : `Security breach! Returned ${bReadWeight?.length} rows`,
      status: bReadWeightBlocked ? "PASS" : "FAIL",
    });

    // 5.2 User B attempts to update User A's weight record
    const { data: bUpdateWeight, error: bUpdateWeightErr } = await clientB
      .from("weight_logs")
      .update({ weight_kg: 99.9 })
      .eq("id", activeWeightId!)
      .select("*");

    const bUpdateWeightBlocked =
      !bUpdateWeightErr && Array.isArray(bUpdateWeight) && bUpdateWeight.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot modify User A's weight record",
      expected: "0 rows modified enforced by RLS",
      actual: bUpdateWeightBlocked
        ? "0 rows updated by User B"
        : `Security breach! Updated ${bUpdateWeight?.length} rows`,
      status: bUpdateWeightBlocked ? "PASS" : "FAIL",
    });

    // 5.3 User B attempts to delete User A's weight record
    const { data: bDeleteWeight, error: bDeleteWeightErr } = await clientB
      .from("weight_logs")
      .delete()
      .eq("id", activeWeightId!)
      .select("*");

    const bDeleteWeightBlocked =
      !bDeleteWeightErr && Array.isArray(bDeleteWeight) && bDeleteWeight.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot delete User A's weight record",
      expected: "0 rows deleted enforced by RLS",
      actual: bDeleteWeightBlocked
        ? "0 rows deleted by User B"
        : `Security breach! Deleted ${bDeleteWeight?.length} rows`,
      status: bDeleteWeightBlocked ? "PASS" : "FAIL",
    });

    // Verify User A's weight record is unchanged after User B's attack
    const { data: aVerifyWeight } = await clientA
      .from("weight_logs")
      .select("weight_kg")
      .eq("id", activeWeightId!)
      .single();

    record({
      category: "Cross-User RLS",
      testName: "Verify User A's weight record remained intact and unmanipulated",
      expected: "weight_kg=75.0 intact",
      actual: `weight_kg=${aVerifyWeight?.weight_kg}`,
      status: aVerifyWeight?.weight_kg === 75.0 ? "PASS" : "FAIL",
    });

    // 5.4 User B attempts to read User A's water record
    const { data: bReadWater, error: bReadWaterErr } = await clientB
      .from("water_logs")
      .select("*")
      .eq("id", activeWaterId!);

    const bReadWaterBlocked = !bReadWaterErr && Array.isArray(bReadWater) && bReadWater.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot read User A's water record",
      expected: "Empty result array (0 rows) enforced by RLS",
      actual: bReadWaterBlocked
        ? "0 rows returned to User B"
        : `Security breach! Returned ${bReadWater?.length} rows`,
      status: bReadWaterBlocked ? "PASS" : "FAIL",
    });

    // 5.5 User B attempts to modify User A's water record
    const { data: bUpdateWater, error: bUpdateWaterErr } = await clientB
      .from("water_logs")
      .update({ amount_ml: 9999 })
      .eq("id", activeWaterId!)
      .select("*");

    const bUpdateWaterBlocked =
      !bUpdateWaterErr && Array.isArray(bUpdateWater) && bUpdateWater.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot modify User A's water record",
      expected: "0 rows modified enforced by RLS",
      actual: bUpdateWaterBlocked
        ? "0 rows updated by User B"
        : `Security breach! Updated ${bUpdateWater?.length} rows`,
      status: bUpdateWaterBlocked ? "PASS" : "FAIL",
    });

    // 5.6 User B attempts to delete User A's water record
    const { data: bDeleteWater, error: bDeleteWaterErr } = await clientB
      .from("water_logs")
      .delete()
      .eq("id", activeWaterId!)
      .select("*");

    const bDeleteWaterBlocked =
      !bDeleteWaterErr && Array.isArray(bDeleteWater) && bDeleteWater.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot delete User A's water record",
      expected: "0 rows deleted enforced by RLS",
      actual: bDeleteWaterBlocked
        ? "0 rows deleted by User B"
        : `Security breach! Deleted ${bDeleteWater?.length} rows`,
      status: bDeleteWaterBlocked ? "PASS" : "FAIL",
    });

    // Verify User A's water record is unchanged after User B's attack
    const { data: aVerifyWater } = await clientA
      .from("water_logs")
      .select("amount_ml")
      .eq("id", activeWaterId!)
      .single();

    record({
      category: "Cross-User RLS",
      testName: "Verify User A's water record remained intact and unmanipulated",
      expected: "amount_ml=800 intact",
      actual: `amount_ml=${aVerifyWater?.amount_ml}`,
      status: aVerifyWater?.amount_ml === 800 ? "PASS" : "FAIL",
    });

    // 5.7 User B attempts to read User A's sleep record
    const { data: bReadSleep, error: bReadSleepErr } = await clientB
      .from("sleep_logs")
      .select("*")
      .eq("id", activeSleepId!);

    const bReadSleepBlocked = !bReadSleepErr && Array.isArray(bReadSleep) && bReadSleep.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot read User A's sleep record",
      expected: "Empty result array (0 rows) enforced by RLS",
      actual: bReadSleepBlocked
        ? "0 rows returned to User B"
        : `Security breach! Returned ${bReadSleep?.length} rows`,
      status: bReadSleepBlocked ? "PASS" : "FAIL",
    });

    // 5.8 User B attempts to modify User A's sleep record
    const { data: bUpdateSleep, error: bUpdateSleepErr } = await clientB
      .from("sleep_logs")
      .update({ duration_minutes: 100 })
      .eq("id", activeSleepId!)
      .select("*");

    const bUpdateSleepBlocked =
      !bUpdateSleepErr && Array.isArray(bUpdateSleep) && bUpdateSleep.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot modify User A's sleep record",
      expected: "0 rows modified enforced by RLS",
      actual: bUpdateSleepBlocked
        ? "0 rows updated by User B"
        : `Security breach! Updated ${bUpdateSleep?.length} rows`,
      status: bUpdateSleepBlocked ? "PASS" : "FAIL",
    });

    // 5.9 User B attempts to delete User A's sleep record
    const { data: bDeleteSleep, error: bDeleteSleepErr } = await clientB
      .from("sleep_logs")
      .delete()
      .eq("id", activeSleepId!)
      .select("*");

    const bDeleteSleepBlocked =
      !bDeleteSleepErr && Array.isArray(bDeleteSleep) && bDeleteSleep.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot delete User A's sleep record",
      expected: "0 rows deleted enforced by RLS",
      actual: bDeleteSleepBlocked
        ? "0 rows deleted by User B"
        : `Security breach! Deleted ${bDeleteSleep?.length} rows`,
      status: bDeleteSleepBlocked ? "PASS" : "FAIL",
    });

    // Verify User A's sleep record is unchanged after User B's attack
    const { data: aVerifySleep } = await clientA
      .from("sleep_logs")
      .select("duration_minutes")
      .eq("id", activeSleepId!)
      .single();

    record({
      category: "Cross-User RLS",
      testName: "Verify User A's sleep record remained intact and unmanipulated",
      expected: "duration_minutes=450 intact",
      actual: `duration_minutes=${aVerifySleep?.duration_minutes}`,
      status: aVerifySleep?.duration_minutes === 450 ? "PASS" : "FAIL",
    });

    // 5.10 User B attempts to read User A's profile goals
    const { data: bReadProfile, error: bReadProfileErr } = await clientB
      .from("profiles")
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .eq("id", authA.user.id);

    const bReadProfileBlocked =
      !bReadProfileErr && Array.isArray(bReadProfile) && bReadProfile.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot read User A's profile goals",
      expected: "0 rows returned enforced by RLS",
      actual: bReadProfileBlocked
        ? "0 profile rows returned to User B"
        : `Security breach! Returned ${bReadProfile?.length} profile rows`,
      status: bReadProfileBlocked ? "PASS" : "FAIL",
    });

    // 5.11 User B attempts to modify User A's profile goals
    const { data: bUpdateProfile, error: bUpdateProfileErr } = await clientB
      .from("profiles")
      .update({ daily_water_goal_ml: 9999 })
      .eq("id", authA.user.id)
      .select("*");

    const bUpdateProfileBlocked =
      !bUpdateProfileErr && Array.isArray(bUpdateProfile) && bUpdateProfile.length === 0;
    record({
      category: "Cross-User RLS",
      testName: "User B cannot modify User A's profile goals",
      expected: "0 rows modified enforced by RLS",
      actual: bUpdateProfileBlocked
        ? "0 profile rows modified by User B"
        : `Security breach! Modified ${bUpdateProfile?.length} rows`,
      status: bUpdateProfileBlocked ? "PASS" : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 6. HEALTH GOALS LIVE UPDATES & RESTORATION (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 6. Health Goals Live Updates & Restoration (User A) ---");

    // Read initial goals for User A
    const { data: initialProfile, error: initialProfileErr } = await clientA
      .from("profiles")
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .eq("id", authA.user.id)
      .single();

    record({
      category: "Goals",
      testName: "Read original profile health goals for Test User A",
      expected: "Profile retrieved with health goal fields",
      actual: !initialProfileErr && initialProfile
        ? `Water goal: ${initialProfile.daily_water_goal_ml ?? "null"}, Sleep goal: ${initialProfile.daily_sleep_goal_minutes ?? "null"}`
        : `Failed: ${initialProfileErr?.message}`,
      status: !initialProfileErr && initialProfile ? "PASS" : "FAIL",
    });

    // Update goals
    const testWaterGoal = 2600;
    const testSleepGoal = 490;
    const { data: updatedProfile, error: updateProfileErr } = await clientA
      .from("profiles")
      .update({
        daily_water_goal_ml: testWaterGoal,
        daily_sleep_goal_minutes: testSleepGoal,
      })
      .eq("id", authA.user.id)
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .single();

    record({
      category: "Goals",
      testName: "Update User A's water and sleep goals",
      expected: `water=${testWaterGoal}ml, sleep=${testSleepGoal}m`,
      actual: !updateProfileErr && updatedProfile
        ? `Water: ${updatedProfile.daily_water_goal_ml}ml, Sleep: ${updatedProfile.daily_sleep_goal_minutes}m`
        : `Failed: ${updateProfileErr?.message}`,
      status:
        !updateProfileErr &&
        updatedProfile?.daily_water_goal_ml === testWaterGoal &&
        updatedProfile?.daily_sleep_goal_minutes === testSleepGoal
          ? "PASS"
          : "FAIL",
    });

    // Read again to verify persistence
    const { data: verifyGoals, error: verifyGoalsErr } = await clientA
      .from("profiles")
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .eq("id", authA.user.id)
      .single();

    record({
      category: "Goals",
      testName: "Read again and verify updated goals persisted in database",
      expected: `water=${testWaterGoal}ml, sleep=${testSleepGoal}m`,
      actual: !verifyGoalsErr && verifyGoals
        ? `Persisted: water=${verifyGoals.daily_water_goal_ml}ml, sleep=${verifyGoals.daily_sleep_goal_minutes}m`
        : `Failed: ${verifyGoalsErr?.message}`,
      status:
        !verifyGoalsErr &&
        verifyGoals?.daily_water_goal_ml === testWaterGoal &&
        verifyGoals?.daily_sleep_goal_minutes === testSleepGoal
          ? "PASS"
          : "FAIL",
    });

    // Restore original goals
    const { data: restoredProfile, error: restoreGoalsErr } = await clientA
      .from("profiles")
      .update({
        daily_water_goal_ml: originalWaterGoal,
        daily_sleep_goal_minutes: originalSleepGoal,
      })
      .eq("id", authA.user.id)
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .single();

    record({
      category: "Goals",
      testName: "Restore original goal values (including nulls if applicable)",
      expected: `water=${originalWaterGoal ?? "null"}, sleep=${originalSleepGoal ?? "null"}`,
      actual: !restoreGoalsErr && restoredProfile
        ? `Restored: water=${restoredProfile.daily_water_goal_ml ?? "null"}, sleep=${restoredProfile.daily_sleep_goal_minutes ?? "null"}`
        : `Failed: ${restoreGoalsErr?.message}`,
      status:
        !restoreGoalsErr &&
        (restoredProfile?.daily_water_goal_ml ?? null) === originalWaterGoal &&
        (restoredProfile?.daily_sleep_goal_minutes ?? null) === originalSleepGoal
          ? "PASS"
          : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 7. RECORD DELETION VERIFICATION (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 7. Record Deletion Verification (User A) ---");

    // Delete Weight Record
    const { error: delWeightErr } = await clientA
      .from("weight_logs")
      .delete()
      .eq("id", activeWeightId!)
      .eq("user_id", authA.user.id);

    const { data: checkWeightPostDel } = await clientA
      .from("weight_logs")
      .select("id")
      .eq("id", activeWeightId!);

    const weightDeleted = !delWeightErr && (!checkWeightPostDel || checkWeightPostDel.length === 0);
    if (weightDeleted) {
      const idx = createdWeightIds.indexOf(activeWeightId!);
      if (idx !== -1) createdWeightIds.splice(idx, 1);
    }
    record({
      category: "Weight",
      testName: "Delete weight record and verify it no longer exists",
      expected: "Record removed, 0 rows found",
      actual: weightDeleted
        ? `Record ${activeWeightId} deleted, 0 rows found`
        : `Failed to delete record: ${delWeightErr?.message}`,
      status: weightDeleted ? "PASS" : "FAIL",
    });

    // Delete Water Record
    const { error: delWaterErr } = await clientA
      .from("water_logs")
      .delete()
      .eq("id", activeWaterId!)
      .eq("user_id", authA.user.id);

    const { data: checkWaterPostDel } = await clientA
      .from("water_logs")
      .select("id")
      .eq("id", activeWaterId!);

    const waterDeleted = !delWaterErr && (!checkWaterPostDel || checkWaterPostDel.length === 0);
    if (waterDeleted) {
      const idx = createdWaterIds.indexOf(activeWaterId!);
      if (idx !== -1) createdWaterIds.splice(idx, 1);
    }
    record({
      category: "Water",
      testName: "Delete water record and verify it no longer exists",
      expected: "Record removed, 0 rows found",
      actual: waterDeleted
        ? `Record ${activeWaterId} deleted, 0 rows found`
        : `Failed to delete record: ${delWaterErr?.message}`,
      status: waterDeleted ? "PASS" : "FAIL",
    });

    // Delete Sleep Record
    const { error: delSleepErr } = await clientA
      .from("sleep_logs")
      .delete()
      .eq("id", activeSleepId!)
      .eq("user_id", authA.user.id);

    const { data: checkSleepPostDel } = await clientA
      .from("sleep_logs")
      .select("id")
      .eq("id", activeSleepId!);

    const sleepDeleted = !delSleepErr && (!checkSleepPostDel || checkSleepPostDel.length === 0);
    if (sleepDeleted) {
      const idx = createdSleepIds.indexOf(activeSleepId!);
      if (idx !== -1) createdSleepIds.splice(idx, 1);
    }
    record({
      category: "Sleep",
      testName: "Delete sleep record and verify it no longer exists",
      expected: "Record removed, 0 rows found",
      actual: sleepDeleted
        ? `Record ${activeSleepId} deleted, 0 rows found`
        : `Failed to delete record: ${delSleepErr?.message}`,
      status: sleepDeleted ? "PASS" : "FAIL",
    });
  } catch (err) {
    console.error("Test execution caught an unexpected error:", err);
  } finally {
    // ----------------------------------------------------------------------------
    // 8. GUARANTEED AUTOMATIC CLEANUP IN FINALLY BLOCK
    // ----------------------------------------------------------------------------
    console.log("\n--- 8. Guaranteed Automatic Cleanup in Finally Block ---");

    let cleanupFailed = false;

    // 1. Cleanup remaining weight logs
    for (const id of createdWeightIds) {
      try {
        await clientA.from("weight_logs").delete().eq("id", id).eq("user_id", authA.user.id);
      } catch (cleanErr) {
        console.error(`Failed to cleanup weight ID ${id}:`, cleanErr);
        cleanupFailed = true;
      }
    }

    // 2. Cleanup remaining water logs
    for (const id of createdWaterIds) {
      try {
        await clientA.from("water_logs").delete().eq("id", id).eq("user_id", authA.user.id);
      } catch (cleanErr) {
        console.error(`Failed to cleanup water ID ${id}:`, cleanErr);
        cleanupFailed = true;
      }
    }

    // 3. Cleanup remaining sleep logs
    for (const id of createdSleepIds) {
      try {
        await clientA.from("sleep_logs").delete().eq("id", id).eq("user_id", authA.user.id);
      } catch (cleanErr) {
        console.error(`Failed to cleanup sleep ID ${id}:`, cleanErr);
        cleanupFailed = true;
      }
    }

    // 4. Ensure original health goals are restored
    if (originalGoalsLoaded) {
      try {
        await clientA
          .from("profiles")
          .update({
            daily_water_goal_ml: originalWaterGoal,
            daily_sleep_goal_minutes: originalSleepGoal,
          })
          .eq("id", authA.user.id);
      } catch (restoreErr) {
        console.error("Failed to restore original profile goals in finally block:", restoreErr);
        cleanupFailed = true;
      }
    }

    // 5. Verify all created records are completely gone
    let lingeringCount = 0;

    if (allCreatedWeightIds.length > 0) {
      const { data: lingeringWeight } = await clientA
        .from("weight_logs")
        .select("id")
        .in("id", allCreatedWeightIds);
      lingeringCount += lingeringWeight?.length || 0;
    }

    if (allCreatedWaterIds.length > 0) {
      const { data: lingeringWater } = await clientA
        .from("water_logs")
        .select("id")
        .in("id", allCreatedWaterIds);
      lingeringCount += lingeringWater?.length || 0;
    }

    if (allCreatedSleepIds.length > 0) {
      const { data: lingeringSleep } = await clientA
        .from("sleep_logs")
        .select("id")
        .in("id", allCreatedSleepIds);
      lingeringCount += lingeringSleep?.length || 0;
    }

    const cleanupClean = !cleanupFailed && lingeringCount === 0;

    record({
      category: "Cleanup",
      testName: "Automatic cleanup: all created test records purged and goals restored",
      expected: "0 lingering test records in database",
      actual: cleanupClean
        ? "0 lingering records verified, original goals restored"
        : `${lingeringCount} lingering test records detected or cleanup error`,
      status: cleanupClean ? "PASS" : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 9. SUMMARY REPORT
    // ----------------------------------------------------------------------------
    const totalPassed = testResults.filter((r) => r.status === "PASS").length;
    const totalFailed = testResults.filter((r) => r.status === "FAIL").length;

    console.log("==================================================================");
    console.log(`STAGE 9.2 LIVE SUPABASE TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
    console.log("==================================================================");

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

runStage9HealthLiveIntegration().catch((err) => {
  console.error("Fatal test harness error:", err);
  process.exit(1);
});
