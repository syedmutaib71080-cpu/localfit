import { VERIFIED_FOOD_DATABASE } from "@/lib/food-data";
import { AUTHENTIC_REGIONAL_RECIPES } from "@/lib/regional-food-data";
import {
  PRIMARY_MODEL,
  FALLBACK_MODEL,
  API_BASE_URL,
  GEMINI_TOTAL_BUDGET_MS,
  GEMINI_MIN_REMAINING_FOR_CALL_MS,
  parseGeminiQuotaError,
  getPrimaryModelCooldown,
} from "@/lib/ai-assistant";
import type { MinimalNutritionContext } from "@/types/assistant";
import type {
  MealCategory,
  MealSuggestionItem,
  MealSuggestionsSummary,
  MealSuggestionsResponse,
} from "@/types/meal-suggestions";

export { MinimalNutritionContext };

export const MANDATORY_MEAL_DISCLAIMER =
  "Meal suggestions are generated for general wellness and educational purposes based on available calorie and protein targets. They are not medical nutritional therapies or clinical prescriptions. Consult a qualified healthcare professional or dietitian for medical dietary needs.";

// ----------------------------------------------------------------------------
// Rate Limiter: In-Memory Sliding Window (20 req / 5 min per user)
// ----------------------------------------------------------------------------
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const suggestionsRateLimitMap = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;

export function checkMealSuggestionsRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = suggestionsRateLimitMap.get(identifier);

  if (!record || now >= record.resetAt) {
    suggestionsRateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  record.count += 1;
  return true;
}

export function resetMealSuggestionsRateLimit(identifier?: string): void {
  if (identifier) {
    suggestionsRateLimitMap.delete(identifier);
  } else {
    suggestionsRateLimitMap.clear();
  }
}

// ----------------------------------------------------------------------------
// Remaining Budget Calculation
// ----------------------------------------------------------------------------
export function calculateRemainingBudget(
  calorieGoal: number | null,
  proteinGoal: number | null,
  caloriesConsumed: number,
  proteinConsumed: number
): {
  caloriesRemaining: number | null;
  proteinRemaining: number | null;
} {
  const safeCaloriesConsumed = Math.max(0, Math.round(caloriesConsumed || 0));
  const safeProteinConsumed = Math.max(0, Math.round(proteinConsumed || 0));

  const caloriesRemaining =
    calorieGoal !== null && calorieGoal !== undefined && calorieGoal > 0
      ? Math.max(0, calorieGoal - safeCaloriesConsumed)
      : null;

  const proteinRemaining =
    proteinGoal !== null && proteinGoal !== undefined && proteinGoal > 0
      ? Math.max(0, proteinGoal - safeProteinConsumed)
      : null;

  return {
    caloriesRemaining,
    proteinRemaining,
  };
}

// ----------------------------------------------------------------------------
// Catalogue Matching & Verification
// ----------------------------------------------------------------------------
export interface CatalogueMatchResult {
  isMatch: boolean;
  isVerified: boolean;
  isAiEstimate: boolean;
  catalogueId: string | null;
  recipeId: string | null;
  source: string | null;
  canonicalName: string;
  localName: string | null;
  standardServing: string;
  portionGrams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number | null;
  confidenceNote: string;
}

