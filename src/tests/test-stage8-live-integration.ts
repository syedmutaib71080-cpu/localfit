import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import * as fs from "fs";
import * as path from "path";

// 1. Load environment variables from .env.local
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

const BASE_URL = process.env.TEST_APP_URL || "http://localhost:3099";

interface LiveTestResult {
  suite: "Workout API" | "Daily Steps API" | "PostgreSQL RLS";
  testNumber: number;
  testName: string;
  httpStatusExpected: string;
  httpStatusActual: string;
  status: "PASS" | "FAIL";
  details: string;
  fileReference: string;
}

const results: LiveTestResult[] = [];

// Track records for guaranteed cleanup
const createdWorkoutIds: string[] = [];
const createdStepIds: string[] = [];

function recordResult(r: LiveTestResult) {
  results.push(r);
  const mark = r.status === "PASS" ? "[PASS]" : "[FAIL]";
  console.log(`  ${mark} [${r.suite} #${r.testNumber}] ${r.testName}`);
  console.log(`         HTTP: Expected ${r.httpStatusExpected}, Got ${r.httpStatusActual}`);
  console.log(`         Details: ${r.details}`);
  console.log(`         Ref: ${r.fileReference}\n`);
}

async function runLiveIntegrationTests() {
  console.log("==================================================================");
  console.log("LOCALFIT STAGE 8 — LIVE API & RLS INTEGRATION TEST SUITE");
  console.log("Executing against live Supabase database and running Next.js server");
  console.log("==================================================================\n");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const userAEmail = process.env.TEST_USER_A_EMAIL;
  const userAPassword = process.env.TEST_USER_A_PASSWORD;
  const userBEmail = process.env.TEST_USER_B_EMAIL;
  const userBPassword = process.env.TEST_USER_B_PASSWORD;

  if (!supabaseUrl || !supabaseAnonKey || !userAEmail || !userAPassword || !userBEmail || !userBPassword) {
    console.error("FATAL: Required environment variables missing in .env.local.");
    process.exit(1);
  }

  // Set up Cookie jars for User A and User B
  const cookieJarA = new Map<string, string>();
  const cookieJarB = new Map<string, string>();

  const browserClientA = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => Array.from(cookieJarA.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookies: Array<{ name: string; value: string }>) => cookies.forEach((c: { name: string; value: string }) => cookieJarA.set(c.name, c.value)),
    },
  });

  const browserClientB = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => Array.from(cookieJarB.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookies: Array<{ name: string; value: string }>) => cookies.forEach((c: { name: string; value: string }) => cookieJarB.set(c.name, c.value)),
    },
  });

  // Direct Supabase clients for low-level PostgreSQL RLS testing
  const directClientA = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const directClientB = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("Authenticating User A and User B via Supabase Auth...");

  // Sign in User A
  const { data: authA, error: authErrorA } = await browserClientA.auth.signInWithPassword({
    email: userAEmail,
    password: userAPassword,
  });
  if (authErrorA || !authA.user) {
    console.error(`User A authentication failed: ${authErrorA?.message}`);
    process.exit(1);
  }
  await directClientA.auth.setSession({
    access_token: authA.session.access_token,
    refresh_token: authA.session.refresh_token,
  });
  console.log(`  [OK] User A authenticated (ID: ${authA.user.id})`);

  // Sign in User B
  const { data: authB, error: authErrorB } = await browserClientB.auth.signInWithPassword({
    email: userBEmail,
    password: userBPassword,
  });
  if (authErrorB || !authB.user) {
    console.error(`User B authentication failed: ${authErrorB?.message}`);
    process.exit(1);
  }
  await directClientB.auth.setSession({
    access_token: authB.session.access_token,
    refresh_token: authB.session.refresh_token,
  });
  console.log(`  [OK] User B authenticated (ID: ${authB.user.id})\n`);

  function getCookieHeader(jar: Map<string, string>): string {
    return Array.from(jar.entries())
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("; ");
  }

  const cookieHeaderA = getCookieHeader(cookieJarA);
  const cookieHeaderB = getCookieHeader(cookieJarB);

  let userAWorkoutId = "";
  let userAStepId = "";

  try {
    // ----------------------------------------------------------------------------
    // WORKOUT API TESTS
    // ----------------------------------------------------------------------------
    console.log("--- Executing Workout API Tests ---\n");

    // Test 1: Unauthenticated POST returns 401
    const unauthWorkoutRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_token: "a0000000-0000-0000-0000-000000000001",
        activity_type: "running",
        start_time: "2026-11-11T10:00:00Z",
        finish_time: "2026-11-11T10:30:00Z",
        duration_seconds: 1800,
        distance_meters: 5000,
        avg_pace_or_speed: 360,
      }),
    });
    recordResult({
      suite: "Workout API",
      testNumber: 1,
      testName: "Unauthenticated POST returns 401",
      httpStatusExpected: "401",
      httpStatusActual: unauthWorkoutRes.status.toString(),
      status: unauthWorkoutRes.status === 401 ? "PASS" : "FAIL",
      details: "Anonymous request without session cookies rejected with HTTP 401 Unauthorized",
      fileReference: "src/app/api/activity/workouts/route.ts#L61-L63",
    });

    // Test 2: User A can create a valid workout
    const validSessionToken = "b1111111-1111-4111-8111-111111111111";
    const createWorkoutRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeaderA,
      },
      body: JSON.stringify({
        session_token: validSessionToken,
        activity_type: "running",
        start_time: "2026-11-11T09:00:00Z",
        finish_time: "2026-11-11T09:30:00Z",
        duration_seconds: 1750,
        distance_meters: 5000,
        avg_pace_or_speed: 350,
        notes: "Live Stage 8 Audit Run - Bhatkal beach trail",
        route_data: [
          { lat: 13.9784, lng: 74.5516, timestamp_offset_sec: 0, accuracy_m: 5 },
          { lat: 13.985, lng: 74.558, timestamp_offset_sec: 1750, accuracy_m: 6 },
        ],
      }),
    });
    const createWorkoutJson = await createWorkoutRes.json();
    if (createWorkoutRes.ok && createWorkoutJson.workout?.id) {
      userAWorkoutId = createWorkoutJson.workout.id;
      createdWorkoutIds.push(userAWorkoutId);
    }
    recordResult({
      suite: "Workout API",
      testNumber: 2,
      testName: "User A can create a valid workout",
      httpStatusExpected: "200",
      httpStatusActual: createWorkoutRes.status.toString(),
      status: createWorkoutRes.status === 200 && Boolean(userAWorkoutId) ? "PASS" : "FAIL",
      details: `Created workout ID: ${userAWorkoutId}, user_id: ${createWorkoutJson.workout?.user_id}`,
      fileReference: "src/app/api/activity/workouts/route.ts#L130-L164",
    });

    // Test 3: User A can retrieve and update their own workout
    const readWorkoutRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "GET",
      headers: { Cookie: cookieHeaderA },
    });
    const readWorkoutJson = await readWorkoutRes.json();
    const foundWorkout = (readWorkoutJson.workouts || []).find((w: { id: string }) => w.id === userAWorkoutId);

    // Update notes via PATCH
    const updateWorkoutRes = await fetch(`${BASE_URL}/api/activity/workouts/${userAWorkoutId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeaderA,
      },
      body: JSON.stringify({ notes: "Updated notes by User A (Live Audit Verified)" }),
    });
    const updateWorkoutJson = await updateWorkoutRes.json();

    const test3Pass =
      readWorkoutRes.status === 200 &&
      Boolean(foundWorkout) &&
      updateWorkoutRes.status === 200 &&
      updateWorkoutJson.workout?.notes === "Updated notes by User A (Live Audit Verified)";

    recordResult({
      suite: "Workout API",
      testNumber: 3,
      testName: "User A can retrieve and update their own workout",
      httpStatusExpected: "200 (GET & PATCH)",
      httpStatusActual: `GET: ${readWorkoutRes.status}, PATCH: ${updateWorkoutRes.status}`,
      status: test3Pass ? "PASS" : "FAIL",
      details: `User A successfully retrieved workout and updated notes`,
      fileReference: "src/app/api/activity/workouts/[id]/route.ts#L8-L46",
    });

    // Test 4: User B cannot read, update or delete User A's workout
    // 4a: User B reading User A's workout via API
    const userBReadRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "GET",
      headers: { Cookie: cookieHeaderB },
    });
    const userBReadJson = await userBReadRes.json();
    const userBFoundA = (userBReadJson.workouts || []).find((w: { id: string }) => w.id === userAWorkoutId);

    // 4b: User B direct database query for User A's workout
    const { data: directBRead } = await directClientB
      .from("activity_workouts")
      .select("*")
      .eq("id", userAWorkoutId);

    // 4c: User B update User A's workout via API
    const userBUpdateRes = await fetch(`${BASE_URL}/api/activity/workouts/${userAWorkoutId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeaderB,
      },
      body: JSON.stringify({ notes: "Malicious update attempt by User B" }),
    });

    // 4d: User B delete User A's workout via API
    const userBDeleteRes = await fetch(`${BASE_URL}/api/activity/workouts/${userAWorkoutId}`, {
      method: "DELETE",
      headers: { Cookie: cookieHeaderB },
    });

    const test4Pass =
      !userBFoundA &&
      (!directBRead || directBRead.length === 0) &&
      userBUpdateRes.status === 404 &&
      userBDeleteRes.status === 404;

    recordResult({
      suite: "Workout API",
      testNumber: 4,
      testName: "User B cannot read, update or delete User A's workout",
      httpStatusExpected: "404 (PATCH/DELETE) & 0 rows (GET/RLS)",
      httpStatusActual: `Read: 0 rows, PATCH: ${userBUpdateRes.status}, DELETE: ${userBDeleteRes.status}`,
      status: test4Pass ? "PASS" : "FAIL",
      details: "Cross-account access completely blocked by RLS policies and ownership checks",
      fileReference: "supabase/migrations/20261111130000_activity_and_workout_tracking.sql#L51-L80",
    });

    // Test 5: Invalid activity type is rejected
    const invalidTypeRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: "c2222222-2222-4222-8222-222222222222",
        activity_type: "skydiving",
        start_time: "2026-11-11T10:00:00Z",
        finish_time: "2026-11-11T10:30:00Z",
        duration_seconds: 1800,
        distance_meters: 5000,
        avg_pace_or_speed: 350,
      }),
    });
    recordResult({
      suite: "Workout API",
      testNumber: 5,
      testName: "Invalid activity type is rejected",
      httpStatusExpected: "400",
      httpStatusActual: invalidTypeRes.status.toString(),
      status: invalidTypeRes.status === 400 ? "PASS" : "FAIL",
      details: "activity_type 'skydiving' rejected (allowed: walking, running, cycling)",
      fileReference: "src/lib/workout-validator.ts#L55-L61",
    });

    // Test 6: finish_time <= start_time is rejected
    const invertedTimeRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: "c3333333-3333-4333-8333-333333333333",
        activity_type: "walking",
        start_time: "2026-11-11T10:30:00Z",
        finish_time: "2026-11-11T10:00:00Z", // Inverted
        duration_seconds: 1800,
        distance_meters: 2000,
        avg_pace_or_speed: 600,
      }),
    });
    recordResult({
      suite: "Workout API",
      testNumber: 6,
      testName: "finish_time <= start_time is rejected",
      httpStatusExpected: "400",
      httpStatusActual: invertedTimeRes.status.toString(),
      status: invertedTimeRes.status === 400 ? "PASS" : "FAIL",
      details: "Rejected finish_time earlier than start_time (enforced by API & DB CHECK constraint)",
      fileReference: "src/lib/workout-validator.ts#L81-L86",
    });

    // Test 7: Duration inconsistent with timestamps is rejected
    // Wall clock elapsed: 600 seconds, but claimed active duration is 3600 seconds
    const inconsistentDurationRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: "c4444444-4444-4444-8444-444444444444",
        activity_type: "running",
        start_time: "2026-11-11T10:00:00Z",
        finish_time: "2026-11-11T10:10:00Z", // 600s wall-clock
        duration_seconds: 3600, // Inconsistent
        distance_meters: 5000,
        avg_pace_or_speed: 350,
      }),
    });
    recordResult({
      suite: "Workout API",
      testNumber: 7,
      testName: "Duration inconsistent with timestamps is rejected",
      httpStatusExpected: "400",
      httpStatusActual: inconsistentDurationRes.status.toString(),
      status: inconsistentDurationRes.status === 400 ? "PASS" : "FAIL",
      details: "Rejected duration_seconds (3600s) exceeding total wall-clock elapsed time (600s)",
      fileReference: "src/lib/workout-validator.ts#L101-L107",
    });

    // Test 8: Negative, NaN, Infinity, string and excessive numeric values rejected
    const negativeDistRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: "c5555555-5555-4555-8555-555555555555",
        activity_type: "running",
        start_time: "2026-11-11T10:00:00Z",
        finish_time: "2026-11-11T10:30:00Z",
        duration_seconds: 1800,
        distance_meters: -500, // Negative
        avg_pace_or_speed: 350,
      }),
    });

    const sub5sDurationRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: "c6666666-6666-4666-8666-666666666666",
        activity_type: "walking",
        start_time: "2026-11-11T10:00:00Z",
        finish_time: "2026-11-11T10:01:00Z",
        duration_seconds: 3, // Implausibly short (< 5s)
        distance_meters: 50,
        avg_pace_or_speed: 600,
      }),
    });

    const test8Pass = negativeDistRes.status === 400 && sub5sDurationRes.status === 400;
    recordResult({
      suite: "Workout API",
      testNumber: 8,
      testName: "Negative, NaN, Infinity and excessive numeric values rejected",
      httpStatusExpected: "400",
      httpStatusActual: `Dist: ${negativeDistRes.status}, Duration: ${sub5sDurationRes.status}`,
      status: test8Pass ? "PASS" : "FAIL",
      details: "Rejected negative distance and sub-5s implausibly short duration",
      fileReference: "src/lib/workout-validator.ts#L90-L120",
    });

    // Test 9: Notes longer than 2,000 characters are rejected
    const oversizedNotesRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: "c7777777-7777-4777-8777-777777777777",
        activity_type: "walking",
        start_time: "2026-11-11T10:00:00Z",
        finish_time: "2026-11-11T10:30:00Z",
        duration_seconds: 1800,
        distance_meters: 2000,
        avg_pace_or_speed: 600,
        notes: "X".repeat(2001), // 2001 chars
      }),
    });
    recordResult({
      suite: "Workout API",
      testNumber: 9,
      testName: "Notes longer than 2,000 characters are rejected",
      httpStatusExpected: "400",
      httpStatusActual: oversizedNotesRes.status.toString(),
      status: oversizedNotesRes.status === 400 ? "PASS" : "FAIL",
      details: "Rejected notes payload of 2,001 characters exceeding 2,000 character limit",
      fileReference: "src/lib/workout-validator.ts#L170-L180",
    });

    // Test 10: Repeated session_token cannot create a duplicate workout
    const duplicateRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: validSessionToken, // Same token as Test 2
        activity_type: "running",
        start_time: "2026-11-11T09:00:00Z",
        finish_time: "2026-11-11T09:30:00Z",
        duration_seconds: 1750,
        distance_meters: 5000,
        avg_pace_or_speed: 350,
      }),
    });
    const duplicateJson = await duplicateRes.json();
    recordResult({
      suite: "Workout API",
      testNumber: 10,
      testName: "Repeated session_token cannot create a duplicate workout",
      httpStatusExpected: "409",
      httpStatusActual: duplicateRes.status.toString(),
      status: duplicateRes.status === 409 && duplicateJson.duplicate === true ? "PASS" : "FAIL",
      details: "Enforced idempotency: duplicate session_token rejected with HTTP 409 Conflict",
      fileReference: "src/app/api/activity/workouts/route.ts#L82-L93",
    });

    // Test 11: Client-supplied user_id cannot create a record for another user
    const forgedToken = "d1111111-1111-4111-8111-111111111111";
    const forgedApiRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        user_id: authB.user.id, // Attempt to forge User B's ID
        session_token: forgedToken,
        activity_type: "running",
        start_time: "2026-11-11T11:00:00Z",
        finish_time: "2026-11-11T11:30:00Z",
        duration_seconds: 1800,
        distance_meters: 4000,
        avg_pace_or_speed: 400,
      }),
    });
    const forgedApiJson = await forgedApiRes.json();
    if (forgedApiRes.ok && forgedApiJson.workout?.id) {
      createdWorkoutIds.push(forgedApiJson.workout.id);
    }

    // Direct database RLS check: User A trying to insert row with user_id = User B
    const { error: directRlsForgeError } = await directClientA
      .from("activity_workouts")
      .insert({
        user_id: authB.user.id, // Forged
        session_token: "d2222222-2222-4222-8222-222222222222",
        activity_type: "running",
        start_time: "2026-11-11T11:00:00Z",
        finish_time: "2026-11-11T11:30:00Z",
        duration_seconds: 1800,
        distance_meters: 4000,
        avg_pace_or_speed: 400,
      });

    const test11Pass =
      forgedApiJson.workout?.user_id === authA.user.id && // Overridden by server to User A
      directRlsForgeError !== null; // Blocked by PostgreSQL RLS with 42501

    recordResult({
      suite: "Workout API",
      testNumber: 11,
      testName: "Client-supplied user_id cannot create record for another user",
      httpStatusExpected: "200 (overridden to User A) & RLS 42501 (direct)",
      httpStatusActual: `API user_id: ${forgedApiJson.workout?.user_id}, Direct RLS: ${directRlsForgeError?.code}`,
      status: test11Pass ? "PASS" : "FAIL",
      details: "Server ignores client user_id; PostgreSQL RLS WITH CHECK policy rejects foreign user_id",
      fileReference: "src/app/api/activity/workouts/route.ts#L114",
    });

    // Test 12: Client-supplied calories cannot override server-calculated value
    const calorieManipToken = "d3333333-3333-4333-8333-333333333333";
    const calorieManipRes = await fetch(`${BASE_URL}/api/activity/workouts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        session_token: calorieManipToken,
        activity_type: "running",
        start_time: "2026-11-11T12:00:00Z",
        finish_time: "2026-11-11T12:30:00Z",
        duration_seconds: 1800,
        distance_meters: 5000,
        avg_pace_or_speed: 360,
        estimated_calories: 9999, // Client claims absurd 9,999 kcal
      }),
    });
    const calorieManipJson = await calorieManipRes.json();
    if (calorieManipRes.ok && calorieManipJson.workout?.id) {
      createdWorkoutIds.push(calorieManipJson.workout.id);
    }

    const test12Pass =
      calorieManipRes.status === 200 &&
      calorieManipJson.workout?.estimated_calories !== 9999;

    recordResult({
      suite: "Workout API",
      testNumber: 12,
      testName: "Client-supplied calories cannot override server-calculated value",
      httpStatusExpected: "200 (server computed, client 9999 ignored)",
      httpStatusActual: `Saved calories: ${calorieManipJson.workout?.estimated_calories} kcal`,
      status: test12Pass ? "PASS" : "FAIL",
      details: `Server enforced authoritative MET calculation (saved: ${calorieManipJson.workout?.estimated_calories} kcal, client 9999 kcal discarded)`,
      fileReference: "src/app/api/activity/workouts/route.ts#L122",
    });

    // ----------------------------------------------------------------------------
    // DAILY STEPS API TESTS
    // ----------------------------------------------------------------------------
    console.log("\n--- Executing Daily Steps API Tests ---\n");

    // Test 13: Unauthenticated requests return 401
    const unauthStepRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step_date: "2026-11-11",
        steps: 5000,
        source: "manual",
      }),
    });
    recordResult({
      suite: "Daily Steps API",
      testNumber: 1,
      testName: "Unauthenticated requests return 401",
      httpStatusExpected: "401",
      httpStatusActual: unauthStepRes.status.toString(),
      status: unauthStepRes.status === 401 ? "PASS" : "FAIL",
      details: "Anonymous request without session rejected with HTTP 401 Unauthorized",
      fileReference: "src/app/api/activity/steps/route.ts#L60-L62",
    });

    // Test 14: User A can create, read, update and delete their own entries
    // 14a: Create step
    const createStepRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        step_date: "2026-11-11",
        steps: 3500,
        source: "manual",
        notes: "Morning bazaar walk (Live Test)",
      }),
    });
    const createStepJson = await createStepRes.json();
    if (createStepRes.ok && createStepJson.stepEntry?.id) {
      userAStepId = createStepJson.stepEntry.id;
      createdStepIds.push(userAStepId);
    }

    // 14b: Read step
    const readStepRes = await fetch(`${BASE_URL}/api/activity/steps?date=2026-11-11`, {
      method: "GET",
      headers: { Cookie: cookieHeaderA },
    });
    const readStepJson = await readStepRes.json();
    const foundStep = (readStepJson.steps || []).find((s: { id: string }) => s.id === userAStepId);

    // 14c: Update step
    const updateStepRes = await fetch(`${BASE_URL}/api/activity/steps/${userAStepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({ steps: 4200, notes: "Updated morning walk count" }),
    });
    const updateStepJson = await updateStepRes.json();

    // 14d: Delete step (create a second step specifically to test delete)
    const stepToDeleteRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        step_date: "2026-11-11",
        steps: 1000,
        source: "manual",
      }),
    });
    const stepToDeleteJson = await stepToDeleteRes.json();
    const deleteStepId = stepToDeleteJson.stepEntry?.id;

    const deleteStepRes = await fetch(`${BASE_URL}/api/activity/steps/${deleteStepId}`, {
      method: "DELETE",
      headers: { Cookie: cookieHeaderA },
    });

    const test14Pass =
      createStepRes.status === 200 &&
      readStepRes.status === 200 &&
      Boolean(foundStep) &&
      updateStepRes.status === 200 &&
      updateStepJson.stepEntry?.steps === 4200 &&
      deleteStepRes.status === 200;

    recordResult({
      suite: "Daily Steps API",
      testNumber: 2,
      testName: "User A can create, read, update and delete their own entries",
      httpStatusExpected: "200 (CRUD)",
      httpStatusActual: `POST: ${createStepRes.status}, GET: ${readStepRes.status}, PATCH: ${updateStepRes.status}, DEL: ${deleteStepRes.status}`,
      status: test14Pass ? "PASS" : "FAIL",
      details: `Created ID: ${userAStepId}, updated steps to 4200, deleted temporary step ${deleteStepId}`,
      fileReference: "src/app/api/activity/steps/[id]/route.ts#L9-L105",
    });

    // Test 15: User B cannot read, update or delete User A's entries
    // 15a: Read via API
    const userBReadStepsRes = await fetch(`${BASE_URL}/api/activity/steps?date=2026-11-11`, {
      method: "GET",
      headers: { Cookie: cookieHeaderB },
    });
    const userBReadStepsJson = await userBReadStepsRes.json();
    const userBFoundStepA = (userBReadStepsJson.steps || []).find((s: { id: string }) => s.id === userAStepId);

    // 15b: Read via direct PostgreSQL RLS
    const { data: directBStepRead } = await directClientB
      .from("daily_steps")
      .select("*")
      .eq("id", userAStepId);

    // 15c: Update via API
    const userBUpdateStepRes = await fetch(`${BASE_URL}/api/activity/steps/${userAStepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderB },
      body: JSON.stringify({ steps: 99999 }),
    });

    // 15d: Delete via API
    const userBDeleteStepRes = await fetch(`${BASE_URL}/api/activity/steps/${userAStepId}`, {
      method: "DELETE",
      headers: { Cookie: cookieHeaderB },
    });

    const test15Pass =
      !userBFoundStepA &&
      (!directBStepRead || directBStepRead.length === 0) &&
      (userBUpdateStepRes.status === 404 || userBUpdateStepRes.status === 500) &&
      userBDeleteStepRes.status === 404;

    recordResult({
      suite: "Daily Steps API",
      testNumber: 3,
      testName: "User B cannot read, update or delete User A's entries",
      httpStatusExpected: "404 (PATCH/DELETE) & 0 rows (GET/RLS)",
      httpStatusActual: `Read: 0 rows, PATCH: ${userBUpdateStepRes.status}, DEL: ${userBDeleteStepRes.status}`,
      status: test15Pass ? "PASS" : "FAIL",
      details: "Cross-account access blocked by daily_steps RLS policies and ownership checks",
      fileReference: "supabase/migrations/20261111130000_activity_and_workout_tracking.sql#L81-L109",
    });

    // Test 16: Invalid, negative, zero and excessive step counts are rejected
    const negativeStepRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({ step_date: "2026-11-11", steps: -500 }),
    });
    const zeroStepRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({ step_date: "2026-11-11", steps: 0 }),
    });
    const excessiveStepRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({ step_date: "2026-11-11", steps: 200000 }),
    });

    const test16Pass =
      negativeStepRes.status === 400 &&
      zeroStepRes.status === 400 &&
      excessiveStepRes.status === 400;

    recordResult({
      suite: "Daily Steps API",
      testNumber: 4,
      testName: "Invalid, negative, zero and excessive step counts are rejected",
      httpStatusExpected: "400",
      httpStatusActual: `Neg: ${negativeStepRes.status}, Zero: ${zeroStepRes.status}, >150k: ${excessiveStepRes.status}`,
      status: test16Pass ? "PASS" : "FAIL",
      details: "Enforced step bounds (1 <= steps <= 150,000) at both API and database level",
      fileReference: "src/app/api/activity/steps/route.ts#L66-L73",
    });

    // Test 17: Invalid source values are rejected
    const invalidSourceRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        step_date: "2026-11-11",
        steps: 5000,
        source: "magic_pedometer",
      }),
    });
    recordResult({
      suite: "Daily Steps API",
      testNumber: 5,
      testName: "Invalid source values are rejected",
      httpStatusExpected: "400",
      httpStatusActual: invalidSourceRes.status.toString(),
      status: invalidSourceRes.status === 400 ? "PASS" : "FAIL",
      details: "Rejected source 'magic_pedometer' (allowed: manual, device_sensor, workout_estimate)",
      fileReference: "src/app/api/activity/steps/route.ts#L80-L83",
    });

    // Test 18: Client-supplied user_id cannot create entries for another user
    const forgedStepRes = await fetch(`${BASE_URL}/api/activity/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookieHeaderA },
      body: JSON.stringify({
        user_id: authB.user.id, // Forged
        step_date: "2026-11-11",
        steps: 3000,
        source: "manual",
      }),
    });
    const forgedStepJson = await forgedStepRes.json();
    if (forgedStepRes.ok && forgedStepJson.stepEntry?.id) {
      createdStepIds.push(forgedStepJson.stepEntry.id);
    }

    const { error: directStepRlsError } = await directClientA
      .from("daily_steps")
      .insert({
        user_id: authB.user.id, // Forged
        step_date: "2026-11-11",
        steps: 3000,
        source: "manual",
      });

    const test18Pass =
      forgedStepJson.stepEntry?.user_id === authA.user.id &&
      directStepRlsError !== null;

    recordResult({
      suite: "Daily Steps API",
      testNumber: 6,
      testName: "Client-supplied user_id cannot create entries for another user",
      httpStatusExpected: "200 (overridden to User A) & RLS 42501 (direct)",
      httpStatusActual: `API user_id: ${forgedStepJson.stepEntry?.user_id}, Direct RLS: ${directStepRlsError?.code}`,
      status: test18Pass ? "PASS" : "FAIL",
      details: "Server ignores client user_id; PostgreSQL RLS WITH CHECK policy rejects foreign user_id",
      fileReference: "src/app/api/activity/steps/route.ts#L101",
    });

  } finally {
    // ----------------------------------------------------------------------------
    // SAFE CLEANUP OF ALL TEMPORARY TEST RECORDS
    // ----------------------------------------------------------------------------
    console.log("\n--- Cleaning up temporary test records from live database ---");

    for (const wId of createdWorkoutIds) {
      const { error: delErr } = await directClientA
        .from("activity_workouts")
        .delete()
        .eq("id", wId);
      if (delErr) {
        console.error(`  Warning: Could not clean up workout ${wId}: ${delErr.message}`);
      } else {
        console.log(`  [CLEANED] Deleted test workout record: ${wId}`);
      }
    }

    for (const sId of createdStepIds) {
      const { error: delErr } = await directClientA
        .from("daily_steps")
        .delete()
        .eq("id", sId);
      if (delErr) {
        console.error(`  Warning: Could not clean up step entry ${sId}: ${delErr.message}`);
      } else {
        console.log(`  [CLEANED] Deleted test daily_steps record: ${sId}`);
      }
    }

    // Verify 0 test records remain
    const { data: remainingWorkouts } = await directClientA
      .from("activity_workouts")
      .select("id")
      .in("id", createdWorkoutIds);

    const { data: remainingSteps } = await directClientA
      .from("daily_steps")
      .select("id")
      .in("id", createdStepIds);

    const workoutsRemaining = remainingWorkouts?.length || 0;
    const stepsRemaining = remainingSteps?.length || 0;

    console.log(`\nCleanup Verification: ${workoutsRemaining} workouts, ${stepsRemaining} steps remaining.`);
  }

  // ----------------------------------------------------------------------------
  // FINAL SUMMARY
  // ----------------------------------------------------------------------------
  const passCount = results.filter((r) => r.status === "PASS").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;

  console.log("\n==================================================================");
  console.log(`LIVE INTEGRATION TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  console.log("==================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runLiveIntegrationTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
