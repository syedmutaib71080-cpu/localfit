import { VERIFIED_FOOD_DATABASE } from "@/lib/food-data";
import type { FoodItem } from "@/types/nutrition";
import type {
  FoodScanEstimate,
  FoodScanIngredient,
  FoodScanSource,
  IdentifiedFoodItem,
  ConfidenceLevel,
} from "@/types/food-scan";

interface RawModelItemOutput {
  food_name?: string;
  alternative_names?: string[];
  category?: string;
  portion_grams?: number;
  estimated_weight_g?: number;
  calories?: number;
  estimated_calories?: number;
  protein_g?: number;
  estimated_protein?: number;
  carbs_g?: number;
  estimated_carbohydrates?: number;
  fat_g?: number;
  estimated_fat?: number;
  fibre_g?: number | null;
  estimated_fibre?: number | null;
  confidence?: string | number;
  notes?: string;
  uncertainty_notes?: string;
}

interface RawModelScanOutput {
  is_food_detected?: boolean;
  meal_summary?: string;
  items?: RawModelItemOutput[];
  // Legacy / top-level fields
  food_name?: string;
  alternative_names?: string[];
  ingredients?: Array<{
    name?: string;
    estimated_weight_g?: number;
    confidence?: number;
    notes?: string;
  }>;
  cooking_method?: string;
  estimated_weight_g?: number;
  estimated_calories?: number;
  estimated_protein?: number;
  estimated_carbohydrates?: number;
  estimated_fat?: number;
  estimated_fibre?: number | null;
  confidence?: number | string;
  uncertainty_notes?: string;
}

/**
 * Normalizes text for reliable matching.
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Attempts to match detected food against verified LocalFit nutrition database.
 */
export function findDatabaseMatch(foodName: string): FoodItem | null {
  if (!foodName || foodName.trim().length === 0) return null;
  const clean = normalizeText(foodName);

  // 1. Direct or partial name match
  for (const item of VERIFIED_FOOD_DATABASE) {
    const itemNameClean = normalizeText(item.name);
    const itemLocalClean = item.local_name ? normalizeText(item.local_name) : "";

    if (clean === itemNameClean || clean === itemLocalClean) {
      return item;
    }
    if (itemNameClean.includes(clean) || clean.includes(itemNameClean)) {
      return item;
    }
    if (itemLocalClean && (itemLocalClean.includes(clean) || clean.includes(itemLocalClean))) {
      return item;
    }
  }

  // 2. High-priority keyword synonyms
  const synonymMap: Record<string, string> = {
    biryani: "Bhatkal Chicken Biryani",
    briyani: "Bhatkal Chicken Biryani",
    pulao: "Bhatkal Chicken Biryani",
    dosa: "Neer Dosa",
    dose: "Neer Dosa",
    pomfret: "Pomfret Fish (Steamed)",
    paplet: "Pomfret Fish (Steamed)",
    prawn: "Prawns / Shrimp (Cooked)",
    prawns: "Prawns / Shrimp (Cooked)",
    shrimp: "Prawns / Shrimp (Cooked)",
    egg: "Boiled Egg",
    motte: "Boiled Egg",
    rice: "White Rice (Cooked)",
    chawal: "White Rice (Cooked)",
    bhat: "White Rice (Cooked)",
    roti: "Roti (Whole Wheat)",
    chapati: "Roti (Whole Wheat)",
    phulka: "Roti (Whole Wheat)",
    chicken: "Chicken Breast (Grilled)",
    curd: "Curd (Plain Dahi)",
    dahi: "Curd (Plain Dahi)",
    yogurt: "Curd (Plain Dahi)",
    banana: "Banana (Raw)",
    apple: "Apple (with skin)",
  };

  const tokens = clean.split(" ");
  for (const token of tokens) {
    if (synonymMap[token]) {
      const targetName = synonymMap[token];
      const match = VERIFIED_FOOD_DATABASE.find(
        (f) => f.name.toLowerCase() === targetName.toLowerCase()
      );
      if (match) return match;
    }
  }

  return null;
}

/**
 * Converts a raw confidence value (number or string) into a structured ConfidenceLevel.
 */
