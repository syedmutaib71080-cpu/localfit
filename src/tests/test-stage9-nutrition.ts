import fs from "fs";
import path from "path";
import {
  calculateNutrientAmount,
  calculateFoodNutrients,
  validateFoodLogInput,
  validateFoodLogUpdate,
  aggregateDailyTotals,
  validateQuantity,
} from "../lib/nutrition-calculator";
import { normalizeMealType, VALID_MEAL_TYPES } from "../types/nutrition-tracking";
import type { FoodLogEntry } from "../types/nutrition-tracking";

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

async function runStage9Tests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 9.1: NUTRITION ENGINE & INTEGRITY TEST SUITE");
  console.log("(Offline / In-Memory: Verifies logic, boundaries & schema safety)");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // 1. SCIENTIFIC FORMULA ACCURACY & PORTION SCALING
  // ----------------------------------------------------------------------------
  console.log("--- 1. Scientific Formula Accuracy & Portion Scaling ---");

  // Formula: (nutrientPer100g * quantityG) / 100
  // Test 100g portion exactly matches base
  assert(
    calculateNutrientAmount(130, 100) === 130,
    "100g portion returns exact per-100g calorie value (130 kcal)"
  );
  assert(
    calculateNutrientAmount(2.7, 100) === 2.7,
    "100g portion returns exact per-100g protein value (2.7g)"
  );

  // Test Cooked White Rice 158g portion (1 cup)
  // 130 kcal * 1.58 = 205.4 kcal
  const riceCalories = calculateNutrientAmount(130, 158);
  assert(
    riceCalories === 205.4,
    "158g white rice portion calculates 205.4 kcal accurately (130 * 158 / 100 = 205.4)",
    `Got: ${riceCalories}`
  );

  // 2.7g protein * 1.58 = 4.266 -> 4.3g
  const riceProtein = calculateNutrientAmount(2.7, 158);
  assert(
    riceProtein === 4.3,
    "158g white rice portion calculates 4.3g protein accurately (2.7 * 158 / 100 = 4.3)",
    `Got: ${riceProtein}`
  );

  // 28.2g carbs * 1.58 = 44.556 -> 44.6g
  const riceCarbs = calculateNutrientAmount(28.2, 158);
  assert(
    riceCarbs === 44.6,
    "158g white rice portion calculates 44.6g carbs accurately (28.2 * 158 / 100 = 44.6)",
    `Got: ${riceCarbs}`
  );

  // 0.3g fat * 1.58 = 0.474 -> 0.5g
  const riceFat = calculateNutrientAmount(0.3, 158);
  assert(
    riceFat === 0.5,
    "158g white rice portion calculates 0.5g fat accurately (0.3 * 158 / 100 = 0.5)",
    `Got: ${riceFat}`
  );

  // 0.4g fibre * 1.58 = 0.632 -> 0.6g
  const riceFibre = calculateNutrientAmount(0.4, 158);
  assert(
    riceFibre === 0.6,
    "158g white rice portion calculates 0.6g fibre accurately (0.4 * 158 / 100 = 0.6)",
    `Got: ${riceFibre}`
  );

  // Test Whole Wheat Roti portion scaling: 40g medium roti
  // 264 kcal/100g -> 105.6 kcal
  const rotiCals = calculateNutrientAmount(264, 40);
  assert(
    rotiCals === 105.6,
    "40g roti portion calculates 105.6 kcal accurately (264 * 40 / 100 = 105.6)",
    `Got: ${rotiCals}`
  );

  // 10.7g fibre/100g -> 4.28 -> 4.3g
  const rotiFibre = calculateNutrientAmount(10.7, 40);
  assert(
    rotiFibre === 4.3,
    "40g roti portion calculates 4.3g fibre accurately (10.7 * 40 / 100 = 4.3)",
    `Got: ${rotiFibre}`
  );

  // Full food nutrient bundle calculation
  const multiNutrients = calculateFoodNutrients(
    {
      calories_per_100g: 264,
      protein_per_100g: 9.1,
      carbohydrates_per_100g: 55.7,
      fat_per_100g: 1.5,
      fibre_per_100g: 10.7,
    },
    40
  );
  assert(
    multiNutrients.calories === 105.6 &&
      multiNutrients.protein === 3.6 &&
      multiNutrients.carbohydrates === 22.3 &&
      multiNutrients.fat === 0.6 &&
      multiNutrients.fibre === 4.3,
    "calculateFoodNutrients computes all 5 macronutrients and fiber accurately in one step",
    `Got: ${JSON.stringify(multiNutrients)}`
  );

  // Legitimate zero nutrient preservation (e.g., pure sugar has 0g fat)
  const zeroFat = calculateNutrientAmount(0, 150);
  assert(
    zeroFat === 0,
    "Legitimate zero nutrient value (0g per 100g) is preserved as 0, not null"
  );

  // ----------------------------------------------------------------------------
  // 2. UNKNOWN NUTRIENTS PRESERVATION (MANDATORY REQUIREMENT)
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Preservation of Unknown Nutrients (Null Integrity) ---");

  // Null per 100g must return null, NEVER 0
  const nullNutrient = calculateNutrientAmount(null, 150);
  assert(
    nullNutrient === null,
    "calculateNutrientAmount(null, quantity) strictly returns null, never 0"
  );

  // Undefined per 100g must return null
  const undefinedNutrient = calculateNutrientAmount(undefined, 150);
  assert(
    undefinedNutrient === null,
    "calculateNutrientAmount(undefined, quantity) strictly returns null, never 0"
  );

  // Partial bundle with unknown fibre
  const partialNutrients = calculateFoodNutrients(
    {
      calories_per_100g: 155,
      protein_per_100g: 12.6,
      carbohydrates_per_100g: 1.1,
      fat_per_100g: 10.6,
      fibre_per_100g: null, // Unknown fibre
    },
    100
  );
  assert(
    partialNutrients.fibre === null && partialNutrients.calories === 155,
    "calculateFoodNutrients preserves null for unknown fibre without replacing it with 0"
  );

  // Invalid / non-positive quantities must return null
  assert(
    calculateNutrientAmount(100, 0) === null,
    "Zero portion weight returns null"
  );
  assert(
    calculateNutrientAmount(100, -25) === null,
    "Negative portion weight returns null"
  );
  assert(
    calculateNutrientAmount(100, NaN) === null,
    "NaN portion weight returns null"
  );
  assert(
    calculateNutrientAmount(100, Infinity) === null,
    "Infinity portion weight returns null"
  );
  assert(
    calculateNutrientAmount(-100, 50) === null,
    "Negative nutrient per 100g returns null"
  );

  // ----------------------------------------------------------------------------
  // 3. PORTION QUANTITY BOUNDARY & REJECTION TESTS
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Portion Quantity Boundary & Rejection Tests ---");

  const baseValidInput = {
    food_name: "Cooked Rice",
    meal_type: "lunch",
    quantity_g: 150,
  };

  // Rejection of missing quantity
  const missingQty = validateFoodLogInput({ ...baseValidInput, quantity_g: undefined });
  assert(
    !missingQty.valid && missingQty.error?.includes("quantity_g is required"),
    "Rejects payload with missing quantity_g"
  );

  // Rejection of zero quantity (0g)
  const zeroQty = validateFoodLogInput({ ...baseValidInput, quantity_g: 0 });
  assert(
    !zeroQty.valid && zeroQty.error?.includes("strictly greater than 0"),
    "Rejects zero quantity (0g)"
  );

  // Rejection of negative quantity (-50g)
  const negQty = validateFoodLogInput({ ...baseValidInput, quantity_g: -50 });
  assert(
    !negQty.valid && negQty.error?.includes("strictly greater than 0"),
    "Rejects negative quantity (-50g)"
  );

  // Rejection of NaN quantity
  const nanQty = validateFoodLogInput({ ...baseValidInput, quantity_g: NaN });
  assert(
    !nanQty.valid && nanQty.error?.includes("valid finite number"),
    "Rejects NaN quantity"
  );

  // Rejection of Infinity quantity
  const infQty = validateFoodLogInput({ ...baseValidInput, quantity_g: Infinity });
  assert(
    !infQty.valid && infQty.error?.includes("valid finite number"),
    "Rejects Infinity quantity"
  );

  // Rejection of string quantity ("150")
  const strQty = validateFoodLogInput({ ...baseValidInput, quantity_g: "150" as unknown as number });
  assert(
    !strQty.valid && strQty.error?.includes("valid finite number"),
    "Rejects non-numeric string quantity ('150')"
  );

  // Rejection of excessive quantity (> 10,000g)
  const excessQty = validateFoodLogInput({ ...baseValidInput, quantity_g: 10001 });
  assert(
    !excessQty.valid && excessQty.error?.includes("cannot exceed 10,000 grams"),
    "Rejects excessive portion weight (10,001g > 10kg)"
  );

  // Acceptance of boundary quantity (10,000g exactly)
  const maxValidQty = validateFoodLogInput({ ...baseValidInput, quantity_g: 10000 });
  assert(
    maxValidQty.valid && maxValidQty.data?.quantity_g === 10000,
    "Accepts maximum allowed portion weight (10,000g = 10kg)"
  );

  // Acceptance of small fractional quantity (0.1g)
  const minValidQty = validateFoodLogInput({ ...baseValidInput, quantity_g: 0.1 });
  assert(
    minValidQty.valid && minValidQty.data?.quantity_g === 0.1,
    "Accepts minimal positive fractional portion weight (0.1g)"
  );

  // UI validateQuantity helper
  assert(
    validateQuantity(150).isValid && validateQuantity(150).weight === 150,
    "validateQuantity accepts 150g"
  );
  assert(
    !validateQuantity(0).isValid,
    "validateQuantity rejects 0g"
  );
  assert(
    !validateQuantity(-5).isValid,
    "validateQuantity rejects negative weight"
  );
  assert(
    !validateQuantity(15000).isValid,
    "validateQuantity rejects > 10,000g"
  );

  // ----------------------------------------------------------------------------
  // 4. PER-100G NUTRIENT VALIDATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Per-100g Nutrient Input Validation ---");

  // Rejection of negative calories
  const negCals = validateFoodLogInput({
    ...baseValidInput,
    calories_per_100g: -50,
  });
  assert(
    !negCals.valid && negCals.error?.includes("cannot be negative"),
    "Rejects negative calories_per_100g (-50)"
  );

  // Rejection of negative protein
  const negProt = validateFoodLogInput({
    ...baseValidInput,
    protein_per_100g: -10,
  });
  assert(
    !negProt.valid && negProt.error?.includes("cannot be negative"),
    "Rejects negative protein_per_100g (-10)"
  );

  // Rejection of negative carbohydrates
  const negCarbs = validateFoodLogInput({
    ...baseValidInput,
    carbohydrates_per_100g: -5,
  });
  assert(
    !negCarbs.valid && negCarbs.error?.includes("cannot be negative"),
    "Rejects negative carbohydrates_per_100g (-5)"
  );

  // Rejection of negative fat
  const negFat = validateFoodLogInput({
    ...baseValidInput,
    fat_per_100g: -2,
  });
  assert(
    !negFat.valid && negFat.error?.includes("cannot be negative"),
    "Rejects negative fat_per_100g (-2)"
  );

  // Rejection of negative fibre
  const negFib = validateFoodLogInput({
    ...baseValidInput,
    fibre_per_100g: -1,
  });
  assert(
    !negFib.valid && negFib.error?.includes("cannot be negative"),
    "Rejects negative fibre_per_100g (-1)"
  );

  // Rejection of NaN nutrient value
  const nanNutr = validateFoodLogInput({
    ...baseValidInput,
    calories_per_100g: NaN,
  });
  assert(
    !nanNutr.valid && nanNutr.error?.includes("valid finite number"),
    "Rejects NaN calories_per_100g"
  );

  // Rejection of Infinity nutrient value
  const infNutr = validateFoodLogInput({
    ...baseValidInput,
    protein_per_100g: Infinity,
  });
  assert(
    !infNutr.valid && infNutr.error?.includes("valid finite number"),
    "Rejects Infinity protein_per_100g"
  );

  // Rejection of physically impossible calories (>950 kcal / 100g)
  const excessCals = validateFoodLogInput({
    ...baseValidInput,
    calories_per_100g: 1500,
  });
  assert(
    !excessCals.valid && excessCals.error?.includes("exceeds realistic maximum"),
    "Rejects impossible calorie density (1,500 kcal / 100g > 950 limit)"
  );

  // Rejection of impossible macronutrient (> 100g per 100g)
  const excessProt = validateFoodLogInput({
    ...baseValidInput,
    protein_per_100g: 110,
  });
  assert(
    !excessProt.valid && excessProt.error?.includes("exceeds realistic maximum"),
    "Rejects impossible protein ratio (110g / 100g > 100 limit)"
  );

  // Acceptance of null / undefined nutrients
  const validNullNutrs = validateFoodLogInput({
    ...baseValidInput,
    calories_per_100g: null,
    protein_per_100g: undefined,
  });
  assert(
    validNullNutrs.valid && validNullNutrs.data?.calories_per_100g === null,
    "Accepts null or omitted per-100g nutrient values without error"
  );

  // ----------------------------------------------------------------------------
  // 5. MEAL TYPE NORMALIZATION & VALIDATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Meal Type Normalization & Validation ---");

  // Valid meal types
  assert(
    normalizeMealType("breakfast") === "breakfast" &&
      normalizeMealType("Breakfast") === "breakfast" &&
      normalizeMealType("BREAKFAST  ") === "breakfast",
    "Normalizes 'breakfast' with mixed case and whitespace"
  );
  assert(
    normalizeMealType("lunch") === "lunch" &&
      normalizeMealType("Lunch") === "lunch",
    "Normalizes 'lunch' with mixed case"
  );
  assert(
    normalizeMealType("dinner") === "dinner" &&
      normalizeMealType("DINNER") === "dinner",
    "Normalizes 'dinner' with uppercase"
  );
  assert(
    normalizeMealType("snack") === "snack" &&
      normalizeMealType("snacks") === "snack" &&
      normalizeMealType("Snacks") === "snack",
    "Normalizes 'snack' and plural 'snacks' to 'snack'"
  );

  assert(
    VALID_MEAL_TYPES.length === 4 &&
      VALID_MEAL_TYPES.includes("breakfast") &&
      VALID_MEAL_TYPES.includes("lunch") &&
      VALID_MEAL_TYPES.includes("dinner") &&
      VALID_MEAL_TYPES.includes("snack"),
    "VALID_MEAL_TYPES contains exactly [breakfast, lunch, dinner, snack]"
  );

  // Rejection of invalid meal types
  assert(
    normalizeMealType("brunch") === null,
    "Rejects non-standard meal type 'brunch'"
  );
  assert(
    normalizeMealType("second_breakfast") === null,
    "Rejects non-standard meal type 'second_breakfast'"
  );
  assert(
    normalizeMealType("midnight_snack") === null,
    "Rejects non-standard meal type 'midnight_snack'"
  );
  assert(
    normalizeMealType("") === null,
    "Rejects empty string meal type"
  );
  assert(
    normalizeMealType(null as unknown as string) === null,
    "Rejects null meal type"
  );

  const invalidMealInput = validateFoodLogInput({
    ...baseValidInput,
    meal_type: "elevenses",
  });
  assert(
    !invalidMealInput.valid && invalidMealInput.error?.includes("Invalid meal_type"),
    "validateFoodLogInput rejects unsupported meal_type 'elevenses'"
  );

  // ----------------------------------------------------------------------------
  // 6. TEXT BOUNDARIES & INPUT INTEGRITY
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Text Boundaries & Input Integrity ---");

  // Rejection of empty food_name
  const emptyName = validateFoodLogInput({ ...baseValidInput, food_name: "   " });
  assert(
    !emptyName.valid && emptyName.error?.includes("food_name is required"),
    "Rejects whitespace-only food_name"
  );

  // Rejection of food_name > 200 characters
  const longName = "A".repeat(201);
  const oversizedName = validateFoodLogInput({ ...baseValidInput, food_name: longName });
  assert(
    !oversizedName.valid && oversizedName.error?.includes("cannot exceed 200 characters"),
    "Rejects food_name exceeding 200 characters"
  );

  // Rejection of notes > 2,000 characters
  const longNotes = "N".repeat(2001);
  const oversizedNotes = validateFoodLogInput({ ...baseValidInput, notes: longNotes });
  assert(
    !oversizedNotes.valid && oversizedNotes.error?.includes("cannot exceed 2,000 characters"),
    "Rejects notes exceeding 2,000 characters"
  );

  // Acceptance of notes exactly 2,000 characters
  const maxNotes = "N".repeat(2000);
  const validMaxNotes = validateFoodLogInput({ ...baseValidInput, notes: maxNotes });
  assert(
    validMaxNotes.valid && validMaxNotes.data?.notes?.length === 2000,
    "Accepts notes at 2,000 characters limit"
  );

  // Rejection of serving_name > 100 characters
  const longServing = "S".repeat(101);
  const oversizedServing = validateFoodLogInput({ ...baseValidInput, serving_name: longServing });
  assert(
    !oversizedServing.valid && oversizedServing.error?.includes("cannot exceed 100 characters"),
    "Rejects serving_name exceeding 100 characters"
  );

  // Consumption date validation (YYYY-MM-DD)
  const invalidDate = validateFoodLogInput({ ...baseValidInput, consumption_date: "2026/11/11" });
  assert(
    !invalidDate.valid && invalidDate.error?.includes("YYYY-MM-DD"),
    "Rejects slash-formatted consumption_date (requires YYYY-MM-DD)"
  );

  const invalidCalDate = validateFoodLogInput({ ...baseValidInput, consumption_date: "2026-99-99" });
  assert(
    !invalidCalDate.valid && invalidCalDate.error?.includes("valid date"),
    "Rejects invalid calendar consumption_date (2026-99-99)"
  );

  const validDate = validateFoodLogInput({ ...baseValidInput, consumption_date: "2026-11-11" });
  assert(
    validDate.valid && validDate.data?.consumption_date === "2026-11-11",
    "Accepts valid YYYY-MM-DD consumption_date"
  );

  // Logged at timestamp validation
  const invalidTime = validateFoodLogInput({ ...baseValidInput, logged_at: "not-a-timestamp" });
  assert(
    !invalidTime.valid && invalidTime.error?.includes("not a valid timestamp"),
    "Rejects non-ISO logged_at timestamp"
  );

  // ----------------------------------------------------------------------------
  // 7. FOOD LOG UPDATE VALIDATION (PATCH)
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Food Log Update Validation (PATCH) ---");

  // Empty update rejected
  const emptyUpdate = validateFoodLogUpdate({});
  assert(
    !emptyUpdate.valid && emptyUpdate.error?.includes("At least one valid field"),
    "Rejects empty update object with no fields"
  );

  // Non-object update rejected
  const arrayUpdate = validateFoodLogUpdate([]);
  assert(
    !arrayUpdate.valid && arrayUpdate.error?.includes("JSON object"),
    "Rejects array as update body"
  );

  // Invalid quantity on update rejected
  const negUpdateQty = validateFoodLogUpdate({ quantity_g: -10 });
  assert(
    !negUpdateQty.valid && negUpdateQty.error?.includes("strictly greater than 0"),
    "Rejects negative quantity_g in PATCH update"
  );

  const zeroUpdateQty = validateFoodLogUpdate({ quantity_g: 0 });
  assert(
    !zeroUpdateQty.valid && zeroUpdateQty.error?.includes("strictly greater than 0"),
    "Rejects zero quantity_g in PATCH update"
  );

  const excessUpdateQty = validateFoodLogUpdate({ quantity_g: 10001 });
  assert(
    !excessUpdateQty.valid && excessUpdateQty.error?.includes("cannot exceed 10,000 grams"),
    "Rejects excessive quantity_g (>10,000g) in PATCH update"
  );

  // Invalid meal_type on update rejected
  const badMealUpdate = validateFoodLogUpdate({ meal_type: "midday_munch" });
  assert(
    !badMealUpdate.valid && badMealUpdate.error?.includes("Invalid meal_type"),
    "Rejects invalid meal_type in PATCH update"
  );

  // Notes > 2000 chars on update rejected
  const longNotesUpdate = validateFoodLogUpdate({ notes: "Z".repeat(2001) });
  assert(
    !longNotesUpdate.valid && longNotesUpdate.error?.includes("cannot exceed 2,000 characters"),
    "Rejects notes > 2,000 chars in PATCH update"
  );

  // Valid update accepted
  const validUpdate = validateFoodLogUpdate({
    quantity_g: 200,
    meal_type: "Dinner",
    notes: "Post-workout meal",
  });
  assert(
    validUpdate.valid &&
      validUpdate.data?.quantity_g === 200 &&
      validUpdate.data?.meal_type === "dinner" &&
      validUpdate.data?.notes === "Post-workout meal",
    "Accepts valid multi-field PATCH update and normalizes meal_type"
  );

  // ----------------------------------------------------------------------------
  // 8. ANTI-SPOOFING & CLIENT-SUPPLIED NUTRIENT DISCARD
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. Anti-Spoofing & Client-Supplied Nutrient Discard ---");

  // Client attempts to spoof calories by submitting calories: 99999
  const clientSpoofPayload = {
    food_name: "White Rice (Cooked)",
    meal_type: "lunch",
    quantity_g: 158,
    calories: 99999, // FAKE client calories
    protein: 8888,   // FAKE client protein
    carbohydrates: 7777,
    fat: 6666,
    fibre: 5555,
    user_id: "victim-user-id", // SPOOFED user_id
    calories_per_100g: 130,
    protein_per_100g: 2.7,
    carbohydrates_per_100g: 28.2,
    fat_per_100g: 0.3,
    fibre_per_100g: 0.4,
  };

  const validatedSpoof = validateFoodLogInput(clientSpoofPayload);
  assert(
    validatedSpoof.valid,
    "Validator accepts payload with extra/spoofed properties"
  );

  // Server calculator calculates authentic values strictly ignoring client-supplied calculated values
  const serverCalc = calculateFoodNutrients(
    {
      calories_per_100g: validatedSpoof.data!.calories_per_100g,
      protein_per_100g: validatedSpoof.data!.protein_per_100g,
      carbohydrates_per_100g: validatedSpoof.data!.carbohydrates_per_100g,
      fat_per_100g: validatedSpoof.data!.fat_per_100g,
      fibre_per_100g: validatedSpoof.data!.fibre_per_100g,
    },
    validatedSpoof.data!.quantity_g
  );

  assert(
    serverCalc.calories === 205.4 && serverCalc.protein === 4.3,
    "Server-calculated calories strictly discard client-supplied calories (99999 -> 205.4)"
  );
  assert(
    !("user_id" in (validatedSpoof.data as unknown as Record<string, unknown>)),
    "Validated data strips client-supplied user_id from payload"
  );

  // ----------------------------------------------------------------------------
  // 9. DAILY TOTALS AGGREGATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. Daily Totals Aggregation ---");

  const sampleEntries: FoodLogEntry[] = [
    {
      id: "entry-1",
      user_id: "user-123",
      food_id: null,
      food_name: "Boiled Eggs (2)",
      meal_type: "breakfast",
      quantity_g: 100,
      serving_name: "2 large eggs",
      calories: 155,
      protein: 12.6,
      carbohydrates: 1.1,
      fat: 10.6,
      fibre: null, // Unknown fibre
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T08:00:00Z",
      notes: null,
    },
    {
      id: "entry-2",
      user_id: "user-123",
      food_id: null,
      food_name: "Steamed White Rice",
      meal_type: "lunch",
      quantity_g: 158,
      serving_name: "1 cup",
      calories: 205.4,
      protein: 4.3,
      carbohydrates: 44.6,
      fat: 0.5,
      fibre: 0.6,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T13:00:00Z",
      notes: null,
    },
    {
      id: "entry-3",
      user_id: "user-123",
      food_id: null,
      food_name: "Bhatkal Pomfret Fish",
      meal_type: "lunch",
      quantity_g: 120,
      serving_name: "1 fillet",
      calories: 122,
      protein: 23.2,
      carbohydrates: 0,
      fat: 3.4,
      fibre: 0,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T13:10:00Z",
      notes: null,
    },
  ];

  const totals = aggregateDailyTotals("2026-11-11", sampleEntries);

  // Total Calories: 155 + 205.4 + 122 = 482.4
  assert(
    totals.totalCalories === 482.4,
    "Total daily calories aggregated accurately: 155 + 205.4 + 122 = 482.4 kcal",
    `Got: ${totals.totalCalories}`
  );

  // Total Protein: 12.6 + 4.3 + 23.2 = 40.1g
  assert(
    totals.totalProtein === 40.1,
    "Total daily protein aggregated accurately: 12.6 + 4.3 + 23.2 = 40.1g",
    `Got: ${totals.totalProtein}`
  );

  // Total Carbs: 1.1 + 44.6 + 0 = 45.7g
  assert(
    totals.totalCarbohydrates === 45.7,
    "Total daily carbohydrates aggregated accurately: 1.1 + 44.6 + 0 = 45.7g",
    `Got: ${totals.totalCarbohydrates}`
  );

  // Total Fat: 10.6 + 0.5 + 3.4 = 14.5g
  assert(
    totals.totalFat === 14.5,
    "Total daily fat aggregated accurately: 10.6 + 0.5 + 3.4 = 14.5g",
    `Got: ${totals.totalFat}`
  );

  // Total Fibre: null + 0.6 + 0 = 0.6g (null safely ignored without converting to NaN)
  assert(
    totals.totalFibre === 0.6,
    "Total daily fibre handles null entry safely without producing NaN: null + 0.6 + 0 = 0.6g",
    `Got: ${totals.totalFibre}`
  );

  assert(
    totals.entriesCount === 3,
    "Daily entries count matches sample length (3 items)"
  );

  // Empty entries aggregation
  const emptyTotals = aggregateDailyTotals("2026-11-12", []);
  assert(
    emptyTotals.totalCalories === 0 &&
      emptyTotals.totalProtein === 0 &&
      emptyTotals.entriesCount === 0,
    "Empty day aggregation safely yields 0 totals with 0 entries"
  );

  // ----------------------------------------------------------------------------
  // 10. DATABASE MIGRATION & RLS SCHEMA AUDIT
  // ----------------------------------------------------------------------------
  console.log("\n--- 10. Database Migration & RLS Security Audit ---");

  const migrationPath = path.resolve(
    process.cwd(),
    "supabase/migrations/20261111140000_nutrition_tracking_foundation.sql"
  );
  assert(
    fs.existsSync(migrationPath),
    "Migration file 20261111140000_nutrition_tracking_foundation.sql exists on disk"
  );

  const migrationSql = fs.readFileSync(migrationPath, "utf-8");

  // RLS Checks
  assert(
    migrationSql.includes("ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;"),
    "Migration enables Row Level Security on public.foods"
  );
  assert(
    migrationSql.includes("ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;"),
    "Migration enables Row Level Security on public.food_logs"
  );

  // 4 Ownership policies for food_logs
  assert(
    migrationSql.includes('CREATE POLICY "Users can view own food logs"') &&
      migrationSql.includes("auth.uid() = user_id"),
    "Migration establishes SELECT ownership policy (auth.uid() = user_id) on food_logs"
  );
  assert(
    migrationSql.includes('CREATE POLICY "Users can insert own food logs"') &&
      migrationSql.includes("auth.uid() = user_id"),
    "Migration establishes INSERT ownership policy (auth.uid() = user_id) on food_logs"
  );
  assert(
    migrationSql.includes('CREATE POLICY "Users can update own food logs"') &&
      migrationSql.includes("auth.uid() = user_id"),
    "Migration establishes UPDATE ownership policy (auth.uid() = user_id) on food_logs"
  );
  assert(
    migrationSql.includes('CREATE POLICY "Users can delete own food logs"') &&
      migrationSql.includes("auth.uid() = user_id"),
    "Migration establishes DELETE ownership policy (auth.uid() = user_id) on food_logs"
  );

  // Read-only policy for foods
  assert(
    migrationSql.includes("CREATE POLICY \"Allow authenticated users to read foods\"") ||
      migrationSql.includes("CREATE POLICY \"Allow public read on foods\"") ||
      migrationSql.includes("FOR SELECT"),
    "Migration establishes read access policy on public.foods"
  );

  // Quantity boundary constraint
  assert(
    migrationSql.includes("chk_food_logs_quantity_positive") &&
      migrationSql.includes("quantity_g > 0 AND quantity_g <= 10000"),
    "Migration enforces CHECK constraint (quantity_g > 0 AND quantity_g <= 10000) on food_logs"
  );

  // Notes length constraint
  assert(
    migrationSql.includes("chk_food_logs_notes_length") &&
      migrationSql.toLowerCase().includes("length(notes) <= 2000"),
    "Migration enforces CHECK constraint (length(notes) <= 2000) on food_logs"
  );

  // Non-negative nutrients check
  assert(
    migrationSql.includes("chk_food_logs_calories_nonneg") &&
      migrationSql.includes("chk_food_logs_protein_nonneg") &&
      migrationSql.includes("chk_food_logs_carbs_nonneg") &&
      migrationSql.includes("chk_food_logs_fat_nonneg") &&
      migrationSql.includes("chk_food_logs_fibre_nonneg"),
    "Migration enforces non-negative CHECK constraints on all nutrients"
  );

  // Meal types constraint
  assert(
    migrationSql.includes("chk_food_logs_meal_type") &&
      migrationSql.includes("breakfast") &&
      migrationSql.includes("lunch") &&
      migrationSql.includes("dinner") &&
      migrationSql.includes("snack"),
    "Migration enforces meal_type CHECK constraint ('breakfast', 'lunch', 'dinner', 'snack')"
  );

  // Index checks
  assert(
    migrationSql.includes("idx_foods_name ON public.foods (lower(name))") &&
      migrationSql.includes("idx_foods_local_name ON public.foods (lower(local_name))") &&
      !migrationSql.includes("idx_foods_name_lower") &&
      !migrationSql.includes("idx_foods_local_name_lower"),
    "Migration reuses existing Stage 4 food indexes without introducing duplicate idx_foods_name_lower"
  );
  assert(
    migrationSql.includes("idx_food_logs_user_consumption_date") &&
      migrationSql.includes("(user_id, consumption_date)"),
    "Migration defines distinct composite index idx_food_logs_user_consumption_date on (user_id, consumption_date)"
  );
  assert(
    migrationSql.includes("idx_food_logs_user_logged_at") &&
      migrationSql.includes("(user_id, logged_at DESC)"),
    "Migration defines index on (user_id, logged_at DESC) for chronological order"
  );

  // Trigger checks
  assert(
    migrationSql.includes("DROP TRIGGER IF EXISTS on_food_logs_updated_at ON public.food_logs;") &&
      migrationSql.includes("DROP TRIGGER IF EXISTS on_foods_updated_at ON public.foods;"),
    "Migration explicitly drops legacy on_*_updated_at triggers before creating Stage 9.1 triggers"
  );
  assert(
    migrationSql.includes("handle_updated_at()") &&
      migrationSql.includes("trg_food_logs_updated_at") &&
      migrationSql.includes("trg_foods_updated_at"),
    "Migration establishes exactly one intended handle_updated_at() trigger per table (trg_*)"
  );

  // Grants check
  assert(
    migrationSql.includes("GRANT SELECT ON TABLE public.foods TO anon, authenticated;") &&
      migrationSql.includes("GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.food_logs TO authenticated;"),
    "Migration grants correct least-privilege permissions to anon and authenticated roles"
  );

  // ----------------------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------------------
  console.log("\n==================================================================");
  console.log(`STAGE 9.1 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage9Tests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