export function matchFoodWithCatalogue(name: string): CatalogueMatchResult | null {
  if (!name || typeof name !== "string") return null;
  const cleanName = name.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");

  // 1. Search AUTHENTIC_REGIONAL_RECIPES first (Coastal Karnataka & Navayath heritage recipes)
  for (const recipe of AUTHENTIC_REGIONAL_RECIPES) {
    const recipeNameClean = recipe.name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    const localNameClean = (recipe.local_name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");

    if (
      cleanName === recipeNameClean ||
      (localNameClean && cleanName === localNameClean) ||
      recipeNameClean.includes(cleanName) ||
      cleanName.includes(recipeNameClean)
    ) {
      const isVerifiedStatus = recipe.verification_status === "verified";
      return {
        isMatch: true,
        isVerified: isVerifiedStatus,
        isAiEstimate: !isVerifiedStatus,
        catalogueId: null,
        recipeId: recipe.id,
        source: recipe.source || "Coastal Karnataka Culinary Heritage Archive",
        canonicalName: recipe.name,
        localName: recipe.local_name || null,
        standardServing: `1 serving (${recipe.cooked_weight_per_serving_g || 150}g)`,
        portionGrams: Number(recipe.cooked_weight_per_serving_g) || 150,
        calories: Math.round(recipe.calories_per_serving),
        protein_g: Math.round(recipe.protein_per_serving * 10) / 10,
        carbs_g: Math.round(recipe.carbohydrates_per_serving * 10) / 10,
        fat_g: Math.round(recipe.fat_per_serving * 10) / 10,
        fibre_g: recipe.fibre_per_serving ? Math.round(recipe.fibre_per_serving * 10) / 10 : null,
        confidenceNote: isVerifiedStatus
          ? "Verified regional recipe composition"
          : "Estimated regional recipe nutrition based on standardized ingredients",
      };
    }
  }

  // 2. Search VERIFIED_FOOD_DATABASE (high scientific standard, ICMR-NIN / USDA)
  for (const food of VERIFIED_FOOD_DATABASE) {
    const foodNameClean = food.name.toLowerCase().replace(/[^a-z0-9 ]/g, "");
    const localNameClean = (food.local_name || "").toLowerCase().replace(/[^a-z0-9 ]/g, "");

    if (
      cleanName === foodNameClean ||
      (localNameClean && cleanName === localNameClean) ||
      foodNameClean.includes(cleanName) ||
      cleanName.includes(foodNameClean)
    ) {
      const defaultServing =
        food.servings?.find((s) => s.is_default) ||
        food.servings?.[0] || {
          serving_label: food.serving_name || "1 standard serving",
          weight_g: food.serving_weight_g ?? 100,
        };

      const portionWeight = Number(defaultServing.weight_g) || 100;
      const factor = portionWeight / 100;

      return {
        isMatch: true,
        isVerified: food.is_verified === true,
        isAiEstimate: food.is_verified !== true,
        catalogueId: food.id,
        recipeId: null,
        source: food.source || "LocalFit Verified Catalogue: ICMR-NIN IFCT 2017",
        canonicalName: food.name,
        localName: food.local_name || null,
        standardServing: defaultServing.serving_label,
        portionGrams: portionWeight,
        calories: Math.round(food.calories_per_100g * factor),
        protein_g: Math.round(food.protein_per_100g * factor * 10) / 10,
        carbs_g: Math.round(food.carbohydrates_per_100g * factor * 10) / 10,
        fat_g: Math.round(food.fat_per_100g * factor * 10) / 10,
        fibre_g: food.fibre_per_100g ? Math.round(food.fibre_per_100g * factor * 10) / 10 : null,
        confidenceNote: food.is_verified
          ? "Verified scientific nutrition from ICMR-NIN / USDA database"
          : "Estimated nutritional figures. Not verified against clinical database.",
      };
    }
  }

  return null;
}

// ----------------------------------------------------------------------------
// Output Item Validation & Sanitization
// ----------------------------------------------------------------------------
export function sanitizeSuggestionItem(
  raw: unknown,
  idSuffix = 1
): MealSuggestionItem | null {
  if (!raw || typeof raw !== "object") return null;

  const item = raw as Record<string, unknown>;

  // Validate food name
  const rawName = typeof item.food_name === "string" ? item.food_name.trim() : "";
  if (!rawName) return null;
  const foodName = rawName.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 100);

  // Validate meal category
  const rawCat = typeof item.meal_category === "string" ? item.meal_category.trim().toLowerCase() : "";
  let meal_category: MealCategory = "Lunch";
  if (rawCat === "breakfast") meal_category = "Breakfast";
  else if (rawCat === "lunch") meal_category = "Lunch";
  else if (rawCat === "dinner") meal_category = "Dinner";
  else if (rawCat === "snack" || rawCat === "snacks") meal_category = "Snacks";

  // Check catalogue match
  const catalogueMatch = matchFoodWithCatalogue(foodName);

  // Numeric bounds checking:
  // calories: 0-2500, protein: 0-150, carbs: 0-300, fat: 0-150, portion: 10-1500
  const parseBoundedNumber = (val: unknown, min: number, max: number, fallback: number): number => {
    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (isNaN(num) || !Number.isFinite(num)) return fallback;
    return Math.max(min, Math.min(max, Math.round(num * 10) / 10));
  };

  const portionGrams = catalogueMatch
    ? catalogueMatch.portionGrams
    : parseBoundedNumber(item.portion_grams, 10, 1500, 150);

  const calories = catalogueMatch
    ? catalogueMatch.calories
    : parseBoundedNumber(item.calories, 0, 2500, 250);

  const protein_g = catalogueMatch
    ? catalogueMatch.protein_g
    : parseBoundedNumber(item.protein_g ?? item.protein, 0, 150, 10);

  const carbs_g = catalogueMatch
    ? catalogueMatch.carbs_g
    : parseBoundedNumber(item.carbs_g ?? item.carbohydrates, 0, 300, 30);

  const fat_g = catalogueMatch
    ? catalogueMatch.fat_g
    : parseBoundedNumber(item.fat_g ?? item.fat, 0, 150, 5);

  const rawWhy = typeof item.why_suggested === "string" ? item.why_suggested.trim() : "";
  const why_suggested = rawWhy
    ? rawWhy.replace(/[\x00-\x1F\x7F]/g, "").slice(0, 300)
    : `Balanced ${meal_category.toLowerCase()} option providing ${protein_g}g protein and ${calories} kcal.`;

  const serving_size = catalogueMatch
    ? catalogueMatch.standardServing
    : typeof item.serving_size === "string" && item.serving_size.trim()
    ? item.serving_size.trim().slice(0, 80)
    : `1 serving (${portionGrams}g)`;

  // Strict rule: ONLY true verified catalogue entries may carry is_verified: true
  const is_verified = Boolean(catalogueMatch && catalogueMatch.isVerified);
  const is_ai_estimate = !is_verified;

  return {
    id: `sug-${Date.now()}-${idSuffix}`,
    meal_category,
    food_name: catalogueMatch ? catalogueMatch.canonicalName : foodName,
    local_name: catalogueMatch ? catalogueMatch.localName : (typeof item.local_name === "string" ? item.local_name : null),
    serving_size,
    portion_grams: portionGrams,
    calories,
    protein_g,
    carbs_g,
    fat_g,
    fibre_g: catalogueMatch ? catalogueMatch.fibre_g : null,
    why_suggested,
    is_verified,
    is_ai_estimate,
    catalogue_id: catalogueMatch ? catalogueMatch.catalogueId : null,
    recipe_id: catalogueMatch ? catalogueMatch.recipeId : null,
    source: catalogueMatch ? catalogueMatch.source : "AI Nutritional Estimation",
    confidence_note: catalogueMatch
      ? catalogueMatch.confidenceNote
      : "Estimated nutritional figures. Not verified against clinical database.",
  };
}

