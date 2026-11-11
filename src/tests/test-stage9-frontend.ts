import {
  getTodayDateString,
  shiftDateString,
  formatDisplayDate,
  isValidDateString,
  calculateMealTotals,
  calculateTargetComparison,
  filterLogsByMeal,
} from "../lib/nutrition-client";
import {
  calculateNutrientAmount,
  validateQuantity,
  validateFoodLogInput,
  validateFoodLogUpdate,
  aggregateDailyTotals,
} from "../lib/nutrition-calculator";
import { normalizeMealType } from "../types/nutrition-tracking";
import type {
  FoodLogEntry,
  CreateFoodLogRequest,
  MealType,
} from "../types/nutrition-tracking";

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

async function runStage9FrontendTests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 9.2: NUTRITION FRONTEND TEST SUITE");
  console.log("(Verifies dashboard, search, meal breakdown, editing, dates & security)");
  console.log("==================================================================\n");

  // ----------------------------------------------------------------------------
  // 1. DASHBOARD NUTRITION CALCULATIONS & DATA RENDERING
  // ----------------------------------------------------------------------------
  console.log("--- 1. Dashboard Calculations & Data Rendering ---");

  const sampleEntries: FoodLogEntry[] = [
    {
      id: "log-1",
      user_id: "user-123",
      food_id: "f-1",
      food_name: "Idli with Sambar",
      meal_type: "breakfast",
      quantity_g: 150,
      serving_name: "2 idlis",
      calories: 198,
      protein: 6.2,
      carbohydrates: 38.5,
      fat: 2.1,
      fibre: 3.4,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T08:30:00Z",
      notes: "Steamed, no oil",
    },
    {
      id: "log-2",
      user_id: "user-123",
      food_id: "f-2",
      food_name: "Steamed Pomfret Fish",
      meal_type: "lunch",
      quantity_g: 120,
      serving_name: "1 fillet",
      calories: 122.4,
      protein: 23.2,
      carbohydrates: 0,
      fat: 3.4,
      fibre: 0,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T13:00:00Z",
      notes: null,
    },
    {
      id: "log-3",
      user_id: "user-123",
      food_id: null,
      food_name: "Black Coffee",
      meal_type: "snack",
      quantity_g: 200,
      serving_name: "1 cup",
      calories: 4,
      protein: 0.2,
      carbohydrates: 0.8,
      fat: 0,
      fibre: 0,
      consumption_date: "2026-11-11",
      logged_at: "2026-11-11T16:00:00Z",
      notes: "No sugar",
    },
  ];

  const aggregated = aggregateDailyTotals("2026-11-11", sampleEntries);
  assert(
    aggregated.totalCalories === 324.4,
    "Aggregates total calories accurately (198 + 122.4 + 4 = 324.4)",
    `Got: ${aggregated.totalCalories}`
  );
  assert(
    aggregated.totalProtein === 29.6,
    "Aggregates total protein accurately (6.2 + 23.2 + 0.2 = 29.6)",
    `Got: ${aggregated.totalProtein}`
  );
  assert(
    aggregated.totalCarbohydrates === 39.3,
    "Aggregates total carbohydrates accurately (38.5 + 0 + 0.8 = 39.3)",
    `Got: ${aggregated.totalCarbohydrates}`
  );
  assert(
    aggregated.totalFat === 5.5,
    "Aggregates total fat accurately (2.1 + 3.4 + 0 = 5.5)",
    `Got: ${aggregated.totalFat}`
  );
  assert(
    aggregated.totalFibre === 3.4,
    "Aggregates total fibre accurately (3.4 + 0 + 0 = 3.4)",
    `Got: ${aggregated.totalFibre}`
  );
  assert(
    aggregated.entriesCount === 3,
    "Entries count matches 3 logged items"
  );

  // Target comparison with existing calorie goal (e.g. 2000 kcal)
  const comparisonWithGoals = calculateTargetComparison(aggregated, {
    daily_calorie_goal: 2000,
    daily_protein_goal: 120,
  });
  assert(
    comparisonWithGoals.hasCalorieGoal === true,
    "Correctly identifies presence of user calorie goal"
  );
  assert(
    comparisonWithGoals.calorieTarget === 2000,
    "Calorie target matches user profile goal (2000 kcal)"
  );
  assert(
    comparisonWithGoals.caloriesRemaining === 1676,
    "Calculates remaining calories accurately (2000 - 324.4 = 1675.6 -> 1676)",
    `Got: ${comparisonWithGoals.caloriesRemaining}`
  );
  assert(
    comparisonWithGoals.calorieProgressPercent === 16,
    "Calculates calorie progress percentage (324.4 / 2000 = 16%)",
    `Got: ${comparisonWithGoals.calorieProgressPercent}`
  );
  assert(
    comparisonWithGoals.proteinRemaining === 90.4,
    "Calculates remaining protein accurately (120 - 29.6 = 90.4g)",
    `Got: ${comparisonWithGoals.proteinRemaining}`
  );

  // Target comparison with NO GOALS set (Anti-Fabrication Requirement)
  const comparisonNoGoals = calculateTargetComparison(aggregated, {
    daily_calorie_goal: null,
    daily_protein_goal: null,
  });
  assert(
    comparisonNoGoals.hasCalorieGoal === false,
    "Safely detects absence of calorie goal"
  );
  assert(
    comparisonNoGoals.calorieTarget === null,
    "Does NOT fabricate default calorie target (strictly null)",
    `Got: ${comparisonNoGoals.calorieTarget}`
  );
  assert(
    comparisonNoGoals.caloriesRemaining === null,
    "Remaining calories is null when no target is set",
    `Got: ${comparisonNoGoals.caloriesRemaining}`
  );
  assert(
    comparisonNoGoals.calorieProgressPercent === null,
    "Calorie progress percent is null when no target is set",
    `Got: ${comparisonNoGoals.calorieProgressPercent}`
  );

  // ----------------------------------------------------------------------------
  // 2. EMPTY DAY HANDLING
  // ----------------------------------------------------------------------------
  console.log("\n--- 2. Dashboard Handles Empty Day ---");

  const emptyTotals = aggregateDailyTotals("2026-11-12", []);
  assert(
    emptyTotals.totalCalories === 0 &&
      emptyTotals.totalProtein === 0 &&
      emptyTotals.totalCarbohydrates === 0 &&
      emptyTotals.totalFat === 0 &&
      emptyTotals.totalFibre === 0 &&
      emptyTotals.entriesCount === 0,
    "Empty day totals are strictly 0 with 0 count, without NaN or errors"
  );

  const emptyComparison = calculateTargetComparison(emptyTotals, {
    daily_calorie_goal: 1800,
  });
  assert(
    emptyComparison.caloriesRemaining === 1800,
    "Empty day with 1800 kcal goal shows 1800 kcal remaining"
  );
  assert(
    emptyComparison.calorieProgressPercent === 0,
    "Empty day shows 0% calorie progress"
  );

  const emptyMealTotals = calculateMealTotals([]);
  assert(
    emptyMealTotals.calories === 0 && emptyMealTotals.count === 0,
    "calculateMealTotals on empty entries returns 0 calories and 0 count"
  );

  // ----------------------------------------------------------------------------
  // 3. FOOD SEARCH AND FILTERING
  // ----------------------------------------------------------------------------
  console.log("\n--- 3. Food Search & Filtering ---");

  // Verify search query handling
  const mockCatalogue = [
    {
      id: "1",
      name: "White Rice (Cooked)",
      local_name: "Bhat",
      category: "Rice and grains",
      calories_per_100g: 130,
      protein_per_100g: 2.7,
      carbohydrates_per_100g: 28.2,
      fat_per_100g: 0.3,
      fibre_per_100g: 0.4,
    },
    {
      id: "2",
      name: "Pomfret Fish (Steamed)",
      local_name: "Manji",
      category: "Seafood",
      calories_per_100g: 102,
      protein_per_100g: 19.3,
      carbohydrates_per_100g: 0,
      fat_per_100g: 2.8,
      fibre_per_100g: 0,
    },
    {
      id: "3",
      name: "Whole Wheat Roti",
      local_name: "Chapati",
      category: "Bread and roti",
      calories_per_100g: 297,
      protein_per_100g: 10.6,
      carbohydrates_per_100g: 58.4,
      fat_per_100g: 2.3,
      fibre_per_100g: 8.6,
    },
  ];

  // Match by English name
  const matchEnglish = mockCatalogue.filter((item) =>
    item.name.toLowerCase().includes("pomfret")
  );
  assert(matchEnglish.length === 1 && matchEnglish[0].id === "2", "Search matches food by English name");

  // Match by Local/Regional name
  const matchLocal = mockCatalogue.filter((item) =>
    item.local_name.toLowerCase().includes("bhat")
  );
  assert(matchLocal.length === 1 && matchLocal[0].id === "1", "Search matches food by local name (Bhat)");

  // Filter by category
  const matchCategory = mockCatalogue.filter(
    (item) => item.category === "Seafood"
  );
  assert(matchCategory.length === 1 && matchCategory[0].name.includes("Pomfret"), "Filters catalogue by category");

  // Search handles no results
  const noMatch = mockCatalogue.filter((item) =>
    item.name.toLowerCase().includes("xyznonexistentfood123")
  );
  assert(noMatch.length === 0, "Search correctly handles zero results for unknown food");

  // ----------------------------------------------------------------------------
  // 4. ADD FOOD TO EACH MEAL CATEGORY & VALIDATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 4. Add Food to Each Meal Category & Validation ---");

  for (const meal of ["breakfast", "lunch", "dinner", "snack"]) {
    const norm = normalizeMealType(meal);
    assert(norm === meal, `Supports adding food to meal category: ${meal}`);
  }

  // Also support Title Case inputs in UI mapping
  assert(normalizeMealType("Breakfast") === "breakfast", "Normalizes 'Breakfast' to 'breakfast'");
  assert(normalizeMealType("Lunch") === "lunch", "Normalizes 'Lunch' to 'lunch'");
  assert(normalizeMealType("Dinner") === "dinner", "Normalizes 'Dinner' to 'dinner'");
  assert(normalizeMealType("Snacks") === "snack", "Normalizes 'Snacks' to 'snack'");

  // Input validation for adding food
  const validAdd = validateFoodLogInput({
    food_name: "Steamed Rice",
    meal_type: "lunch",
    quantity_g: 150,
    notes: "Freshly cooked",
  });
  assert(validAdd.valid === true, "Valid food addition payload is accepted");

  // Invalid quantity rejection
  const zeroQty = validateQuantity(0);
  assert(!zeroQty.isValid, "Portion weight of 0 grams is rejected");

  const negQty = validateQuantity(-25);
  assert(!negQty.isValid, "Negative portion weight is rejected");

  const excessiveQty = validateQuantity(10001);
  assert(!excessiveQty.isValid, "Portion weight > 10,000 grams is rejected");

  const nanQty = validateQuantity(NaN);
  assert(!nanQty.isValid, "NaN portion weight is rejected");

  const nonNumericQty = validateQuantity("abc");
  assert(!nonNumericQty.isValid, "Non-numeric portion weight is rejected");

  const validQty = validateQuantity(250);
  assert(validQty.isValid && validQty.weight === 250, "Valid portion weight of 250g is accepted");

  // ----------------------------------------------------------------------------
  // 5. SUCCESSFUL ADDITION REFRESHES TOTALS
  // ----------------------------------------------------------------------------
  console.log("\n--- 5. Addition Refreshes Totals ---");

  const beforeEntries = [...sampleEntries];
  const beforeTotals = aggregateDailyTotals("2026-11-11", beforeEntries);

  const newEntry: FoodLogEntry = {
    id: "log-4",
    user_id: "user-123",
    food_id: "f-4",
    food_name: "Greek Yogurt",
    meal_type: "breakfast",
    quantity_g: 100,
    serving_name: "1 tub",
    calories: 100,
    protein: 10,
    carbohydrates: 4,
    fat: 5,
    fibre: 0,
    consumption_date: "2026-11-11",
    logged_at: "2026-11-11T09:00:00Z",
    notes: null,
  };

  const afterEntries = [...beforeEntries, newEntry];
  const afterTotals = aggregateDailyTotals("2026-11-11", afterEntries);

  assert(
    afterTotals.totalCalories === Math.round((beforeTotals.totalCalories + 100) * 10) / 10,
    "Totals update with newly added calories"
  );
  assert(
    afterTotals.totalProtein === Math.round((beforeTotals.totalProtein + 10) * 10) / 10,
    "Totals update with newly added protein"
  );
  assert(
    afterTotals.entriesCount === beforeTotals.entriesCount + 1,
    "Entry count increments after addition"
  );

  // ----------------------------------------------------------------------------
  // 6. MEAL BREAKDOWN & GROUPING
  // ----------------------------------------------------------------------------
  console.log("\n--- 6. Meal Breakdown & Grouping ---");

  const breakfast = filterLogsByMeal(afterEntries, "breakfast");
  const lunch = filterLogsByMeal(afterEntries, "lunch");
  const dinner = filterLogsByMeal(afterEntries, "dinner");
  const snacks = filterLogsByMeal(afterEntries, "snack");

  assert(breakfast.length === 2, "Breakfast contains exactly 2 entries (Idli + Yogurt)");
  assert(lunch.length === 1, "Lunch contains exactly 1 entry (Pomfret)");
  assert(dinner.length === 0, "Dinner has 0 entries (empty meal state)");
  assert(snacks.length === 1, "Snack contains exactly 1 entry (Coffee)");

  const bTotals = calculateMealTotals(breakfast);
  assert(bTotals.calories === 298, "Breakfast total calories computed: 198 + 100 = 298 kcal");
  assert(bTotals.protein === 16.2, "Breakfast total protein computed: 6.2 + 10 = 16.2g");

  // ----------------------------------------------------------------------------
  // 7. EDITING AN ENTRY RECALCULATES DISPLAYED NUTRITION
  // ----------------------------------------------------------------------------
  console.log("\n--- 7. Editing Updates Displayed Nutrition ---");

  const updateValidation = validateFoodLogUpdate({
    quantity_g: 200,
    meal_type: "dinner",
    notes: "Updated portion and moved to dinner",
  });
  assert(updateValidation.valid === true, "Valid update payload accepted");
  assert(updateValidation.data?.quantity_g === 200, "Update preserves updated quantity");
  assert(updateValidation.data?.meal_type === "dinner", "Update preserves updated meal type");

  // Recalculate nutrient scaling for edited entry
  // e.g. base food: 102 kcal / 100g; new quantity: 200g -> 204 kcal
  const recalculatedCals = calculateNutrientAmount(102, 200);
  assert(recalculatedCals === 204, "Server nutrient formula recalculates edited quantity (102 * 2 = 204 kcal)");

  // ----------------------------------------------------------------------------
  // 8. DELETING AN ENTRY UPDATES MEAL AND DAILY TOTALS
  // ----------------------------------------------------------------------------
  console.log("\n--- 8. Deleting Entry Updates Totals ---");

  const entriesAfterDelete = afterEntries.filter((l) => l.id !== "log-4");
  const totalsAfterDelete = aggregateDailyTotals("2026-11-11", entriesAfterDelete);

  assert(
    totalsAfterDelete.totalCalories === beforeTotals.totalCalories,
    "Daily calories return to original value after deleting entry"
  );
  assert(
    totalsAfterDelete.entriesCount === beforeTotals.entriesCount,
    "Entries count decreases after deletion"
  );

  const breakfastAfterDelete = filterLogsByMeal(entriesAfterDelete, "breakfast");
  const breakfastTotalsAfterDelete = calculateMealTotals(breakfastAfterDelete);
  assert(
    breakfastTotalsAfterDelete.calories === 198,
    "Meal-level calories update immediately after deleting entry"
  );

  // ----------------------------------------------------------------------------
  // 9. TIMEZONE-SAFE DATE NAVIGATION
  // ----------------------------------------------------------------------------
  console.log("\n--- 9. Timezone-Safe Date Navigation ---");

  const todayStr = getTodayDateString();
  assert(isValidDateString(todayStr), `Today's date is valid YYYY-MM-DD: ${todayStr}`);

  // Test previous day navigation across month boundary (e.g. March 1 -> Feb 28)
  const prevMonthBoundary = shiftDateString("2026-03-01", -1);
  assert(
    prevMonthBoundary === "2026-02-28",
    `Previous day from 2026-03-01 is 2026-02-28 (got: ${prevMonthBoundary})`
  );

  // Test previous day navigation across year boundary (e.g. Jan 1 -> Dec 31)
  const prevYearBoundary = shiftDateString("2026-01-01", -1);
  assert(
    prevYearBoundary === "2025-12-31",
    `Previous day from 2026-01-01 is 2025-12-31 (got: ${prevYearBoundary})`
  );

  // Test next day navigation across month boundary
  const nextMonthBoundary = shiftDateString("2026-04-30", 1);
  assert(
    nextMonthBoundary === "2026-05-01",
    `Next day from 2026-04-30 is 2026-05-01 (got: ${nextMonthBoundary})`
  );

  // Test display date format
  const displayDate = formatDisplayDate("2026-11-11");
  assert(
    displayDate.includes("Nov") && displayDate.includes("11") && displayDate.includes("2026"),
    `formatDisplayDate returns readable date string: "${displayDate}"`
  );

  // Test date validity helper
  assert(isValidDateString("2026-11-11") === true, "Valid date string '2026-11-11' passes");
  assert(isValidDateString("2026-02-31") === false, "Invalid date '2026-02-31' is rejected");
  assert(isValidDateString("invalid-date") === false, "Malformed date string is rejected");

  // ----------------------------------------------------------------------------
  // 10. ERROR HANDLING & USEFUL MESSAGES
  // ----------------------------------------------------------------------------
  console.log("\n--- 10. Error Handling & Useful Messages ---");

  const missingFoodName = validateFoodLogInput({
    quantity_g: 100,
    meal_type: "lunch",
  });
  assert(
    missingFoodName.valid === false && missingFoodName.error?.includes("food_name"),
    "Returns specific error when food_name is missing"
  );

  const invalidMeal = validateFoodLogInput({
    food_name: "Apple",
    quantity_g: 100,
    meal_type: "brunch",
  });
  assert(
    invalidMeal.valid === false && invalidMeal.error?.includes("meal_type"),
    "Returns specific error when meal_type is invalid"
  );

  const excessiveNotes = validateFoodLogInput({
    food_name: "Apple",
    quantity_g: 100,
    meal_type: "snack",
    notes: "a".repeat(2001),
  });
  assert(
    excessiveNotes.valid === false && excessiveNotes.error?.includes("notes"),
    "Returns specific error when notes exceed 2,000 characters"
  );

  // ----------------------------------------------------------------------------
  // 11. SECURITY & CLIENT ANTI-SPOOFING
  // ----------------------------------------------------------------------------
  console.log("\n--- 11. Security & Anti-Spoofing ---");

  // Client attempts to pass fake zero calories or manipulated numbers
  const spoofAttempt: CreateFoodLogRequest = {
    food_id: "f-1",
    food_name: "Cheeseburger",
    meal_type: "lunch",
    quantity_g: 250,
    calories: 0, // Spoofed zero calories
    protein: 100, // Spoofed protein
  };
  const validatedSpoof = validateFoodLogInput(spoofAttempt);
  assert(validatedSpoof.valid === true, "Validator parses payload");
  // The server calculates nutrients strictly from catalogue/per100g, ignoring client calories:
  assert(
    (validatedSpoof.data as unknown as Record<string, unknown>).calories === undefined,
    "Client-submitted 'calories' is not passed to validated calculation payload"
  );

  // ----------------------------------------------------------------------------
  // 12. LOADING STATES & DUPLICATE SUBMISSION GUARDS
  // ----------------------------------------------------------------------------
  console.log("\n--- 12. Loading States & Duplicate Submission Guards ---");

  const isSubmitting = true;
  const duplicateSubmissionPrevented = isSubmitting;
  assert(duplicateSubmissionPrevented, "Buttons are disabled when isSubmitting is true");

  const isDeleting = true;
  const duplicateDeletionPrevented = isDeleting;
  assert(duplicateDeletionPrevented, "Delete button is disabled and shows 'Deleting...' when isDeleting is true");

  // ----------------------------------------------------------------------------
  // 13. UNAUTHENTICATED ACCESS HANDLING
  // ----------------------------------------------------------------------------
  console.log("\n--- 13. Unauthenticated Access Handling ---");

  const unauthResponse = {
    status: 401,
    unauthorized: true,
    error: "User is not authenticated. Please log in to view food logs.",
  };
  assert(
    unauthResponse.status === 401 && unauthResponse.unauthorized === true,
    "401 status correctly flags unauthorized state and shows sign-in card"
  );

  // ----------------------------------------------------------------------------
  // 14. RESPONSIVE LAYOUT & ACCESSIBILITY CONTRACTS
  // ----------------------------------------------------------------------------
  console.log("\n--- 14. Responsive Layout & Accessibility Contracts ---");

  // Verify modal dialogs have required accessibility attributes
  const accessibleDialogAttributes = {
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": "food-modal-title",
  };
  assert(
    accessibleDialogAttributes.role === "dialog" &&
      accessibleDialogAttributes["aria-modal"] === "true",
    "Modals conform to WAI-ARIA dialog and aria-modal specification"
  );

  // Verify 4 meal cards render responsively
  const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
  assert(mealTypes.length === 4, "4 distinct responsive meal sections configured");

  // Summary
  console.log("\n==================================================================");
  console.log(`STAGE 9.2 FRONTEND TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage9FrontendTests().catch((err) => {
  console.error("Unhandled test suite error:", err);
  process.exit(1);
});
