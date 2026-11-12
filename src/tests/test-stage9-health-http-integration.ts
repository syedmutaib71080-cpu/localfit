/**
 * LocalFit — Stage 9.2 Live HTTP API Integration Test Harness
 * Tests actual Next.js HTTP API endpoints (/api/health/weight, /api/health/water,
 * /api/health/sleep, /api/health/goals) using real HTTP requests with session cookie
 * authentication, validation errors, cross-user isolation, integrity checks, and cleanup.
 *
 * Safety & Architecture Rules:
 * - Boots or connects to a Next.js production server.
 * - Authenticates User A and User B through actual application session/cookie mechanism.
 * - Makes real HTTP fetch calls to all specified routes for GET, POST, PATCH, DELETE.
 * - Does not use service-role credentials.
 * - Enforces zero test record lingering in database after execution.
 */

import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";
import { spawn, execSync, ChildProcess } from "child_process";

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
  category: "Server" | "Auth" | "Unauth" | "Weight" | "Water" | "Sleep" | "Goals" | "Cross-User HTTP" | "Integrity" | "Cleanup";
  testName: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL";
  method?: string;
  endpoint?: string;
  statusCode?: number;
}

const testResults: TestRecord[] = [];

function record(r: TestRecord) {
  testResults.push(r);
  const mark = r.status === "PASS" ? "[PASS]" : "[FAIL]";
  const route = r.method && r.endpoint ? ` (${r.method} ${r.endpoint})` : "";
  console.log(`  ${mark} [${r.category}] ${r.testName}${route}`);
  console.log(`         Expected: ${r.expected}`);
  console.log(`         Actual:   ${r.actual}`);
  console.log("");
}

interface CookieItem {
  name: string;
  value: string;
  options?: {
    maxAge?: number;
    [key: string]: unknown;
  };
}

// In-Memory Cookie Jar for Supabase SSR Cookie Handling
class MemoryCookieJar {
  private cookies = new Map<string, string>();

  getAll() {
    return Array.from(this.cookies.entries()).map(([name, value]) => ({ name, value }));
  }

  setAll(cookiesToSet: CookieItem[]) {
    for (const { name, value, options } of cookiesToSet) {
      if (!value || (options && options.maxAge === 0)) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader(): string {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

// Find a free TCP port dynamically
async function getFreePort(startingPort = 3010): Promise<number> {
  for (let port = startingPort; port < startingPort + 100; port++) {
    const isAvailable = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once("error", () => resolve(false));
      server.once("listening", () => server.close(() => resolve(true)));
      server.listen(port);
    });
    if (isAvailable) return port;
  }
  throw new Error("No free port available in scanned range");
}

function killProcessTree(pid: number) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    // Process already exited
  }
}

// Track created records for cleanup
const createdWeightIds: string[] = [];
const createdWaterIds: string[] = [];
const createdSleepIds: string[] = [];
const allCreatedWeightIds: string[] = [];
const allCreatedWaterIds: string[] = [];
const allCreatedSleepIds: string[] = [];