// ----------------------------------------------------------------------------
// High-Quality Deterministic Suggestions Generator
// (Catalogue-grounded, zero-hallucination baseline for offline/cooldown/fallback)
// ----------------------------------------------------------------------------
export function generateDeterministicMealSuggestions(
  context: MinimalNutritionContext,
  filterCategory: MealCategory | "All" = "All"
): MealSuggestionItem[] {
  const { caloriesRemaining, proteinRemaining } = calculateRemainingBudget(
    context.calorieGoal,
    context.proteinGoal,
    context.caloriesLogged,
    context.proteinLogged
  );

  // Determine user's current nutritional emphasis
  const isHighProteinNeeded =
    proteinRemaining !== null && proteinRemaining > 30;
  const isLowCalorieBudget =
    caloriesRemaining !== null && caloriesRemaining < 400;

  const loggedFoodNames = (context.loggedFoods || []).map((f) => f.name.toLowerCase());

  // Define structured pool of verified catalogue dishes and authentic regional recipes
  const suggestionPool: Array<{
    category: MealCategory;
    foodName: string;
    why: string;
    priority: "high_protein" | "light" | "balanced" | "regional";
  }> = [
    // --- BREAKFAST ---
    {
      category: "Breakfast",
      foodName: "Neer Dosa with Coconut Chutney",
      why: "Light, authentic Coastal Karnataka rice crepes paired with coconut chutney, gentle on digestion.",
      priority: "regional",
    },
    {
      category: "Breakfast",
      foodName: "Boiled Egg",
      why: isHighProteinNeeded
        ? "Fast, high-quality complete protein (12.6g for 2 eggs) to kickstart your daily protein target."
        : "Balanced breakfast protein source supporting steady morning energy.",
      priority: "high_protein",
    },
    {
      category: "Breakfast",
      foodName: "Roti (Whole Wheat)",
      why: "Complex carbohydrate flatbread providing steady fiber and sustained energy for the morning.",
      priority: "balanced",
    },

    // --- LUNCH ---
    {
      category: "Lunch",
      foodName: "Bhatkal Chicken Biryani",
      why: isLowCalorieBudget
        ? "Heritage Navayath dum-steamed rice and chicken; enjoy a measured portion to stay within remaining calories."
        : "Signature Coastal Karnataka specialty offering 43.7g of high-quality protein and rich local flavor.",
      priority: isHighProteinNeeded ? "high_protein" : "regional",
    },
    {
      category: "Lunch",
      foodName: "Toor Dal (Cooked)",
      why: "Nutrient-dense plant protein and dietary fiber staple, ideal with warm roti or rice.",
      priority: "balanced",
    },
    {
      category: "Lunch",
      foodName: "Curd (Plain Dahi)",
      why: "Refreshing, gut-friendly probiotic source that balances spicy coastal curries.",
      priority: isLowCalorieBudget ? "light" : "balanced",
    },

    // --- DINNER ---
    {
      category: "Dinner",
      foodName: "Murdeshwar Pomfret Curry (Meen Gassi)",
      why: "Traditional Karavali kokum-infused fish curry providing lean omega-rich seafood protein.",
      priority: "regional",
    },
    {
      category: "Dinner",
      foodName: "Chicken Breast (Grilled)",
      why: isHighProteinNeeded
        ? "Lean protein powerhouse (31g protein per 100g) ideal for closing your remaining protein deficit."
        : "Clean, low-fat protein option for an evening meal.",
      priority: "high_protein",
    },
    {
      category: "Dinner",
      foodName: "Pomfret Fish (Steamed)",
      why: "Light, easy-to-digest coastal fish fillet with high bioavailability and minimal fat.",
      priority: isLowCalorieBudget ? "light" : "high_protein",
    },

    // --- SNACKS ---
    {
      category: "Snacks",
      foodName: "Banana (Raw)",
      why: "Natural potassium-rich quick fuel, perfect for pre-workout or afternoon energy replenishment.",
      priority: "light",
    },
    {
      category: "Snacks",
      foodName: "Cow Milk (Toned)",
      why: "Comforting calcium and protein replenishment between main meals.",
      priority: "balanced",
    },
  ];

  // Filter out dishes the user already logged today to provide variety
  const availableSuggestions = suggestionPool.filter((item) => {
    const isAlreadyLogged = loggedFoodNames.some((loggedName) =>
      loggedName.includes(item.foodName.toLowerCase()) ||
      item.foodName.toLowerCase().includes(loggedName)
    );
    return !isAlreadyLogged;
  });

  const sourcePool = availableSuggestions.length >= 3 ? availableSuggestions : suggestionPool;

  // Filter by category if requested
  const filtered = filterCategory === "All"
    ? sourcePool
    : sourcePool.filter((item) => item.category === filterCategory);

  // Group and pick best representation per category
  const categories: MealCategory[] =
    filterCategory === "All"
      ? ["Breakfast", "Lunch", "Dinner", "Snacks"]
      : [filterCategory];

  const results: MealSuggestionItem[] = [];
  let idCounter = 1;

  for (const cat of categories) {
    const catItems = filtered.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;

    // Prioritize high-protein or light depending on context
    catItems.sort((a, b) => {
      if (isHighProteinNeeded && a.priority === "high_protein") return -1;
      if (isHighProteinNeeded && b.priority === "high_protein") return 1;
      if (isLowCalorieBudget && a.priority === "light") return -1;
      if (isLowCalorieBudget && b.priority === "light") return 1;
      return 0;
    });

    // Pick top 1 or 2 items per category
    const itemsToTake = filterCategory === "All" ? catItems.slice(0, 1) : catItems.slice(0, 3);

    for (const chosen of itemsToTake) {
      const match = matchFoodWithCatalogue(chosen.foodName);
      if (match) {
        let personalizedWhy = chosen.why;
        if (proteinRemaining !== null && proteinRemaining > 0 && match.protein_g > 15) {
          personalizedWhy += ` Delivers ${match.protein_g}g towards your remaining ${proteinRemaining}g protein goal.`;
        } else if (caloriesRemaining !== null && caloriesRemaining > 0) {
          personalizedWhy += ` Fits comfortably within your remaining ${caloriesRemaining} kcal allowance.`;
        }

        results.push({
          id: `sug-det-${cat.toLowerCase()}-${idCounter++}`,
          meal_category: cat,
          food_name: match.canonicalName,
          local_name: match.localName,
          serving_size: match.standardServing,
          portion_grams: match.portionGrams,
          calories: match.calories,
          protein_g: match.protein_g,
          carbs_g: match.carbs_g,
          fat_g: match.fat_g,
          fibre_g: match.fibre_g,
          why_suggested: personalizedWhy,
          is_verified: match.isVerified,
          is_ai_estimate: match.isAiEstimate,
          catalogue_id: match.catalogueId,
          recipe_id: match.recipeId,
          source: match.source,
          confidence_note: match.confidenceNote,
        });
      }
    }
  }

  return results;
}