export function parseConfidence(val: unknown): { level: ConfidenceLevel; score: number } {
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "high" || lower === "clear" || lower === "clearly identified") {
      return { level: "high", score: 92 };
    }
    if (lower === "medium" || lower === "probable" || lower === "moderate") {
      return { level: "medium", score: 75 };
    }
    if (lower === "low" || lower === "uncertain" || lower === "tentative") {
      return { level: "low", score: 45 };
    }
    const parsedNum = parseFloat(lower);
    if (!isNaN(parsedNum)) {
      return parseConfidence(parsedNum);
    }
  }

  const num = Number(val);
  if (!isNaN(num) && Number.isFinite(num)) {
    const clamped = Math.min(100, Math.max(0, Math.round(num)));
    if (clamped >= 85) return { level: "high", score: clamped };
    if (clamped >= 60) return { level: "medium", score: clamped };
    return { level: "low", score: clamped };
  }

  return { level: "medium", score: 70 };
}

/**
 * Sanitizes and validates a single identified food item from raw model output.
 */
export function sanitizeIdentifiedItem(
  rawItem: RawModelItemOutput,
  index: number
): IdentifiedFoodItem {
  const rawName = String(
    rawItem.food_name || rawItem.notes || `Identified Dish ${index + 1}`
  ).trim();

  // Validate portion weight: clamp between 10g and 2500g (default 150g)
  let portionG = Number(rawItem.portion_grams ?? rawItem.estimated_weight_g);
  if (isNaN(portionG) || !Number.isFinite(portionG) || portionG <= 0) {
    portionG = 150;
  } else {
    portionG = Math.min(2500, Math.max(10, Math.round(portionG)));
  }

  // Cross-reference with LocalFit verified food catalogue
  const dbMatch = findDatabaseMatch(rawName);

  let isCatalogueMatch = false;
  let calories: number | null = null;
  let protein: number | null = null;
  let carbs: number | null = null;
  let fat: number | null = null;
  let fibre: number | null = null;
  let nutritionPer100g: {
    calories: number | null;
    protein: number | null;
    carbohydrates: number | null;
    fat: number | null;
    fibre: number | null;
  };

  const { level: confidenceLevel, score: confidenceScore } = parseConfidence(rawItem.confidence);

  if (dbMatch) {
    isCatalogueMatch = true;
    calories = Math.round((dbMatch.calories_per_100g * portionG) / 100);
    protein = Math.round(((dbMatch.protein_per_100g * portionG) / 100) * 10) / 10;
    carbs = Math.round(((dbMatch.carbohydrates_per_100g * portionG) / 100) * 10) / 10;
    fat = Math.round(((dbMatch.fat_per_100g * portionG) / 100) * 10) / 10;
    fibre =
      dbMatch.fibre_per_100g !== null && dbMatch.fibre_per_100g !== undefined
        ? Math.round(((dbMatch.fibre_per_100g * portionG) / 100) * 10) / 10
        : null;

    nutritionPer100g = {
      calories: dbMatch.calories_per_100g,
      protein: dbMatch.protein_per_100g,
      carbohydrates: dbMatch.carbohydrates_per_100g,
      fat: dbMatch.fat_per_100g,
      fibre: dbMatch.fibre_per_100g ?? null,
    };
  } else {
    // Sanitize AI-estimated values
    const rawCal = rawItem.calories ?? rawItem.estimated_calories;
    const rawProt = rawItem.protein_g ?? rawItem.estimated_protein;
    const rawCarbs = rawItem.carbs_g ?? rawItem.estimated_carbohydrates;
    const rawFat = rawItem.fat_g ?? rawItem.estimated_fat;
    const rawFib = rawItem.fibre_g ?? rawItem.estimated_fibre;

    const safeProt =
      rawProt !== null && rawProt !== undefined && !isNaN(Number(rawProt))
        ? Math.max(0, Math.min(portionG, Math.round(Number(rawProt) * 10) / 10))
        : 0;

    const safeCarbs =
      rawCarbs !== null && rawCarbs !== undefined && !isNaN(Number(rawCarbs))
        ? Math.max(0, Math.min(portionG, Math.round(Number(rawCarbs) * 10) / 10))
        : 0;

    const safeFat =
      rawFat !== null && rawFat !== undefined && !isNaN(Number(rawFat))
        ? Math.max(0, Math.min(portionG, Math.round(Number(rawFat) * 10) / 10))
        : 0;

    // Macro physics check: macro sum should not exceed portion weight
    let adjProt = safeProt;
    let adjCarbs = safeCarbs;
    let adjFat = safeFat;
    const totalMacroMass = adjProt + adjCarbs + adjFat;
    if (totalMacroMass > portionG && totalMacroMass > 0) {
      const scale = (portionG * 0.95) / totalMacroMass;
      adjProt = Math.round(adjProt * scale * 10) / 10;
      adjCarbs = Math.round(adjCarbs * scale * 10) / 10;
      adjFat = Math.round(adjFat * scale * 10) / 10;
    }

    protein = adjProt;
    carbs = adjCarbs;
    fat = adjFat;

    // Calorie estimation & Atwater consistency
    let safeCalories =
      rawCal !== null && rawCal !== undefined && !isNaN(Number(rawCal))
        ? Math.max(0, Math.min(4000, Math.round(Number(rawCal))))
        : 0;

    const expectedAtwater = Math.round(adjProt * 4 + adjCarbs * 4 + adjFat * 9);
    if (safeCalories === 0 && expectedAtwater > 0) {
      safeCalories = expectedAtwater;
    } else if (safeCalories > 0 && expectedAtwater > 0) {
      if (Math.abs(safeCalories - expectedAtwater) > expectedAtwater * 0.5) {
        safeCalories = Math.round((safeCalories + expectedAtwater) / 2);
      }
    }
    calories = safeCalories;

    if (rawFib !== null && rawFib !== undefined && !isNaN(Number(rawFib))) {
      fibre = Math.max(0, Math.min(portionG, Math.round(Number(rawFib) * 10) / 10));
    } else {
      fibre = null;
    }

    // Standard per-100g values for dynamic portion recalculation
    const per100Multiplier = portionG > 0 ? 100 / portionG : 1;
    nutritionPer100g = {
      calories: Math.round(calories * per100Multiplier),
      protein: Math.round(protein * per100Multiplier * 10) / 10,
      carbohydrates: Math.round(carbs * per100Multiplier * 10) / 10,
      fat: Math.round(fat * per100Multiplier * 10) / 10,
      fibre: fibre !== null ? Math.round(fibre * per100Multiplier * 10) / 10 : null,
    };
  }

  // Alternative names
  const altNames: string[] = [];
  if (Array.isArray(rawItem.alternative_names)) {
    for (const alt of rawItem.alternative_names) {
      if (typeof alt === "string" && alt.trim() && !altNames.includes(alt.trim())) {
        altNames.push(alt.trim());
      }
    }
  }
  if (dbMatch && dbMatch.local_name && !altNames.includes(dbMatch.local_name)) {
    altNames.push(dbMatch.local_name);
  }

  // Category
  const category =
    rawItem.category?.trim() ||
    (dbMatch ? dbMatch.category : "Main Dishes");

  // Notes & uncertainty
  let notes = String(rawItem.notes || rawItem.uncertainty_notes || "").trim();
  if (!notes) {
    if (dbMatch) {
      notes = `Matched verified catalogue entry (${dbMatch.source || "LocalFit"}). Visual portion estimate.`;
    } else {
      notes =
        "Portion volume and hidden cooking fats/oils are estimated visually. Please adjust portion weight.";
    }
  }

  return {
    id: `item_${index + 1}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    food_name: rawName,
    alternative_names: altNames,
    category,
    portion_grams: portionG,
    calories,
    protein_g: protein,
    carbs_g: carbs,
    fat_g: fat,
    fibre_g: fibre,
    confidence: confidenceLevel,
    confidence_score: confidenceScore,
    notes,
    is_catalogue_match: isCatalogueMatch,
    matched_database_food_id: dbMatch ? dbMatch.id : null,
    matched_database_food_name: dbMatch ? dbMatch.name : null,
    nutrition_per_100g: nutritionPer100g,
    selected_for_saving: true,
  };
}

/**
 * Validates and sanitizes raw model output into a verified FoodScanEstimate.
 * Enforces nutritional physics bounds and flags uncertainties.
 */
export function validateAndSanitizeFoodScan(raw: unknown): FoodScanEstimate {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid scan result: output must be an object.");
  }

  const data = raw as RawModelScanOutput;

  // Check food detection flag
  const isFoodDetected =
    typeof data.is_food_detected === "boolean"
      ? data.is_food_detected
      : Boolean(
          (data.items && data.items.length > 0) ||
            (data.food_name && data.food_name.toLowerCase() !== "unknown" && data.food_name.toLowerCase() !== "no food detected")
        );

  if (!isFoodDetected) {
    return {
      is_food_detected: false,
      meal_summary: "No food detected",
      items: [],
      food_name: "No food detected",
      alternative_names: [],
      ingredients: [],
      cooking_method: "unknown",
      estimated_weight_g: 0,
      estimated_calories: 0,
      estimated_protein: 0,
      estimated_carbohydrates: 0,
      estimated_fat: 0,
      estimated_fibre: null,
      confidence: 0,
      uncertainty_notes:
        data.uncertainty_notes ||
        "The model could not detect recognizable food in this image. Please center your meal under clear lighting.",
      estimation_source: "ai_estimate",
      nutrition_per_100g: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fibre: null,
      },
    };
  }

  // Extract raw items list (either from `items` array or fallback to top-level object)
  const rawItems: RawModelItemOutput[] = [];
  if (Array.isArray(data.items) && data.items.length > 0) {
    for (const item of data.items) {
      if (item && typeof item === "object") {
        rawItems.push(item);
      }
    }
  }

  // Fallback: if no `items` array or empty, synthesize from top-level fields
  if (rawItems.length === 0 && data.food_name) {
    rawItems.push({
      food_name: data.food_name,
      alternative_names: data.alternative_names,
      portion_grams: data.estimated_weight_g,
      calories: data.estimated_calories,
      protein_g: data.estimated_protein,
      carbs_g: data.estimated_carbohydrates,
      fat_g: data.estimated_fat,
      fibre_g: data.estimated_fibre,
      confidence: data.confidence,
      notes: data.uncertainty_notes,
    });
  }

  // If still no valid items found, treat as no food detected
  if (rawItems.length === 0) {
    return {
      is_food_detected: false,
      meal_summary: "No food detected",
      items: [],
      food_name: "No food detected",
      alternative_names: [],
      ingredients: [],
      cooking_method: "unknown",
      estimated_weight_g: 0,
      estimated_calories: 0,
      estimated_protein: 0,
      estimated_carbohydrates: 0,
      estimated_fat: 0,
      estimated_fibre: null,
      confidence: 0,
      uncertainty_notes:
        data.uncertainty_notes || "No distinct food items could be recognized in the photo.",
      estimation_source: "ai_estimate",
      nutrition_per_100g: {
        calories: 0,
        protein: 0,
        carbohydrates: 0,
        fat: 0,
        fibre: null,
      },
    };
  }

  // Sanitize all items
  const sanitizedItems: IdentifiedFoodItem[] = rawItems.map((item, idx) =>
    sanitizeIdentifiedItem(item, idx)
  );

  // Primary item for legacy top-level compatibility
  const primaryItem = sanitizedItems[0];

  // Process legacy ingredients list
  const ingredients: FoodScanIngredient[] = [];
  if (Array.isArray(data.ingredients)) {
    for (const item of data.ingredients) {
      if (item && typeof item === "object" && item.name) {
        const ingName = String(item.name).trim();
        const ingWeight = Number(item.estimated_weight_g) || undefined;
        const ingConfidence = Math.min(99, Math.max(10, Number(item.confidence) || 85));
        const ingDbMatch = findDatabaseMatch(ingName);

        ingredients.push({
          name: ingName,
          estimated_weight_g: ingWeight,
          confidence: ingConfidence,
          notes: item.notes ? String(item.notes) : undefined,
          matched_database_food_id: ingDbMatch ? ingDbMatch.id : null,
        });
      }
    }
  }

  // Summary title
  const mealSummary =
    data.meal_summary ||
    (sanitizedItems.length > 1
      ? sanitizedItems.map((i) => i.food_name).join(", ")
      : primaryItem.food_name);

  const cookingMethod = String(data.cooking_method || "Cooked / Prepared").trim();
  const estimationSource: FoodScanSource = primaryItem.is_catalogue_match
    ? "database_match"
    : "ai_estimate";

  return {
    is_food_detected: true,
    meal_summary: mealSummary,
    items: sanitizedItems,
    // Top-level legacy fields mapped to primary item
    food_name: primaryItem.food_name,
    alternative_names: primaryItem.alternative_names,
    ingredients,
    cooking_method: cookingMethod,
    estimated_weight_g: primaryItem.portion_grams,
    estimated_calories: primaryItem.calories ?? 0,
    estimated_protein: primaryItem.protein_g ?? 0,
    estimated_carbohydrates: primaryItem.carbs_g ?? 0,
    estimated_fat: primaryItem.fat_g ?? 0,
    estimated_fibre: primaryItem.fibre_g,
    confidence: primaryItem.confidence_score ?? 85,
    uncertainty_notes: primaryItem.notes,
    estimation_source: estimationSource,
    matched_database_food_id: primaryItem.matched_database_food_id,
    matched_database_food_name: primaryItem.matched_database_food_name,
    nutrition_per_100g: {
      calories: primaryItem.nutrition_per_100g.calories ?? 0,
      protein: primaryItem.nutrition_per_100g.protein ?? 0,
      carbohydrates: primaryItem.nutrition_per_100g.carbohydrates ?? 0,
      fat: primaryItem.nutrition_per_100g.fat ?? 0,
      fibre: primaryItem.nutrition_per_100g.fibre,
    },
  };
}