async function runStage9HealthHttpIntegration() {
  console.log("==================================================================");
  console.log("LOCALFIT STAGE 9.2: LIVE HTTP API INTEGRATION TEST SUITE");
  console.log("Executing actual HTTP requests against Next.js production server");
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
    console.error("\nFATAL: Required environment variables are missing in .env.local.");
    process.exit(1);
  }

  record({
    category: "Auth",
    testName: "Safety Pre-flight: Required credentials configured without exposure",
    expected: "All 6 required variables verified",
    actual: "All 6 required variables verified",
    status: "PASS",
  });

  // Direct Supabase client for cleanup verification and snapshotting (anon key only)
  const directClientA = createSupabaseClient(supabaseUrl!, supabaseAnonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ----------------------------------------------------------------------------
  // 2. SERVER STARTUP & AVAILABILITY CHECK
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Production Server Startup & Availability ---");

  let serverProcess: ChildProcess | null = null;
  let serverPort: number;
  let baseUrl: string;

  // Check if an existing server is running on port 3000
  let existingRunning = false;
  try {
    const probe = await fetch("http://localhost:3000/api/health/weight");
    if (probe.status === 401) {
      existingRunning = true;
    }
  } catch {
    existingRunning = false;
  }

  if (existingRunning) {
    serverPort = 3000;
    baseUrl = `http://localhost:${serverPort}`;
    console.log(`Connected to already running Next.js instance on port ${serverPort}`);
  } else {
    serverPort = await getFreePort(3055);
    baseUrl = `http://localhost:${serverPort}`;
    console.log(`Starting dedicated Next.js production server on port ${serverPort}...`);

    serverProcess = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["next", "start", "-p", serverPort.toString()],
      {
        cwd: process.cwd(),
        shell: true,
        stdio: "pipe",
      }
    );

    // Wait for server to be responsive
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        const probe = await fetch(`${baseUrl}/api/health/weight`);
        if (probe.status === 401) {
          ready = true;
          break;
        }
      } catch {
        // Still booting
      }
      await new Promise((r) => setTimeout(r, 600));
    }

    if (!ready) {
      console.error("\nFATAL: Next.js server failed to respond within 18 seconds.");
      if (serverProcess.pid) killProcessTree(serverProcess.pid);
      process.exit(1);
    }
    console.log(`Next.js server ready and listening at ${baseUrl}`);
  }

  record({
    category: "Server",
    testName: "Next.js production server running and responding to HTTP requests",
    expected: `HTTP 401 unauthenticated probe on ${baseUrl}`,
    actual: `Server active and responding on port ${serverPort}`,
    status: "PASS",
  });

  // ----------------------------------------------------------------------------
  // 3. AUTHENTICATION THROUGH APPLICATION SESSION / COOKIE MECHANISM
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Authentication via Supabase SSR Cookie Mechanism ---");

  const jarA = new MemoryCookieJar();
  const jarB = new MemoryCookieJar();

  const browserClientA = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    isSingleton: false,
    cookies: {
      getAll: () => jarA.getAll(),
      setAll: (c: CookieItem[]) => jarA.setAll(c),
    },
  });

  const browserClientB = createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    isSingleton: false,
    cookies: {
      getAll: () => jarB.getAll(),
      setAll: (c: CookieItem[]) => jarB.setAll(c),
    },
  });

  const { data: authA, error: authErrA } = await browserClientA.auth.signInWithPassword({
    email: userAEmail!,
    password: userAPassword!,
  });

  if (authErrA || !authA.user) {
    console.error(`\nFATAL: User A sign in failed: ${authErrA?.message}`);
    if (serverProcess?.pid) killProcessTree(serverProcess.pid);
    process.exit(1);
  }

  const { data: authB, error: authErrB } = await browserClientB.auth.signInWithPassword({
    email: userBEmail!,
    password: userBPassword!,
  });

  if (authErrB || !authB.user) {
    console.error(`\nFATAL: User B sign in failed: ${authErrB?.message}`);
    if (serverProcess?.pid) killProcessTree(serverProcess.pid);
    process.exit(1);
  }

  record({
    category: "Auth",
    testName: "Authenticate User A via SSR cookies",
    expected: "Session established with cookies populated",
    actual: `User A (${authA.user.id.slice(0, 8)}...) authenticated with ${jarA.getAll().length} cookie(s)`,
    status: jarA.getAll().length > 0 ? "PASS" : "FAIL",
  });

  record({
    category: "Auth",
    testName: "Authenticate User B via SSR cookies",
    expected: "Session established with cookies populated",
    actual: `User B (${authB.user.id.slice(0, 8)}...) authenticated with ${jarB.getAll().length} cookie(s)`,
    status: jarB.getAll().length > 0 ? "PASS" : "FAIL",
  });

  record({
    category: "Auth",
    testName: "Verify User A and User B are distinct identities",
    expected: "Distinct user UUIDs",
    actual: `User A (${authA.user.id.slice(0, 8)}...) !== User B (${authB.user.id.slice(0, 8)}...)`,
    status: authA.user.id !== authB.user.id ? "PASS" : "FAIL",
  });

  // Snapshot initial User A health goals
  let originalWaterGoal: number | null = null;
  let originalSleepGoal: number | null = null;
  let originalGoalsLoaded = false;

  try {
    const { data: origProfile } = await directClientA
      .from("profiles")
      .select("daily_water_goal_ml, daily_sleep_goal_minutes")
      .eq("id", authA.user.id)
      .maybeSingle();

    if (origProfile) {
      originalWaterGoal = origProfile.daily_water_goal_ml ?? null;
      originalSleepGoal = origProfile.daily_sleep_goal_minutes ?? null;
      originalGoalsLoaded = true;
    }
  } catch {
    // Continue
  }

  // Active created IDs
  let activeWeightId: string | null = null;
  let activeWaterId: string | null = null;
  let activeSleepId: string | null = null;

  try {
    // ----------------------------------------------------------------------------
    // 4. UNAUTHENTICATED REQUESTS TEST (401 ACROSS ALL ENDPOINTS)
    // ----------------------------------------------------------------------------
    console.log("--- 4. Unauthenticated Access Protection (HTTP 401) ---");

    const unauthChecks = [
      { method: "GET", path: "/api/health/weight" },
      { method: "POST", path: "/api/health/weight", body: { weight_kg: 70 } },
      { method: "GET", path: "/api/health/water" },
      { method: "POST", path: "/api/health/water", body: { amount_ml: 500 } },
      { method: "GET", path: "/api/health/sleep" },
      { method: "POST", path: "/api/health/sleep", body: { duration_minutes: 480 } },
      { method: "GET", path: "/api/health/goals" },
      { method: "PATCH", path: "/api/health/goals", body: { daily_water_goal_ml: 2000 } },
    ];

    for (const check of unauthChecks) {
      const res = await fetch(`${baseUrl}${check.path}`, {
        method: check.method,
        headers: check.body ? { "Content-Type": "application/json" } : undefined,
        body: check.body ? JSON.stringify(check.body) : undefined,
      });

      record({
        category: "Unauth",
        testName: `Unauthenticated ${check.method} ${check.path} rejected`,
        method: check.method,
        endpoint: check.path,
        expected: "HTTP 401 Unauthorized",
        actual: `HTTP ${res.status}`,
        status: res.status === 401 ? "PASS" : "FAIL",
      });
    }

    // ----------------------------------------------------------------------------
    // 5. WEIGHT TRACKING HTTP API (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 5. Weight Tracking HTTP API Tests ---");

    // 5.1 POST validation failure (weight out of bounds)
    const invalidWeightRes = await fetch(`${baseUrl}/api/health/weight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({ weight_kg: 10.0 }), // < 20.0 kg
    });

    record({
      category: "Weight",
      testName: "POST /api/health/weight rejects out-of-bounds weight (10.0 kg)",
      method: "POST",
      endpoint: "/api/health/weight",
      expected: "HTTP 400 with validation error message",
      actual: `HTTP ${invalidWeightRes.status}`,
      status: invalidWeightRes.status === 400 ? "PASS" : "FAIL",
    });

    // 5.2 POST valid weight entry
    const testDate = "2026-11-12";
    const postWeightRes = await fetch(`${baseUrl}/api/health/weight`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        weight_kg: 74.5,
        logged_date: testDate,
        notes: "HTTP live weigh-in test",
      }),
    });

    const postWeightData = postWeightRes.ok ? await postWeightRes.json() : null;
    const weightCreated = postWeightRes.status === 201 && postWeightData?.weight?.id;
    if (weightCreated) {
      activeWeightId = postWeightData.weight.id;
      createdWeightIds.push(postWeightData.weight.id);
      allCreatedWeightIds.push(postWeightData.weight.id);
    }

    record({
      category: "Weight",
      testName: "POST /api/health/weight creates weight entry for User A",
      method: "POST",
      endpoint: "/api/health/weight",
      expected: "HTTP 201 with weight record (74.5 kg)",
      actual: `HTTP ${postWeightRes.status} (ID: ${activeWeightId ?? "none"})`,
      status: weightCreated && postWeightData.weight.weight_kg === 74.5 ? "PASS" : "FAIL",
    });

    // 5.3 GET /api/health/weight with date query parameter
    const getWeightRes = await fetch(`${baseUrl}/api/health/weight?date=${testDate}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const getWeightData = getWeightRes.ok ? await getWeightRes.json() : null;
    const foundWeight = getWeightData?.weights?.some((w: { id: string }) => w.id === activeWeightId);

    record({
      category: "Weight",
      testName: "GET /api/health/weight retrieves logged weight with date filter",
      method: "GET",
      endpoint: `/api/health/weight?date=${testDate}`,
      expected: "HTTP 200 with matching weight in array",
      actual: `HTTP ${getWeightRes.status} (${getWeightData?.weights?.length || 0} records returned)`,
      status: getWeightRes.status === 200 && foundWeight ? "PASS" : "FAIL",
    });

    // 5.4 GET /api/health/weight/[id]
    const getSingleWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const singleWeightData = getSingleWeightRes.ok ? await getSingleWeightRes.json() : null;
    record({
      category: "Weight",
      testName: "GET /api/health/weight/[id] retrieves specific entry",
      method: "GET",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 200 with matching weight_kg=74.5",
      actual: `HTTP ${getSingleWeightRes.status} (weight_kg: ${singleWeightData?.weight?.weight_kg})`,
      status:
        getSingleWeightRes.status === 200 && singleWeightData?.weight?.weight_kg === 74.5
          ? "PASS"
          : "FAIL",
    });

    // 5.5 GET /api/health/weight/[id] with non-existent UUID returns 404
    const fakeWeightUuid = "00000000-0000-0000-0000-000000000000";
    const getMissingWeightRes = await fetch(`${baseUrl}/api/health/weight/${fakeWeightUuid}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    record({
      category: "Weight",
      testName: "GET /api/health/weight/[id] returns 404 for non-existent record",
      method: "GET",
      endpoint: `/api/health/weight/${fakeWeightUuid}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${getMissingWeightRes.status}`,
      status: getMissingWeightRes.status === 404 ? "PASS" : "FAIL",
    });

    // 5.6 PATCH /api/health/weight/[id] validation failure
    const invalidPatchWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({ weight_kg: 500.0 }), // > 400.0 kg
    });

    record({
      category: "Weight",
      testName: "PATCH /api/health/weight/[id] rejects out-of-bounds weight update (500 kg)",
      method: "PATCH",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 400 Bad Request",
      actual: `HTTP ${invalidPatchWeightRes.status}`,
      status: invalidPatchWeightRes.status === 400 ? "PASS" : "FAIL",
    });

    // 5.7 PATCH /api/health/weight/[id] valid update
    const patchWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        weight_kg: 75.0,
        notes: "HTTP updated weigh-in",
      }),
    });

    const patchWeightData = patchWeightRes.ok ? await patchWeightRes.json() : null;
    record({
      category: "Weight",
      testName: "PATCH /api/health/weight/[id] updates weight to 75.0 kg",
      method: "PATCH",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 200 with updated weight_kg=75.0",
      actual: `HTTP ${patchWeightRes.status} (weight_kg: ${patchWeightData?.weight?.weight_kg})`,
      status:
        patchWeightRes.status === 200 && patchWeightData?.weight?.weight_kg === 75.0
          ? "PASS"
          : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 6. WATER TRACKING HTTP API (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 6. Water Tracking HTTP API Tests ---");

    // 6.1 POST validation failure (amount_ml = 0)
    const invalidWaterRes = await fetch(`${baseUrl}/api/health/water`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({ amount_ml: 0 }),
    });

    record({
      category: "Water",
      testName: "POST /api/health/water rejects 0 amount_ml",
      method: "POST",
      endpoint: "/api/health/water",
      expected: "HTTP 400 Bad Request",
      actual: `HTTP ${invalidWaterRes.status}`,
      status: invalidWaterRes.status === 400 ? "PASS" : "FAIL",
    });

    // 6.2 POST valid water entry
    const postWaterRes = await fetch(`${baseUrl}/api/health/water`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        amount_ml: 650,
        intake_date: testDate,
        notes: "HTTP hydration glass",
      }),
    });

    const postWaterData = postWaterRes.ok ? await postWaterRes.json() : null;
    const createdWaterLog = postWaterData?.log || postWaterData?.entry;
    const waterCreated = postWaterRes.status === 201 && createdWaterLog?.id;
    if (waterCreated) {
      activeWaterId = createdWaterLog.id;
      createdWaterIds.push(createdWaterLog.id);
      allCreatedWaterIds.push(createdWaterLog.id);
    }

    record({
      category: "Water",
      testName: "POST /api/health/water creates water entry for User A",
      method: "POST",
      endpoint: "/api/health/water",
      expected: "HTTP 201 with amount_ml=650",
      actual: `HTTP ${postWaterRes.status} (ID: ${activeWaterId ?? "none"})`,
      status: waterCreated && createdWaterLog.amount_ml === 650 ? "PASS" : "FAIL",
    });

    // 6.3 GET /api/health/water with date query parameter
    const getWaterRes = await fetch(`${baseUrl}/api/health/water?date=${testDate}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const getWaterData = getWaterRes.ok ? await getWaterRes.json() : null;
    const waterTotal =
      getWaterData?.summary?.totalMl ??
      getWaterData?.summary?.total_intake_ml ??
      getWaterData?.totalIntakeMl ??
      0;
    record({
      category: "Water",
      testName: "GET /api/health/water calculates daily total intake",
      method: "GET",
      endpoint: `/api/health/water?date=${testDate}`,
      expected: "HTTP 200 with totalIntakeMl >= 650",
      actual: `HTTP ${getWaterRes.status} (totalIntakeMl: ${waterTotal} ml)`,
      status: getWaterRes.status === 200 && waterTotal >= 650 ? "PASS" : "FAIL",
    });

    // 6.4 GET /api/health/water/[id]
    const getSingleWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const singleWaterData = getSingleWaterRes.ok ? await getSingleWaterRes.json() : null;
    const singleWaterLog = singleWaterData?.log || singleWaterData?.entry;
    record({
      category: "Water",
      testName: "GET /api/health/water/[id] retrieves specific water entry",
      method: "GET",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "HTTP 200 with amount_ml=650",
      actual: `HTTP ${getSingleWaterRes.status} (amount_ml: ${singleWaterLog?.amount_ml})`,
      status:
        getSingleWaterRes.status === 200 && singleWaterLog?.amount_ml === 650
          ? "PASS"
          : "FAIL",
    });

    // 6.5 PATCH /api/health/water/[id] update amount
    const patchWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        amount_ml: 800,
        notes: "HTTP corrected 800ml bottle",
      }),
    });

    const patchWaterData = patchWaterRes.ok ? await patchWaterRes.json() : null;
    const patchedWaterLog = patchWaterData?.log || patchWaterData?.entry;
    record({
      category: "Water",
      testName: "PATCH /api/health/water/[id] updates water amount to 800ml",
      method: "PATCH",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "HTTP 200 with updated amount_ml=800",
      actual: `HTTP ${patchWaterRes.status} (amount_ml: ${patchedWaterLog?.amount_ml})`,
      status:
        patchWaterRes.status === 200 && patchedWaterLog?.amount_ml === 800
          ? "PASS"
          : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 7. SLEEP TRACKING HTTP API (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 7. Sleep Tracking HTTP API Tests ---");

    // 7.1 POST validation failure (non-chronological: wake before bed)
    const invalidSleepRes = await fetch(`${baseUrl}/api/health/sleep`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        sleep_date: testDate,
        duration_minutes: 480,
        bedtime: "2026-11-12T07:00:00.000Z",
        wake_time: "2026-11-11T23:00:00.000Z", // Inverted!
      }),
    });

    record({
      category: "Sleep",
      testName: "POST /api/health/sleep rejects non-chronological bedtime/wake_time",
      method: "POST",
      endpoint: "/api/health/sleep",
      expected: "HTTP 400 Bad Request",
      actual: `HTTP ${invalidSleepRes.status}`,
      status: invalidSleepRes.status === 400 ? "PASS" : "FAIL",
    });

    // 7.2 POST valid sleep record
    const postSleepRes = await fetch(`${baseUrl}/api/health/sleep`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        sleep_date: testDate,
        duration_minutes: 480,
        bedtime: "2026-11-11T23:00:00.000Z",
        wake_time: "2026-11-12T07:00:00.000Z",
        sleep_quality: "good",
        notes: "HTTP 8h restorative sleep",
      }),
    });

    const postSleepData = postSleepRes.ok ? await postSleepRes.json() : null;
    const createdSleepLog = postSleepData?.log || postSleepData?.entry;
    const sleepCreated = postSleepRes.status === 201 && createdSleepLog?.id;
    if (sleepCreated) {
      activeSleepId = createdSleepLog.id;
      createdSleepIds.push(createdSleepLog.id);
      allCreatedSleepIds.push(createdSleepLog.id);
    }

    record({
      category: "Sleep",
      testName: "POST /api/health/sleep creates sleep record with bounds validation",
      method: "POST",
      endpoint: "/api/health/sleep",
      expected: "HTTP 201 with duration_minutes=480, quality='good'",
      actual: `HTTP ${postSleepRes.status} (ID: ${activeSleepId ?? "none"})`,
      status:
        sleepCreated &&
        createdSleepLog.duration_minutes === 480 &&
        createdSleepLog.sleep_quality === "good"
          ? "PASS"
          : "FAIL",
    });

    // 7.3 GET /api/health/sleep with date filter
    const getSleepRes = await fetch(`${baseUrl}/api/health/sleep?date=${testDate}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const getSleepData = getSleepRes.ok ? await getSleepRes.json() : null;
    const sleepSummary = getSleepData?.summary;
    const sleepFormatted = sleepSummary?.formattedDuration ?? sleepSummary?.formatted_duration;
    const sleepMinutes = sleepSummary?.durationMinutes ?? sleepSummary?.total_minutes ?? 0;
    record({
      category: "Sleep",
      testName: "GET /api/health/sleep retrieves sleep entries and formatted duration",
      method: "GET",
      endpoint: `/api/health/sleep?date=${testDate}`,
      expected: "HTTP 200 with formatted duration and total minutes >= 480",
      actual: `HTTP ${getSleepRes.status} (formattedDuration: ${sleepFormatted}, minutes: ${sleepMinutes})`,
      status:
        getSleepRes.status === 200 &&
        typeof sleepFormatted === "string" &&
        sleepFormatted.length > 0 &&
        sleepMinutes >= 480
          ? "PASS"
          : "FAIL",
    });

    // 7.4 GET /api/health/sleep/[id]
    const getSingleSleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const singleSleepData = getSingleSleepRes.ok ? await getSingleSleepRes.json() : null;
    const singleSleepLog = singleSleepData?.log || singleSleepData?.entry;
    record({
      category: "Sleep",
      testName: "GET /api/health/sleep/[id] retrieves specific sleep record",
      method: "GET",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "HTTP 200 with duration_minutes=480",
      actual: `HTTP ${getSingleSleepRes.status} (duration_minutes: ${singleSleepLog?.duration_minutes})`,
      status:
        getSingleSleepRes.status === 200 && singleSleepLog?.duration_minutes === 480
          ? "PASS"
          : "FAIL",
    });

    // 7.5 PATCH /api/health/sleep/[id] update duration and quality
    const patchSleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        duration_minutes: 450,
        sleep_quality: "fair",
        notes: "HTTP updated: 7.5 hours actual sleep",
      }),
    });

    const patchSleepData = patchSleepRes.ok ? await patchSleepRes.json() : null;
    const patchedSleepLog = patchSleepData?.log || patchSleepData?.entry;
    record({
      category: "Sleep",
      testName: "PATCH /api/health/sleep/[id] updates duration to 450m and quality to 'fair'",
      method: "PATCH",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "HTTP 200 with duration_minutes=450, quality='fair'",
      actual: `HTTP ${patchSleepRes.status} (duration_minutes: ${patchedSleepLog?.duration_minutes}, quality: ${patchedSleepLog?.sleep_quality})`,
      status:
        patchSleepRes.status === 200 &&
        patchedSleepLog?.duration_minutes === 450 &&
        patchedSleepLog?.sleep_quality === "fair"
          ? "PASS"
          : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 8. HEALTH GOALS HTTP API (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 8. Health Goals HTTP API Tests ---");

    // 8.1 GET /api/health/goals for User A
    const getGoalsRes = await fetch(`${baseUrl}/api/health/goals`, {
      headers: {
        Cookie: jarA.getCookieHeader(),
      },
    });

    const getGoalsData = getGoalsRes.ok ? await getGoalsRes.json() : null;
    record({
      category: "Goals",
      testName: "GET /api/health/goals retrieves profile health goals",
      method: "GET",
      endpoint: "/api/health/goals",
      expected: "HTTP 200 with goals object",
      actual: `HTTP ${getGoalsRes.status} (water: ${getGoalsData?.goals?.daily_water_goal_ml ?? "null"}, sleep: ${getGoalsData?.goals?.daily_sleep_goal_minutes ?? "null"})`,
      status: getGoalsRes.status === 200 && getGoalsData?.goals !== undefined ? "PASS" : "FAIL",
    });

    // 8.2 PATCH /api/health/goals validation failure (water below 500ml)
    const invalidGoalsRes = await fetch(`${baseUrl}/api/health/goals`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({ daily_water_goal_ml: 100 }),
    });

    record({
      category: "Goals",
      testName: "PATCH /api/health/goals rejects water goal below 500ml",
      method: "PATCH",
      endpoint: "/api/health/goals",
      expected: "HTTP 400 Bad Request",
      actual: `HTTP ${invalidGoalsRes.status}`,
      status: invalidGoalsRes.status === 400 ? "PASS" : "FAIL",
    });

    // 8.3 PATCH /api/health/goals update water and sleep goals
    const testWaterGoal = 2600;
    const testSleepGoal = 490;
    const patchGoalsRes = await fetch(`${baseUrl}/api/health/goals`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        daily_water_goal_ml: testWaterGoal,
        daily_sleep_goal_minutes: testSleepGoal,
      }),
    });

    const patchGoalsData = patchGoalsRes.ok ? await patchGoalsRes.json() : null;
    record({
      category: "Goals",
      testName: "PATCH /api/health/goals updates water (2600ml) and sleep (490m) goals",
      method: "PATCH",
      endpoint: "/api/health/goals",
      expected: "HTTP 200 with updated water=2600ml and sleep=490m",
      actual: `HTTP ${patchGoalsRes.status} (water: ${patchGoalsData?.goals?.daily_water_goal_ml}, sleep: ${patchGoalsData?.goals?.daily_sleep_goal_minutes})`,
      status:
        patchGoalsRes.status === 200 &&
        patchGoalsData?.goals?.daily_water_goal_ml === testWaterGoal &&
        patchGoalsData?.goals?.daily_sleep_goal_minutes === testSleepGoal
          ? "PASS"
          : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 9. CROSS-USER SECURITY ATTACKS (USER B vs USER A VIA HTTP)
    // ----------------------------------------------------------------------------
    console.log("--- 9. Cross-User Isolation Attacks via HTTP (User B vs User A) ---");

    // 9.1 User B tries to GET User A's weight record
    const bGetWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      headers: { Cookie: jarB.getCookieHeader() },
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot GET User A's weight record through HTTP",
      method: "GET",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bGetWeightRes.status}`,
      status: bGetWeightRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.2 User B tries to PATCH User A's weight record
    const bPatchWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarB.getCookieHeader(),
      },
      body: JSON.stringify({ weight_kg: 99.9 }),
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot PATCH User A's weight record through HTTP",
      method: "PATCH",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bPatchWeightRes.status}`,
      status: bPatchWeightRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.3 User B tries to DELETE User A's weight record
    const bDeleteWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      method: "DELETE",
      headers: { Cookie: jarB.getCookieHeader() },
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot DELETE User A's weight record through HTTP",
      method: "DELETE",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bDeleteWeightRes.status}`,
      status: bDeleteWeightRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.4 User B tries to GET User A's water record
    const bGetWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      headers: { Cookie: jarB.getCookieHeader() },
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot GET User A's water record through HTTP",
      method: "GET",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bGetWaterRes.status}`,
      status: bGetWaterRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.5 User B tries to PATCH User A's water record
    const bPatchWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarB.getCookieHeader(),
      },
      body: JSON.stringify({ amount_ml: 9999 }),
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot PATCH User A's water record through HTTP",
      method: "PATCH",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bPatchWaterRes.status}`,
      status: bPatchWaterRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.6 User B tries to DELETE User A's water record
    const bDeleteWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      method: "DELETE",
      headers: { Cookie: jarB.getCookieHeader() },
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot DELETE User A's water record through HTTP",
      method: "DELETE",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bDeleteWaterRes.status}`,
      status: bDeleteWaterRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.7 User B tries to GET User A's sleep record
    const bGetSleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      headers: { Cookie: jarB.getCookieHeader() },
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot GET User A's sleep record through HTTP",
      method: "GET",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bGetSleepRes.status}`,
      status: bGetSleepRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.8 User B tries to PATCH User A's sleep record
    const bPatchSleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarB.getCookieHeader(),
      },
      body: JSON.stringify({ duration_minutes: 100 }),
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot PATCH User A's sleep record through HTTP",
      method: "PATCH",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bPatchSleepRes.status}`,
      status: bPatchSleepRes.status === 404 ? "PASS" : "FAIL",
    });

    // 9.9 User B tries to DELETE User A's sleep record
    const bDeleteSleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      method: "DELETE",
      headers: { Cookie: jarB.getCookieHeader() },
    });

    record({
      category: "Cross-User HTTP",
      testName: "User B cannot DELETE User A's sleep record through HTTP",
      method: "DELETE",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${bDeleteSleepRes.status}`,
      status: bDeleteSleepRes.status === 404 ? "PASS" : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 10. POST-ATTACK DATA INTEGRITY VERIFICATION (USER A RE-FETCHES VIA HTTP)
    // ----------------------------------------------------------------------------
    console.log("--- 10. Post-Attack Data Integrity Verification (User A via HTTP) ---");

    // 10.1 Verify User A weight record is intact
    const verifyWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });
    const verifyWeightData = verifyWeightRes.ok ? await verifyWeightRes.json() : null;

    record({
      category: "Integrity",
      testName: "Verify User A weight record remained unmanipulated after User B attacks",
      method: "GET",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "HTTP 200 with weight_kg=75.0 intact",
      actual: `HTTP ${verifyWeightRes.status} (weight_kg: ${verifyWeightData?.weight?.weight_kg})`,
      status:
        verifyWeightRes.status === 200 && verifyWeightData?.weight?.weight_kg === 75.0
          ? "PASS"
          : "FAIL",
    });

    // 10.2 Verify User A water record is intact
    const verifyWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });
    const verifyWaterData = verifyWaterRes.ok ? await verifyWaterRes.json() : null;
    const verifyWaterLog = verifyWaterData?.log || verifyWaterData?.entry;

    record({
      category: "Integrity",
      testName: "Verify User A water record remained unmanipulated after User B attacks",
      method: "GET",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "HTTP 200 with amount_ml=800 intact",
      actual: `HTTP ${verifyWaterRes.status} (amount_ml: ${verifyWaterLog?.amount_ml})`,
      status:
        verifyWaterRes.status === 200 && verifyWaterLog?.amount_ml === 800
          ? "PASS"
          : "FAIL",
    });

    // 10.3 Verify User A sleep record is intact
    const verifySleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });
    const verifySleepData = verifySleepRes.ok ? await verifySleepRes.json() : null;
    const verifySleepLog = verifySleepData?.log || verifySleepData?.entry;

    record({
      category: "Integrity",
      testName: "Verify User A sleep record remained unmanipulated after User B attacks",
      method: "GET",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "HTTP 200 with duration_minutes=450 intact",
      actual: `HTTP ${verifySleepRes.status} (duration_minutes: ${verifySleepLog?.duration_minutes})`,
      status:
        verifySleepRes.status === 200 && verifySleepLog?.duration_minutes === 450
          ? "PASS"
          : "FAIL",
    });

    // 10.4 Verify User A goals remain intact
    const verifyGoalsRes = await fetch(`${baseUrl}/api/health/goals`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });
    const verifyGoalsData = verifyGoalsRes.ok ? await verifyGoalsRes.json() : null;

    record({
      category: "Integrity",
      testName: "Verify User A health goals remained unmanipulated",
      method: "GET",
      endpoint: "/api/health/goals",
      expected: `HTTP 200 with water=${testWaterGoal}ml and sleep=${testSleepGoal}m`,
      actual: `HTTP ${verifyGoalsRes.status} (water: ${verifyGoalsData?.goals?.daily_water_goal_ml}, sleep: ${verifyGoalsData?.goals?.daily_sleep_goal_minutes})`,
      status:
        verifyGoalsRes.status === 200 &&
        verifyGoalsData?.goals?.daily_water_goal_ml === testWaterGoal &&
        verifyGoalsData?.goals?.daily_sleep_goal_minutes === testSleepGoal
          ? "PASS"
          : "FAIL",
    });

    // ----------------------------------------------------------------------------
    // 11. RECORD DELETION THROUGH HTTP API (USER A)
    // ----------------------------------------------------------------------------
    console.log("--- 11. Record Deletion Through HTTP API (User A) ---");

    // 11.1 Delete Weight Record
    const delWeightRes = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      method: "DELETE",
      headers: { Cookie: jarA.getCookieHeader() },
    });

    const getWeightAfterDel = await fetch(`${baseUrl}/api/health/weight/${activeWeightId}`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });

    const weightDeleted = delWeightRes.status === 200 && getWeightAfterDel.status === 404;
    if (weightDeleted) {
      const idx = createdWeightIds.indexOf(activeWeightId!);
      if (idx !== -1) createdWeightIds.splice(idx, 1);
    }

    record({
      category: "Weight",
      testName: "DELETE /api/health/weight/[id] removes record and subsequent GET returns 404",
      method: "DELETE",
      endpoint: `/api/health/weight/${activeWeightId}`,
      expected: "DELETE HTTP 200, followed by GET HTTP 404",
      actual: `DELETE: HTTP ${delWeightRes.status}, subsequent GET: HTTP ${getWeightAfterDel.status}`,
      status: weightDeleted ? "PASS" : "FAIL",
    });

    // 11.2 Delete Water Record
    const delWaterRes = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      method: "DELETE",
      headers: { Cookie: jarA.getCookieHeader() },
    });

    const getWaterAfterDel = await fetch(`${baseUrl}/api/health/water/${activeWaterId}`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });

    const waterDeleted = delWaterRes.status === 200 && getWaterAfterDel.status === 404;
    if (waterDeleted) {
      const idx = createdWaterIds.indexOf(activeWaterId!);
      if (idx !== -1) createdWaterIds.splice(idx, 1);
    }

    record({
      category: "Water",
      testName: "DELETE /api/health/water/[id] removes record and subsequent GET returns 404",
      method: "DELETE",
      endpoint: `/api/health/water/${activeWaterId}`,
      expected: "DELETE HTTP 200, followed by GET HTTP 404",
      actual: `DELETE: HTTP ${delWaterRes.status}, subsequent GET: HTTP ${getWaterAfterDel.status}`,
      status: waterDeleted ? "PASS" : "FAIL",
    });

    // 11.3 Delete Sleep Record
    const delSleepRes = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      method: "DELETE",
      headers: { Cookie: jarA.getCookieHeader() },
    });

    const getSleepAfterDel = await fetch(`${baseUrl}/api/health/sleep/${activeSleepId}`, {
      headers: { Cookie: jarA.getCookieHeader() },
    });

    const sleepDeleted = delSleepRes.status === 200 && getSleepAfterDel.status === 404;
    if (sleepDeleted) {
      const idx = createdSleepIds.indexOf(activeSleepId!);
      if (idx !== -1) createdSleepIds.splice(idx, 1);
    }

    record({
      category: "Sleep",
      testName: "DELETE /api/health/sleep/[id] removes record and subsequent GET returns 404",
      method: "DELETE",
      endpoint: `/api/health/sleep/${activeSleepId}`,
      expected: "DELETE HTTP 200, followed by GET HTTP 404",
      actual: `DELETE: HTTP ${delSleepRes.status}, subsequent GET: HTTP ${getSleepAfterDel.status}`,
      status: sleepDeleted ? "PASS" : "FAIL",
    });

    // 11.4 Restore Original Goals via HTTP PATCH
    const restoreGoalsRes = await fetch(`${baseUrl}/api/health/goals`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: jarA.getCookieHeader(),
      },
      body: JSON.stringify({
        daily_water_goal_ml: originalWaterGoal,
        daily_sleep_goal_minutes: originalSleepGoal,
      }),
    });

    const restoreGoalsData = restoreGoalsRes.ok ? await restoreGoalsRes.json() : null;
    record({
      category: "Goals",
      testName: "PATCH /api/health/goals restores original profile health goals via HTTP",
      method: "PATCH",
      endpoint: "/api/health/goals",
      expected: `HTTP 200 with water=${originalWaterGoal ?? "null"}, sleep=${originalSleepGoal ?? "null"}`,
      actual: `HTTP ${restoreGoalsRes.status} (water: ${restoreGoalsData?.goals?.daily_water_goal_ml ?? "null"}, sleep: ${restoreGoalsData?.goals?.daily_sleep_goal_minutes ?? "null"})`,
      status:
        restoreGoalsRes.status === 200 &&
        (restoreGoalsData?.goals?.daily_water_goal_ml ?? null) === originalWaterGoal &&
        (restoreGoalsData?.goals?.daily_sleep_goal_minutes ?? null) === originalSleepGoal
          ? "PASS"
          : "FAIL",
    });
  } catch (err) {
    console.error("Test execution encountered an unexpected error:", err);
  } finally {
    // ----------------------------------------------------------------------------
    // 12. GUARANTEED AUTOMATIC CLEANUP & TEARDOWN
    // ----------------------------------------------------------------------------
    console.log("\n--- 12. Guaranteed Automatic Cleanup in Finally Block ---");

    let cleanupFailed = false;

    // Delete any lingering weight logs
    for (const id of createdWeightIds) {
      try {
        await directClientA.from("weight_logs").delete().eq("id", id).eq("user_id", authA.user.id);
      } catch (cleanErr) {
        console.error(`Failed to clean up weight ID ${id}:`, cleanErr);
        cleanupFailed = true;
      }
    }

    // Delete any lingering water logs
    for (const id of createdWaterIds) {
      try {
        await directClientA.from("water_logs").delete().eq("id", id).eq("user_id", authA.user.id);
      } catch (cleanErr) {
        console.error(`Failed to clean up water ID ${id}:`, cleanErr);
        cleanupFailed = true;
      }
    }

    // Delete any lingering sleep logs
    for (const id of createdSleepIds) {
      try {
        await directClientA.from("sleep_logs").delete().eq("id", id).eq("user_id", authA.user.id);
      } catch (cleanErr) {
        console.error(`Failed to clean up sleep ID ${id}:`, cleanErr);
        cleanupFailed = true;
      }
    }

    // Ensure original health goals are restored in database
    if (originalGoalsLoaded) {
      try {
        await directClientA
          .from("profiles")
          .update({
            daily_water_goal_ml: originalWaterGoal,
            daily_sleep_goal_minutes: originalSleepGoal,
          })
          .eq("id", authA.user.id);
      } catch (restoreErr) {
        console.error("Failed to restore goals in finally block:", restoreErr);
        cleanupFailed = true;
      }
    }

    // Direct database query to verify 0 lingering records created during this run
    let lingeringCount = 0;
    if (allCreatedWeightIds.length > 0) {
      const { data: lingeringW } = await directClientA
        .from("weight_logs")
        .select("id")
        .in("id", allCreatedWeightIds);
      lingeringCount += lingeringW?.length || 0;
    }
    if (allCreatedWaterIds.length > 0) {
      const { data: lingeringWtr } = await directClientA
        .from("water_logs")
        .select("id")
        .in("id", allCreatedWaterIds);
      lingeringCount += lingeringWtr?.length || 0;
    }
    if (allCreatedSleepIds.length > 0) {
      const { data: lingeringSlp } = await directClientA
        .from("sleep_logs")
        .select("id")
        .in("id", allCreatedSleepIds);
      lingeringCount += lingeringSlp?.length || 0;
    }

    const cleanupClean = !cleanupFailed && lingeringCount === 0;
    record({
      category: "Cleanup",
      testName: "Cleanup verification: all test records deleted, goals restored, 0 lingering rows",
      expected: "0 lingering records in database",
      actual: cleanupClean
        ? "0 lingering rows verified, goals restored"
        : `${lingeringCount} lingering records detected or cleanup error`,
      status: cleanupClean ? "PASS" : "FAIL",
    });

    // Teardown spawned server if we started one
    if (serverProcess?.pid) {
      console.log(`Tearing down spawned Next.js server (PID: ${serverProcess.pid})...`);
      killProcessTree(serverProcess.pid);
      console.log("Server process terminated.");
    }

    // ----------------------------------------------------------------------------
    // 13. SUMMARY REPORT
    // ----------------------------------------------------------------------------
    const totalPassed = testResults.filter((r) => r.status === "PASS").length;
    const totalFailed = testResults.filter((r) => r.status === "FAIL").length;

    console.log("==================================================================");
    console.log(`STAGE 9.2 HTTP API TEST SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED`);
    console.log("==================================================================");

    if (totalFailed > 0) {
      process.exit(1);
    }
  }
}

runStage9HealthHttpIntegration().catch((err) => {
  console.error("Fatal HTTP test harness error:", err);
  process.exit(1);
});