// ----------------------------------------------------------------------------
// Prompt Builder for Gemini AI Meal Suggestions
// ----------------------------------------------------------------------------
export function buildMealSuggestionsPrompt(
  context: MinimalNutritionContext,
  filterCategory: MealCategory | "All" = "All"
): { systemInstruction: string; userPrompt: string } {
  const { caloriesRemaining, proteinRemaining } = calculateRemainingBudget(
    context.calorieGoal,
    context.proteinGoal,
    context.caloriesLogged,
    context.proteinLogged
  );

  const verifiedFoodNames = VERIFIED_FOOD_DATABASE.map((f) => f.name).slice(0, 15).join(", ");
  const regionalRecipeNames = AUTHENTIC_REGIONAL_RECIPES.map((r) => r.name).join(", ");

  const loggedSummary = context.hasLoggedMeals
    ? context.loggedFoods.map((f) => `- ${f.name} (${f.mealType}): ${f.calories} kcal, ${f.proteinGrams}g P`).join("\n")
    : "No meals logged yet today.";

  const systemInstruction = `You are LocalFit's AI Nutrition & Meal Planning Specialist.
Your task is to recommend personalized, culturally grounded meals for LocalFit users.

RULES & BOUNDARIES:
1. ONLY suggest meals that fit the user's remaining nutritional budget.
2. PREFER verified foods and authentic regional recipes from LocalFit's catalogue:
   - Verified Database Foods: ${verifiedFoodNames}
   - Authentic Coastal Karnataka Recipes: ${regionalRecipeNames}
3. If proposing a dish from the catalogue, cite its authentic name.
4. If suggesting a custom or unverified dish, understand that it will be tagged as an AI Estimate. Never claim an unverified dish is laboratory-verified.
5. If the user's calorie budget is low (< 350 kcal), recommend lighter, nutrient-dense portions.
6. If the user's protein deficit is high, recommend protein-dense foods (e.g. eggs, fish, chicken, dal).
7. If goals are unconfigured (null), recommend balanced, wholesome meals without fabricating targets.
8. NEVER invent impossible nutritional values. Keep portions realistic (75g to 400g) and calories sensible (50 to 900 kcal).
9. Output strictly a JSON array of suggestions conforming to the expected schema. No preamble, no markdown formatting outside JSON.`;

  const userPrompt = `Generate personalized meal suggestions for today.

USER NUTRITIONAL CONTEXT:
- Date: ${context.targetDate}
- Daily Calorie Target: ${context.calorieGoal !== null ? `${context.calorieGoal} kcal` : "Not configured"}
- Daily Protein Target: ${context.proteinGoal !== null ? `${context.proteinGoal}g` : "Not configured"}
- Calories Consumed Today: ${context.caloriesLogged} kcal
- Protein Consumed Today: ${context.proteinLogged}g
- Remaining Calories Budget: ${caloriesRemaining !== null ? `${caloriesRemaining} kcal` : "Open / unconfigured"}
- Remaining Protein Target: ${proteinRemaining !== null ? `${proteinRemaining}g` : "Open / unconfigured"}
- Meals Logged Today:
${loggedSummary}

REQUESTED MEAL CATEGORY: ${filterCategory} (If "All", provide one suggestion each for Breakfast, Lunch, Dinner, and Snacks).

Return a JSON array of objects with these exact keys:
[
  {
    "meal_category": "Breakfast" | "Lunch" | "Dinner" | "Snacks",
    "food_name": string,
    "local_name": string | null,
    "serving_size": string,
    "portion_grams": number,
    "calories": number,
    "protein_g": number,
    "carbs_g": number,
    "fat_g": number,
    "why_suggested": string
  }
]`;

  return { systemInstruction, userPrompt };
}

