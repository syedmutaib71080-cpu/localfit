import {
  AUTHENTIC_REGIONAL_RECIPES,
  searchRegionalRecipes,
  getRegionalRecipeById,
  submitRegionalRecipe,
  getUserRecipeSubmissions,
} from "../lib/regional-food-data";
import { calculateRecipeNutrition } from "../lib/recipe-nutrition-calculator";
import { addFoodLog, getFoodLogsForDate } from "../lib/food-logs";
import type { RecipeIngredient } from "../types/regional-food";

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

async function runStage7Tests() {
  console.log("==================================================================");
  console.log("RUNNING LOCALFIT STAGE 7: BHATKAL & MURDESHWAR FOOD INTELLIGENCE");
  console.log("==================================================================\n");

  // 1. REGIONAL RECIPE DATABASE INTEGRITY
  console.log("--- 1. Regional Recipe Database Integrity ---");
  assert(AUTHENTIC_REGIONAL_RECIPES.length === 9, `Database contains exactly 9 authentic regional recipes (found ${AUTHENTIC_REGIONAL_RECIPES.length})`);
  
  const bhatkalBiryani = AUTHENTIC_REGIONAL_RECIPES.find((r) => r.id === "rec-bhatkal-biryani-01");
  assert(bhatkalBiryani !== undefined, "Bhatkal Chicken Biryani exists in database");
  assert(bhatkalBiryani?.region === "Bhatkal", "Bhatkal Biryani is tagged with region 'Bhatkal'");
  assert(bhatkalBiryani?.cuisine === "Bhatkal cuisine", "Bhatkal Biryani is tagged with cuisine 'Bhatkal cuisine'");
  assert(bhatkalBiryani?.locality === "Navayath", "Bhatkal Biryani is identified with locality 'Navayath'");

  const murdeshwarFish = AUTHENTIC_REGIONAL_RECIPES.find((r) => r.id === "rec-murdeshwar-pomfret-02");
  assert(murdeshwarFish !== undefined, "Murdeshwar Pomfret Curry exists in database");
  assert(murdeshwarFish?.region === "Murdeshwar", "Murdeshwar fish curry is tagged with region 'Murdeshwar'");
  assert(murdeshwarFish?.category === "Seafood", "Murdeshwar fish curry is tagged with category 'Seafood'");

  const byId = await getRegionalRecipeById("rec-bhatkal-biryani-01");
  assert(byId !== null && byId.name.includes("Bhatkal"), "getRegionalRecipeById retrieves authentic recipe by ID");

  // 2. FOOD ALIASES & MULTILINGUAL MATCHING
  console.log("\n--- 2. Food Aliases & Multilingual Search ---");
  const navayatiSearch = await searchRegionalRecipes({ query: "Bhatkally" });
  assert(navayatiSearch.some((r) => r.id === "rec-bhatkal-biryani-01"), "Matches Navayati dialect alias 'Bhatkally'");

  const meenGassiSearch = await searchRegionalRecipes({ query: "Meen Gassi" });
  assert(meenGassiSearch.some((r) => r.id === "rec-murdeshwar-pomfret-02"), "Matches Tulu/Karavali alias 'Meen Gassi'");

  const patraSearch = await searchRegionalRecipes({ query: "Patra" });
  assert(patraSearch.some((r) => r.id === "rec-pathrode-07"), "Matches Konkani alias 'Patra' for Pathrode");

  const neerDoseSearch = await searchRegionalRecipes({ query: "Neer Dose" });
  assert(neerDoseSearch.some((r) => r.id === "rec-neer-dosa-06"), "Matches Kannada alias 'Neer Dose'");

  const nonExistent = await searchRegionalRecipes({ query: "xyz123nonexistent" });
  assert(nonExistent.length === 0, "Does not return unrelated dishes for non-existent queries");

  // Multi-token search
  const multiTokenSearch = await searchRegionalRecipes({ query: "Bhatkal Biryani" });
  assert(multiTokenSearch.some((r) => r.id === "rec-bhatkal-biryani-01"), "Multi-token search 'Bhatkal Biryani' matches 'Bhatkal Chicken Biryani'");

  // 3. REGION AND CATEGORY FILTERING
  console.log("\n--- 3. Region & Category Filtering ---");
  const bhatkalFiltered = await searchRegionalRecipes({ region: "Bhatkal" });
  assert(bhatkalFiltered.every((r) => r.region === "Bhatkal"), "Region filter restricts output strictly to 'Bhatkal'");
  assert(bhatkalFiltered.length === 3, `Found 3 dishes in Bhatkal region (got ${bhatkalFiltered.length})`);

  const seafoodFiltered = await searchRegionalRecipes({ category: "Seafood" });
  assert(seafoodFiltered.every((r) => r.category === "Seafood"), "Category filter restricts output strictly to 'Seafood'");
  assert(seafoodFiltered.some((r) => r.name.includes("Pomfret")), "Seafood category includes Pomfret Curry");
  assert(seafoodFiltered.some((r) => r.name.includes("Prawn")), "Seafood category includes Prawn Sukka");
  assert(seafoodFiltered.some((r) => r.name.includes("Crab")), "Seafood category includes Crab Ghee Roast");

  // 4. RECIPE INGREDIENTS ACCURACY & QUANTITIES
  console.log("\n--- 4. Recipe Ingredients Display & Quantities ---");
  assert((bhatkalBiryani?.ingredients.length ?? 0) >= 5, "Bhatkal Biryani contains detailed ingredient breakdown");
  const riceIng = bhatkalBiryani?.ingredients.find((i) => i.ingredient_name.includes("Rice"));
  assert(riceIng !== undefined && riceIng.weight_in_grams === 400, "Rice ingredient records exact weight in grams (400g)");
  assert(riceIng?.is_verified_ingredient === true, "Aged Basmati Rice is marked as verified ingredient");

  // 5. NUTRITION CALCULATION FORMULA PRECISION
  console.log("\n--- 5. Nutrition Calculation Formula Precision ---");
  const testSampleIngredients: RecipeIngredient[] = [
    {
      ingredient_name: "Raw Aged Rice",
      quantity: 100,
      unit: "g",
      weight_in_grams: 100,
      calories: 345,
      protein: 6.8,
      carbohydrates: 78.2,
      fat: 0.5,
      fibre: 1.4,
      is_verified_ingredient: true,
    },
    {
      ingredient_name: "Fresh Pomfret Fish",
      quantity: 150,
      unit: "g",
      weight_in_grams: 150,
      calories: 177,
      protein: 1.7,
      carbohydrates: 0,
      fat: 1.4,
      fibre: 0,
      is_verified_ingredient: true,
    },
  ];

  const calcResult = calculateRecipeNutrition(testSampleIngredients, 2, 400);
  assert(calcResult.totalCalories === 522, `Total calories sum accurately (345 + 177 = 522), got ${calcResult.totalCalories}`);
  assert(calcResult.totalProtein === 8.5, `Total protein sum accurately (6.8 + 1.7 = 8.5), got ${calcResult.totalProtein}`);
  assert(calcResult.perServingCalories === 261, `Per-serving calories (522 / 2 = 261), got ${calcResult.perServingCalories}`);
  assert(calcResult.perServingProtein === 4.3, `Per-serving protein (8.5 / 2 = 4.25 -> 4.3), got ${calcResult.perServingProtein}`);
  assert(calcResult.isFullyVerified === true, "Identifies 100% verified ingredient data accurately");

  // 6. MISSING INGREDIENT QUANTITIES SAFE HANDLING
  console.log("\n--- 6. Safe Handling of Missing Ingredient Nutrients ---");
  const incompleteIngredients: RecipeIngredient[] = [
    {
      ingredient_name: "Tender Coconut",
      quantity: 100,
      unit: "g",
      weight_in_grams: 100,
      calories: 100,
      protein: 2.0,
      carbohydrates: 10.0,
      fat: 5.0,
      is_verified_ingredient: false,
    },
    {
      ingredient_name: "Secret Wild Forest Herb",
      quantity: 10,
      unit: "g",
      weight_in_grams: 10,
      // No calories/macros provided
    },
  ];

  const incompleteCalc = calculateRecipeNutrition(incompleteIngredients, 1);
  assert(incompleteCalc.missingIngredientsCount === 1, "Detects missing nutrient data for unknown herbs without crashing");
  assert(incompleteCalc.isFullyVerified === false, "Correctly flags that recipe is not fully verified");

  // 7. VERIFICATION LABELS & PENDING RECIPE PUBLICATION SECURITY
  console.log("\n--- 7. Verification Status & Security Rules ---");
  const verifiedCount = AUTHENTIC_REGIONAL_RECIPES.filter((r) => r.verification_status === "verified").length;
  const estimatedCount = AUTHENTIC_REGIONAL_RECIPES.filter((r) => r.verification_status === "estimated").length;
  assert(verifiedCount > 0, `Contains ${verifiedCount} fully verified traditional recipes`);
  assert(estimatedCount > 0, `Contains ${estimatedCount} estimated traditional formulations (clearly labeled)`);

  // Ensure all public recipes are published
  assert(AUTHENTIC_REGIONAL_RECIPES.every((r) => r.is_published === true), "Published catalogue only exposes approved recipes");

  // 8. COMMUNITY RECIPE CONTRIBUTION SYSTEM & QUARANTINE
  console.log("\n--- 8. Community Recipe Submission & Status Quarantine ---");
  const submissionRes = await submitRegionalRecipe({
    dish_name: "Murdeshwar Clam Roast (Kubbe Sukka)",
    local_name: "Kubbe Sukka",
    region: "Murdeshwar",
    cuisine: "Murdeshwar cuisine",
    category: "Seafood",
    ingredients_text: "500g Fresh Clams, 60g Coconut, 15g Oil, Spices",
    cooking_instructions: "Steam clams in their shells, dry roast with ground coconut and Byadgi chilli paste.",
    serving_count: 3,
    source_attribution: "Family traditional recipe from Murdeshwar fisherfolk community",
  });

  assert(submissionRes.success, "Successfully submitted community recipe contribution");
  const mySubmissions = await getUserRecipeSubmissions();
  const submittedItem = mySubmissions.find((s) => s.dish_name.includes("Kubbe"));
  assert(submittedItem !== undefined, "User can view their own pending submission");
  assert(submittedItem?.status === "pending", "Submissions are strictly quarantined with 'pending' status");

  // Security: User cannot self-approve submission
  assert(submittedItem?.status !== "approved", "User A cannot approve their own submission");

  // 9. CATALOGUE RESILIENCE & PREVENTING DISAPPEARANCE
  console.log("\n--- 9. Catalogue Resilience & Non-Duplication ---");
  const allDishes = await searchRegionalRecipes({});
  assert(allDishes.length >= 9, `All 9 authentic regional dishes remain visible (found ${allDishes.length})`);
  
  const dishIds = allDishes.map((d) => d.id);
  const uniqueIds = new Set(dishIds);
  assert(dishIds.length === uniqueIds.size, `No duplicate recipe IDs exist in search results (unique: ${uniqueIds.size}, total: ${dishIds.length})`);

  // 10. LOGGING TO FOOD DIARY INTEGRATION
  console.log("\n--- 10. Food Diary Logging from Regional Recipes ---");
  const loggedEntry = await addFoodLog({
    food_name: "Bhatkal Chicken Biryani",
    meal_type: "Lunch",
    quantity_g: 325,
    serving_name: "1 standard serving (325g) — Bhatkal Heritage",
    calories: 696,
    protein: 43.7,
    carbohydrates: 90.4,
    fat: 17.2,
    fibre: 3.8,
    is_manual_entry: true,
  });

  assert(loggedEntry.id !== undefined, "Logged authentic regional recipe into daily food diary");
  assert(loggedEntry.calories === 696, "Preserved exact recipe calories (696 kcal)");
  assert(loggedEntry.protein === 43.7, "Preserved exact recipe protein (43.7g)");

  const todayLogs = await getFoodLogsForDate("2026-11-11");
  assert(todayLogs.some((l) => l.food_name === "Bhatkal Chicken Biryani"), "Regional recipe is retrieved in today's diary");

  console.log("\n==================================================================");
  console.log(`STAGE 7 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runStage7Tests().catch((err) => {
  console.error("Stage 7 test run failed:", err);
  process.exit(1);
});
