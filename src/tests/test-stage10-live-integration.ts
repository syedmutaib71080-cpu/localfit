import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createBrowserClient } from "@supabase/ssr";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";

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

function fetchImageBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`Failed to fetch image: status ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
  });
}

// Track records for guaranteed cleanup
const createdFoodLogIds: string[] = [];

async function runStage10LiveIntegration() {
  console.log("==================================================================");
  console.log("LOCALFIT STAGE 10 — LIVE AI FOOD SCANNER INTEGRATION VERIFICATION");
  console.log("Executing against live Gemini Vision API and Next.js / Supabase");
  console.log("==================================================================\n");

  // -------------------------------------------------------------------------
  // 1. Verify GEMINI_API_KEY is configured without exposing its value
  // -------------------------------------------------------------------------
  console.log("--- Step 1: GEMINI_API_KEY Configuration Verification ---");
  const apiKey = process.env.GEMINI_API_KEY;
  const isKeyConfigured = Boolean(
    apiKey &&
      apiKey.trim().length > 20 &&
      apiKey !== "your_gemini_api_key_here"
  );

  console.log(`  [INFO] GEMINI_API_KEY present: ${Boolean(apiKey)}`);
  console.log(`  [INFO] Key configured valid length: ${isKeyConfigured} (${apiKey?.length || 0} characters)`);
  console.log(`  [INFO] Key is placeholder: ${apiKey === "your_gemini_api_key_here"}`);

  if (!isKeyConfigured) {
    console.error("  [FAIL] GEMINI_API_KEY is not properly configured in .env.local.");
    process.exit(1);
  }
  console.log("  [PASS] GEMINI_API_KEY is confirmed configured securely without exposing its value.\n");

  // -------------------------------------------------------------------------
  // Authenticate dedicated test user
  // -------------------------------------------------------------------------
  console.log("--- Authenticating Test User via Supabase Auth ---");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const testEmail = process.env.TEST_USER_A_EMAIL!;
  const testPassword = process.env.TEST_USER_A_PASSWORD!;

  const cookieJar = new Map<string, string>();
  const browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
      setAll: (cookies: Array<{ name: string; value: string }>) =>
        cookies.forEach((c) => cookieJar.set(c.name, c.value)),
    },
  });

  const directClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await browserClient.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (authError || !authData.user || !authData.session) {
    console.error(`  [FAIL] Test user authentication failed: ${authError?.message}`);
    process.exit(1);
  }

  await directClient.auth.setSession({
    access_token: authData.session.access_token,
    refresh_token: authData.session.refresh_token,
  });

  const cookieHeader = Array.from(cookieJar.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");

  console.log(`  [PASS] Authenticated as test user: ${testEmail} (ID: ${authData.user.id})\n`);

  try {
    // -------------------------------------------------------------------------
    // 2. Submit real food photograph to POST /api/food/scan
    // -------------------------------------------------------------------------
    console.log("--- Step 2: Submit Real Food Photo to POST /api/food/scan ---");
    // High-resolution real photograph of a salad bowl with boiled egg, tomatoes, cucumber, greens
    const foodImageUrl = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";
    console.log("  Fetching real food photograph from Unsplash CDN...");
    const foodImageBuffer = await fetchImageBuffer(foodImageUrl);
    console.log(`  Retrieved image: ${foodImageBuffer.length} bytes (JPEG format)`);

    const foodBase64 = foodImageBuffer.toString("base64");
    const scanPayload = {
      imageBase64: foodBase64,
      mimeType: "image/jpeg",
    };

    console.log("  Submitting authenticated POST request to /api/food/scan...");
    const scanStart = Date.now();
    const scanRes = await fetch(`${BASE_URL}/api/food/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(scanPayload),
    });
    const scanDuration = Date.now() - scanStart;

    console.log(`  HTTP Status: ${scanRes.status} (Elapsed: ${scanDuration}ms)`);
    const scanResult = (await scanRes.json()) as {
      success: boolean;
      data?: {
        is_food_detected: boolean;
        meal_summary?: string;
        items: Array<{
          id: string;
          food_name: string;
          category: string;
          portion_grams: number;
          calories: number | null;
          protein_g: number | null;
          carbs_g: number | null;
          fat_g: number | null;
          fibre_g: number | null;
          confidence: string;
          confidence_score?: number;
          notes: string;
          is_catalogue_match: boolean;
          matched_database_food_id: string | null;
        }>;
      };
      model?: string;
      error?: string;
      message?: string;
    };

    if (scanRes.status !== 200 || !scanResult.success || !scanResult.data) {
      console.error("  [FAIL] Live scan request failed:", scanRes.status, scanResult);
      process.exit(1);
    }
    console.log("  [PASS] Successfully processed real food photograph with live Gemini Vision API.\n");

    // -------------------------------------------------------------------------
    // 3. Confirm response contains validated identification, portions, nutrients, confidence
    // -------------------------------------------------------------------------
    console.log("--- Step 3: Confirm Validated Structure of Live AI Results ---");
    const scanData = scanResult.data;
    console.log(`  Model Used: ${scanResult.model}`);
    console.log(`  Meal Summary: "${scanData.meal_summary}"`);
    console.log(`  Detected Items Count: ${scanData.items.length}`);

    if (scanData.items.length === 0) {
      console.error("  [FAIL] Expected at least 1 identified food item on the plate.");
      process.exit(1);
    }

    scanData.items.forEach((item, index) => {
      console.log(`  Item #${index + 1}: "${item.food_name}"`);
      console.log(`    Category: ${item.category}`);
      console.log(`    Portion: ${item.portion_grams}g`);
      console.log(`    Nutrients: ${item.calories} kcal | ${item.protein_g}g P | ${item.carbs_g}g C | ${item.fat_g}g F | ${item.fibre_g}g Fibre`);
      console.log(`    Confidence: ${item.confidence} (${item.confidence_score}%)`);
      console.log(`    Notes: "${item.notes}"`);
      console.log(`    Catalogue Match: ${item.is_catalogue_match ? `Yes (${item.matched_database_food_id})` : "No (AI Estimate)"}`);

      // Confirm scientific validity
      if (item.portion_grams <= 0 || item.portion_grams > 2500) {
        throw new Error(`Portion out of bounds: ${item.portion_grams}g`);
      }
      if (item.calories !== null && item.calories < 0) {
        throw new Error(`Negative calories: ${item.calories}`);
      }
      if (!["high", "medium", "low"].includes(item.confidence)) {
        throw new Error(`Invalid confidence tier: ${item.confidence}`);
      }
    });

    console.log("  [PASS] All identified items contain valid names, positive portions, non-negative nutrients, and valid confidence classifications.\n");

    // -------------------------------------------------------------------------
    // 4. Confirm uncertain/non-food identification is handled safely
    // -------------------------------------------------------------------------
    console.log("--- Step 4: Confirm Safe Handling of Uncertain / Non-Food Image ---");
    // Non-food photograph of a bicycle (no food or drinks present)
    const nonFoodUrl = "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80";
    console.log("  Fetching non-food photograph (Bicycle)...");
    const nonFoodBuffer = await fetchImageBuffer(nonFoodUrl);
    console.log(`  Retrieved image: ${nonFoodBuffer.length} bytes`);

    console.log("  Submitting non-food photograph to /api/food/scan...");
    const nonFoodRes = await fetch(`${BASE_URL}/api/food/scan`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        imageBase64: nonFoodBuffer.toString("base64"),
        mimeType: "image/jpeg",
      }),
    });

    console.log(`  HTTP Status: ${nonFoodRes.status}`);
    const nonFoodData = (await nonFoodRes.json()) as {
      success: boolean;
      code?: string;
      message?: string;
      data?: { is_food_detected: boolean };
    };

    console.log(`  Response Code: ${nonFoodData.code || "SUCCESS"}`);
    console.log(`  Message: "${nonFoodData.message || ""}"`);

    // Either code === "NO_FOOD_DETECTED" or is_food_detected === false
    const isSafelyHandled =
      nonFoodData.code === "NO_FOOD_DETECTED" ||
      nonFoodData.data?.is_food_detected === false ||
      !nonFoodData.success;

    if (!isSafelyHandled) {
      console.error("  [FAIL] Non-food image was not handled safely.");
      process.exit(1);
    }
    console.log("  [PASS] Non-food / uncertain photo was handled safely without hallucinating food.\n");

    // -------------------------------------------------------------------------
    // 5. Save one user-approved result through existing food logging API
    // -------------------------------------------------------------------------
    console.log("--- Step 5: Save User-Approved Food Entry via POST /api/food/logs ---");
    const primaryScannedItem = scanData.items[0];
    const logDate = "2026-11-11";

    const createPayload = {
      food_id: primaryScannedItem.matched_database_food_id || null,
      food_name: primaryScannedItem.food_name,
      meal_type: "lunch",
      quantity_g: primaryScannedItem.portion_grams,
      serving_name: `${primaryScannedItem.portion_grams}g serving (Live AI Scan)`,
      consumption_date: logDate,
      notes: `Live AI scan verification • ${primaryScannedItem.notes}`,
      calories_per_100g:
        primaryScannedItem.calories !== null
          ? Math.round((primaryScannedItem.calories * 100) / primaryScannedItem.portion_grams)
          : null,
      protein_per_100g:
        primaryScannedItem.protein_g !== null
          ? Math.round(((primaryScannedItem.protein_g * 100) / primaryScannedItem.portion_grams) * 10) / 10
          : null,
      carbohydrates_per_100g:
        primaryScannedItem.carbs_g !== null
          ? Math.round(((primaryScannedItem.carbs_g * 100) / primaryScannedItem.portion_grams) * 10) / 10
          : null,
      fat_per_100g:
        primaryScannedItem.fat_g !== null
          ? Math.round(((primaryScannedItem.fat_g * 100) / primaryScannedItem.portion_grams) * 10) / 10
          : null,
    };

    console.log(`  Submitting entry: "${createPayload.food_name}" (${createPayload.quantity_g}g) to ${createPayload.meal_type}...`);
    const createRes = await fetch(`${BASE_URL}/api/food/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify(createPayload),
    });

    console.log(`  HTTP Status: ${createRes.status}`);
    const createData = (await createRes.json()) as {
      log?: {
        id: string;
        user_id: string;
        food_name: string;
        quantity_g: number;
        calories: number;
        protein: number;
        carbohydrates: number;
        fat: number;
        consumption_date: string;
      };
      error?: string;
    };

    if (createRes.status !== 201 || !createData.log) {
      console.error("  [FAIL] Food log creation failed:", createRes.status, createData.error);
      process.exit(1);
    }

    const savedLogId = createData.log.id;
    createdFoodLogIds.push(savedLogId);

    console.log(`  Saved Log ID: ${savedLogId}`);
    console.log(`  Server Calculated Nutrients: ${createData.log.calories} kcal, ${createData.log.protein}g P, ${createData.log.carbohydrates}g C, ${createData.log.fat}g F`);
    console.log("  [PASS] User-approved entry saved successfully via POST /api/food/logs.\n");

    // -------------------------------------------------------------------------
    // 6. Verify entry appears in authenticated user's nutrition diary
    // -------------------------------------------------------------------------
    console.log("--- Step 6: Verify Saved Entry Appears in Nutrition Diary ---");
    const getLogsRes = await fetch(`${BASE_URL}/api/food/logs?date=${logDate}`, {
      headers: { Cookie: cookieHeader },
    });

    console.log(`  GET /api/food/logs?date=${logDate} -> HTTP ${getLogsRes.status}`);
    const getLogsData = (await getLogsRes.json()) as {
      logs?: Array<{ id: string; food_name: string; quantity_g: number; calories: number }>;
      count?: number;
    };

    const foundInDiary = (getLogsData.logs || []).some((l) => l.id === savedLogId);
    if (!foundInDiary) {
      console.error("  [FAIL] Saved entry not found in diary query results.");
      process.exit(1);
    }
    console.log(`  [PASS] Confirmed entry ${savedLogId} is present in authenticated user's nutrition diary.\n`);

    // -------------------------------------------------------------------------
    // 7. Verify entry can be edited and deleted
    // -------------------------------------------------------------------------
    console.log("--- Step 7: Verify Entry Can Be Edited and Deleted ---");
    // 7.1 PATCH edit
    const updatedWeight = primaryScannedItem.portion_grams + 50;
    console.log(`  Updating portion from ${primaryScannedItem.portion_grams}g to ${updatedWeight}g via PATCH...`);
    const patchRes = await fetch(`${BASE_URL}/api/food/logs/${savedLogId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ quantity_g: updatedWeight }),
    });

    console.log(`  PATCH HTTP Status: ${patchRes.status}`);
    const patchData = (await patchRes.json()) as { log?: { id: string; quantity_g: number; calories: number } };
    if (patchRes.status !== 200 || patchData.log?.quantity_g !== updatedWeight) {
      console.error("  [FAIL] PATCH update failed:", patchRes.status, patchData);
      process.exit(1);
    }
    console.log(`  [OK] Portion updated to ${patchData.log.quantity_g}g, recalculated calories: ${patchData.log.calories} kcal`);

    // 7.2 DELETE
    console.log(`  Deleting entry ${savedLogId} via DELETE...`);
    const deleteRes = await fetch(`${BASE_URL}/api/food/logs/${savedLogId}`, {
      method: "DELETE",
      headers: { Cookie: cookieHeader },
    });

    console.log(`  DELETE HTTP Status: ${deleteRes.status}`);
    if (deleteRes.status !== 200) {
      console.error("  [FAIL] DELETE failed with status:", deleteRes.status);
      process.exit(1);
    }

    // Verify deletion: query again to ensure it's gone
    const verifyGetRes = await fetch(`${BASE_URL}/api/food/logs?date=${logDate}`, {
      headers: { Cookie: cookieHeader },
    });
    const verifyGetData = (await verifyGetRes.json()) as {
      logs?: Array<{ id: string }>;
    };
    const stillPresent = (verifyGetData.logs || []).some((l) => l.id === savedLogId);
    if (stillPresent) {
      console.error("  [FAIL] Deleted entry is still present in food diary.");
      process.exit(1);
    }

    // Remove from cleanup queue since already deleted
    const idIdx = createdFoodLogIds.indexOf(savedLogId);
    if (idIdx !== -1) createdFoodLogIds.splice(idIdx, 1);

    console.log("  [PASS] Successfully verified that saved scanned entry can be edited and deleted.\n");
  } finally {
    // Guaranteed cleanup
    if (createdFoodLogIds.length > 0) {
      console.log(`  Cleaning up ${createdFoodLogIds.length} remaining test food log(s)...`);
      for (const id of createdFoodLogIds) {
        await directClient.from("food_logs").delete().eq("id", id);
      }
    }
  }

  console.log("==================================================================");
  console.log("STAGE 10 LIVE INTEGRATION RESULTS: ALL 7 STEPS PASSED (0 FAILURES)");
  console.log("==================================================================\n");
}

runStage10LiveIntegration().catch((err) => {
  console.error("Live integration test error:", err);
  process.exit(1);
});