// ----------------------------------------------------------------------------
// Core Gemini AI Suggestions Engine
// ----------------------------------------------------------------------------
export interface GenerateMealSuggestionsParams {
  context: MinimalNutritionContext;
  filterCategory?: MealCategory | "All";
  apiKey?: string;
  fetchFn?: typeof fetch;
  totalBudgetMs?: number;
  minRemainingMs?: number;
}

export async function generateMealSuggestionsWithGemini(
  params: GenerateMealSuggestionsParams
): Promise<MealSuggestionsResponse> {
  const filterCat = params.filterCategory || "All";
  const { caloriesRemaining, proteinRemaining } = calculateRemainingBudget(
    params.context.calorieGoal,
    params.context.proteinGoal,
    params.context.caloriesLogged,
    params.context.proteinLogged
  );

  const summary: MealSuggestionsSummary = {
    calorie_goal: params.context.calorieGoal,
    protein_goal: params.context.proteinGoal,
    calories_consumed: params.context.caloriesLogged,
    protein_consumed: params.context.proteinLogged,
    calories_remaining: caloriesRemaining,
    protein_remaining: proteinRemaining,
    target_date: params.context.targetDate,
    logged_meal_count: params.context.loggedFoods.length,
  };

  const apiKey = params.apiKey || process.env.GEMINI_API_KEY;

  // Fallback to deterministic suggestions if API key is not configured
  if (!apiKey) {
    const deterministicSuggestions = generateDeterministicMealSuggestions(params.context, filterCat);
    return {
      success: true,
      suggestions: deterministicSuggestions,
      summary,
      disclaimer: MANDATORY_MEAL_DISCLAIMER,
    };
  }

  // Check optional in-memory cooldown optimization
  const cooldownUntil = getPrimaryModelCooldown();
  const isPrimaryCoolingDown = cooldownUntil > 0 && Date.now() < cooldownUntil;

  const modelsToTry: string[] = [];
  if (!isPrimaryCoolingDown) {
    modelsToTry.push(PRIMARY_MODEL);
  }
  modelsToTry.push(FALLBACK_MODEL);

  const totalBudgetMs = params.totalBudgetMs ?? GEMINI_TOTAL_BUDGET_MS;
  const minRemainingMs = params.minRemainingMs ?? GEMINI_MIN_REMAINING_FOR_CALL_MS;
  const deadline = Date.now() + totalBudgetMs;
  const fetchClient = params.fetchFn || fetch;

  const { systemInstruction, userPrompt } = buildMealSuggestionsPrompt(params.context, filterCat);

  const requestPayload = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 1200,
      responseMimeType: "application/json",
    },
  };

  let parsedSuggestions: MealSuggestionItem[] = [];

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const remainingMs = deadline - Date.now();

    if (remainingMs < minRemainingMs) {
      break;
    }

    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, remainingMs);

      const url = `${API_BASE_URL}/${model}:generateContent?key=${apiKey}`;
      const res = await fetchClient(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });

      if (!res.ok) {
        if (res.status === 429 || res.status === 503) {
          const errJson = await res.json().catch(() => null);
          parseGeminiQuotaError(errJson);
        }
        continue;
      }

      const data = (await res.json().catch(() => null)) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        let jsonArray: unknown = null;
        try {
          jsonArray = JSON.parse(rawText);
        } catch {
          // Attempt markdown codeblock strip if JSON parsing fails
          const match = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
          if (match) {
            jsonArray = JSON.parse(match[1]);
          }
        }

        if (Array.isArray(jsonArray)) {
          const sanitized = jsonArray
            .map((item, idx) => sanitizeSuggestionItem(item, idx + 1))
            .filter((item): item is MealSuggestionItem => item !== null);

          if (sanitized.length > 0) {
            parsedSuggestions = sanitized;
            break;
          }
        }
      }
    } catch {
      // Handled via fallback
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    }
  }

  // If Gemini output was empty, malformed, or timed out, gracefully return
  // high-quality, scientifically grounded deterministic suggestions
  if (parsedSuggestions.length === 0) {
    parsedSuggestions = generateDeterministicMealSuggestions(params.context, filterCat);
  }

  return {
    success: true,
    suggestions: parsedSuggestions,
    summary,
    disclaimer: MANDATORY_MEAL_DISCLAIMER,
  };
}
