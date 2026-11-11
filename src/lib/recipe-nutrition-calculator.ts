import type { RecipeIngredient, CalculatedRecipeNutrition } from "@/types/regional-food";

/**
 * Calculates total recipe and per-serving nutrition from ingredient arrays.
 * Implements strict ingredient-by-ingredient summation based on ICMR-NIN IFCT standards.
 */
export function calculateRecipeNutrition(
  ingredients: RecipeIngredient[],
  servingsCount: number,
  totalCookedWeightG?: number | null
): CalculatedRecipeNutrition {
  const servings = Math.max(1, servingsCount || 4);

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFibre = 0;

  let verifiedCount = 0;
  let estimatedCount = 0;
  let missingCount = 0;
  const summaryNotes: string[] = [];

  for (const ing of ingredients) {
    const hasNutrients =
      typeof ing.calories === "number" ||
      typeof ing.protein === "number" ||
      typeof ing.carbohydrates === "number" ||
      typeof ing.fat === "number";

    if (!hasNutrients) {
      missingCount++;
      summaryNotes.push(`Missing nutritional profile for "${ing.ingredient_name}".`);
      continue;
    }

    if (ing.is_verified_ingredient) {
      verifiedCount++;
    } else {
      estimatedCount++;
    }

    totalCalories += Math.max(0, Number(ing.calories) || 0);
    totalProtein += Math.max(0, Number(ing.protein) || 0);
    totalCarbs += Math.max(0, Number(ing.carbohydrates) || 0);
    totalFat += Math.max(0, Number(ing.fat) || 0);
    if (ing.fibre !== null && ing.fibre !== undefined) {
      totalFibre += Math.max(0, Number(ing.fibre) || 0);
    }
  }

  // Per serving calculation
  const perServingCalories = Math.round(totalCalories / servings);
  const perServingProtein = Math.round((totalProtein / servings) * 10) / 10;
  const perServingCarbs = Math.round((totalCarbs / servings) * 10) / 10;
  const perServingFat = Math.round((totalFat / servings) * 10) / 10;
  const perServingFibre =
    totalFibre > 0 ? Math.round((totalFibre / servings) * 10) / 10 : null;

  // Per 100g calculation (only when verified cooked weight is known)
  let per100gCalories: number | null = null;
  let per100gProtein: number | null = null;
  let per100gCarbs: number | null = null;
  let per100gFat: number | null = null;
  let per100gFibre: number | null = null;

  if (totalCookedWeightG && totalCookedWeightG > 0) {
    const scale = 100 / totalCookedWeightG;
    per100gCalories = Math.round(totalCalories * scale);
    per100gProtein = Math.round(totalProtein * scale * 10) / 10;
    per100gCarbs = Math.round(totalCarbs * scale * 10) / 10;
    per100gFat = Math.round(totalFat * scale * 10) / 10;
    per100gFibre = totalFibre > 0 ? Math.round(totalFibre * scale * 10) / 10 : null;
  }

  const isFullyVerified = missingCount === 0 && estimatedCount === 0 && verifiedCount > 0;

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbs: Math.round(totalCarbs * 10) / 10,
    totalFat: Math.round(totalFat * 10) / 10,
    totalFibre: totalFibre > 0 ? Math.round(totalFibre * 10) / 10 : null,
    perServingCalories,
    perServingProtein,
    perServingCarbs,
    perServingFat,
    perServingFibre,
    per100gCalories,
    per100gProtein,
    per100gCarbs,
    per100gFat,
    per100gFibre,
    verifiedIngredientsCount: verifiedCount,
    estimatedIngredientsCount: estimatedCount,
    missingIngredientsCount: missingCount,
    isFullyVerified,
    summaryNotes,
  };
}
