import { validateAndSanitizeFoodScan, findDatabaseMatch } from "../lib/food-scan-validator";
import { validateImageFile } from "../lib/image-compression";
import { analyzeFoodImageWithGemini } from "../lib/gemini";
import { addFoodLog, getFoodLogsForDate } from "../lib/food-logs";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  [FAIL] ${testName}${details ? ` -> ${details}` : ""}`);
    failedCount++;
  }
}

async function runStage6Tests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 6: AI FOOD SCANNER TEST SUITE");
  console.log("==================================================================\n");

  // 1. IMAGE FILE VALIDATION
  console.log("--- 1. Image File & Format Validation ---");
  const dummyJpeg = new File(["dummy data"], "meal.jpg", { type: "image/jpeg" });
  const dummyPng = new File(["dummy data"], "plate.png", { type: "image/png" });
  const dummyWebp = new File(["dummy data"], "food.webp", { type: "image/webp" });
  const dummyTxt = new File(["dummy text"], "notes.txt", { type: "text/plain" });

  assert(validateImageFile(dummyJpeg).valid, "Accepts valid JPEG image");
  assert(validateImageFile(dummyPng).valid, "Accepts valid PNG image");
  assert(validateImageFile(dummyWebp).valid, "Accepts valid WebP image");
  assert(!validateImageFile(dummyTxt).valid, "Rejects text/plain non-image file");

  // Oversized file check (> 12MB)
  const hugeBlob = new Blob([new Uint8Array(13 * 1024 * 1024)]);
  const oversizedFile = new File([hugeBlob], "huge.jpg", { type: "image/jpeg" });
  assert(!validateImageFile(oversizedFile).valid, "Rejects oversized image file (>12MB)");

  // 2. DATABASE MATCHING LOGIC
  console.log("\n--- 2. Verified Database Matching & Regional Dish Detection ---");
  const biryaniMatch = findDatabaseMatch("Bhatkal Chicken Biryani");
  assert(biryaniMatch !== null && biryaniMatch.name.includes("Biryani"), "Matches authentic Bhatkal Chicken Biryani");

  const neerDosaMatch = findDatabaseMatch("Neer Dosa with chutney");
  assert(neerDosaMatch !== null && neerDosaMatch.name.includes("Neer Dosa"), "Matches coastal Neer Dosa");

  const pomfretMatch = findDatabaseMatch("Steamed Pomfret fish");
  assert(pomfretMatch !== null && pomfretMatch.name.includes("Pomfret"), "Matches Pomfret Fish");

  const eggMatch = findDatabaseMatch("2 boiled eggs");
  assert(eggMatch !== null && eggMatch.name.includes("Egg"), "Matches Boiled Egg");

  const unknownMatch = findDatabaseMatch("Extraterrestrial soup xyz999");
  assert(unknownMatch === null, "Returns null for unknown exotic dish without hallucinating");

  // 3. MODEL OUTPUT VALIDATION & NUTRITION PHYSICS
  console.log("\n--- 3. AI Output Sanitization & Nutritional Physics Bounds ---");
  const validAiRaw = {
    is_food_detected: true,
    food_name: "Grilled Chicken Breast with salad",
    cooking_method: "Grilled",
    estimated_weight_g: 200,
    estimated_calories: 330,
    estimated_protein: 62.0,
    estimated_carbohydrates: 0,
    estimated_fat: 7.2,
    estimated_fibre: 0,
    confidence: 90,
    uncertainty_notes: "Visual estimate of lean meat without added oil",
  };
  const sanitized = validateAndSanitizeFoodScan(validAiRaw);
  assert(sanitized.is_food_detected, "Detects valid food item");
  assert(sanitized.estimated_weight_g === 200, "Preserves valid portion weight (200g)");
  assert(sanitized.nutrition_per_100g.calories === 165, "Accurately computes per-100g baseline calories (165 kcal)");
  assert(sanitized.nutrition_per_100g.protein === 31, "Accurately computes per-100g protein (31g)");

  // Physics check: Negative numbers or impossible values
  const impossibleRaw = {
    is_food_detected: true,
    food_name: "Faulty Dish",
    estimated_weight_g: -50, // Negative weight
    estimated_calories: -900, // Negative calories
    estimated_protein: 500, // 500g protein in a small dish!
    estimated_carbohydrates: 600,
    estimated_fat: 300,
  };
  const clamped = validateAndSanitizeFoodScan(impossibleRaw);
  assert(clamped.estimated_weight_g >= 10, "Clamps negative weight to positive minimum");
  assert(clamped.estimated_calories >= 0, "Clamps negative calories to non-negative");
  assert(clamped.estimated_protein <= clamped.estimated_weight_g, "Protects macro physics: protein cannot exceed portion weight");
  assert(clamped.estimated_fat <= clamped.estimated_weight_g, "Protects macro physics: fat cannot exceed portion weight");

  // Non-food detection
  const nonFoodRaw = {
    is_food_detected: false,
    food_name: "Car key",
    uncertainty_notes: "No food detected",
  };
  const nonFoodResult = validateAndSanitizeFoodScan(nonFoodRaw);
  assert(!nonFoodResult.is_food_detected, "Correctly identifies non-food item");
  assert(nonFoodResult.estimated_calories === 0, "Non-food item has 0 calories");

  // 4. GEMINI SERVICE ERROR HANDLING & KEY SECURITY
  console.log("\n--- 4. Server-Side Gemini Service Safety & Error Handling ---");
  // Test missing API key safety without crashing
  const originalKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const missingKeyRes = await analyzeFoodImageWithGemini({
      imageBase64: "aGVsbG8=",
      mimeType: "image/jpeg",
    });
    assert(!missingKeyRes.success, "Handles missing API key safely without crashing");
    if (!missingKeyRes.success) {
      assert(missingKeyRes.code === "API_KEY_MISSING", "Returns API_KEY_MISSING error code");
    }
    assert(!JSON.stringify(missingKeyRes).includes("AIzaSy"), "Never exposes API key strings in responses");
  } finally {
    process.env.GEMINI_API_KEY = originalKey;
  }

  // 5. SAVING TO FOOD DIARY & SNAPSHOT PERSISTENCE
  console.log("\n--- 5. Food Diary Integration & Snapshot Persistence ---");
  const testDate = "2026-11-11";
  const savedEntry = await addFoodLog({
    food_name: "Bhatkal Chicken Biryani (AI Scan)",
    meal_type: "Lunch",
    quantity_g: 250,
    serving_name: "250g serving (AI Estimate)",
    calories: 430,
    protein: 24.5,
    carbohydrates: 55.0,
    fat: 13.0,
    fibre: 3.5,
    is_manual_entry: true,
    is_ai_estimate: true,
    logged_at: `${testDate}T13:00:00.000Z`,
  });

  assert(savedEntry.id !== undefined, "Successfully saved AI scan entry to food diary");
  assert(savedEntry.calories === 430, "Preserves exact snapshot calories (430 kcal)");
  assert(savedEntry.protein === 24.5, "Preserves exact snapshot protein (24.5g)");
  assert(savedEntry.is_ai_estimate === true, "Identifies log entry with is_ai_estimate flag");

  const dayLogs = await getFoodLogsForDate(testDate);
  const foundInDay = dayLogs.find((l) => l.id === savedEntry.id);
  assert(foundInDay !== undefined, "Retrieved saved AI scan from day nutrition log");

  console.log("\n==================================================================");
  console.log(`TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage6Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
