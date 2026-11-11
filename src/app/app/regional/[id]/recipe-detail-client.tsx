"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Clock,
  Users,
  ShieldCheck,
  Sparkles,
  Utensils,
  BookOpen,
  Check,
  Plus,
  Minus,
  ArrowRight,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/page-container";
import { getRegionalRecipeById } from "@/lib/regional-food-data";
import { addFoodLog } from "@/lib/food-logs";
import type { RegionalRecipe } from "@/types/regional-food";
import type { MealType } from "@/types/food-log";

interface RecipeDetailClientProps {
  id: string;
}

export function RecipeDetailClient({ id }: RecipeDetailClientProps) {
  const [recipe, setRecipe] = React.useState<RegionalRecipe | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Portion & Diary state
  const [servingsToLog, setServingsToLog] = React.useState<number>(1);
  const [selectedMealType, setSelectedMealType] = React.useState<MealType>("Lunch");
  const [isLogging, setIsLogging] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function fetchRecipe() {
      if (!id) return;
      setIsLoading(true);
      try {
        const found = await getRegionalRecipeById(id);
        setRecipe(found);
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    fetchRecipe();
  }, [id]);

  if (isLoading) {
    return (
      <PageContainer size="default" className="py-12 text-center text-xs text-[#717A73]">
        Loading authentic regional recipe...
      </PageContainer>
    );
  }

  if (!recipe) {
    return (
      <PageContainer size="default" className="py-12 text-center space-y-4">
        <Compass size={32} className="mx-auto text-[#717A73]" />
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#1C1F1D]">Recipe Not Found</h2>
          <p className="text-xs text-[#575E59]">
            The requested regional recipe does not exist or has not yet been verified.
          </p>
        </div>
        <Button href="/app/regional" size="sm" variant="primary">
          Back to Regional Archive
        </Button>
      </PageContainer>
    );
  }

  // Scaled nutrient values
  const scaledCalories = Math.round(recipe.calories_per_serving * servingsToLog);
  const scaledProtein = Math.round(recipe.protein_per_serving * servingsToLog * 10) / 10;
  const scaledCarbs = Math.round(recipe.carbohydrates_per_serving * servingsToLog * 10) / 10;
  const scaledFat = Math.round(recipe.fat_per_serving * servingsToLog * 10) / 10;
  const scaledFibre =
    recipe.fibre_per_serving !== null
      ? Math.round(recipe.fibre_per_serving * servingsToLog * 10) / 10
      : null;

  const servingWeightG = recipe.cooked_weight_per_serving_g
    ? Math.round(recipe.cooked_weight_per_serving_g * servingsToLog)
    : Math.round(250 * servingsToLog);

  const handleLogRecipe = async () => {
    setIsLogging(true);
    setSuccessMessage(null);

    try {
      const servingLabel = `${servingsToLog} ${
        servingsToLog === 1 ? "serving" : "servings"
      } (${servingWeightG}g) — ${recipe.region} Heritage`;

      const saved = await addFoodLog({
        food_name: recipe.name,
        meal_type: selectedMealType,
        quantity_g: servingWeightG,
        serving_name: servingLabel,
        calories: scaledCalories,
        protein: scaledProtein,
        carbohydrates: scaledCarbs,
        fat: scaledFat,
        fibre: scaledFibre,
        is_manual_entry: true,
      });

      setSuccessMessage(
        `Logged "${saved.food_name}" (${saved.calories} kcal) to ${selectedMealType}!`
      );
    } catch {
      alert("Could not log recipe. Please try again.");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <PageContainer size="default" className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/app/regional"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#437151] hover:underline"
        >
          <ChevronLeft size={14} />
          <span>Back to Regional Food Explorer</span>
        </Link>
      </div>

      {/* Main Recipe Card */}
      <Card variant="default" className="p-6 sm:p-8 space-y-6">
        {/* Header & Badges */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="sage" size="sm">
              {recipe.region}
            </Badge>
            {recipe.locality && (
              <span className="text-[11px] font-semibold text-[#575E59] bg-[#FAF8F5] border border-[#E8E5DD] rounded-md px-2 py-0.5">
                {recipe.locality} Heritage
              </span>
            )}
            {recipe.verification_status === "verified" ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#E2ECE4] border border-[#C7DBD0] px-2 py-0.5 text-[10px] font-semibold text-[#263B2C]">
                <ShieldCheck size={11} className="text-[#375A41]" />
                <span>Verified Recipe</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-[#FAF8F5] border border-[#E8E5DD] px-2 py-0.5 text-[10px] font-semibold text-[#6B7546]">
                <Sparkles size={11} />
                <span>Traditional (Estimated)</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1F1D]">
            {recipe.name}
          </h1>

          {recipe.local_name && (
            <p className="text-sm font-semibold text-[#6B7546]">
              {recipe.local_name}
            </p>
          )}

          {recipe.aliases && recipe.aliases.length > 0 && (
            <p className="text-xs text-[#717A73]">
              Alternative names: {recipe.aliases.map((a) => a.alias).join(", ")}
            </p>
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-4 text-xs font-semibold text-[#263B2C] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#375A41]" />
              <span>{successMessage}</span>
            </div>
            <Link
              href="/app/food"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#375A41] hover:underline"
            >
              <span>View Diary</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Metadata ribbon */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
            <Clock size={16} className="mx-auto text-[#437151] mb-1" />
            <p className="text-sm font-bold text-[#1C1F1D]">
              {recipe.preparation_time_minutes + recipe.cooking_time_minutes} mins
            </p>
            <p className="text-[10px] text-[#717A73]">
              {recipe.preparation_time_minutes}m prep • {recipe.cooking_time_minutes}m cook
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
            <Users size={16} className="mx-auto text-[#437151] mb-1" />
            <p className="text-sm font-bold text-[#1C1F1D]">
              {recipe.default_servings} Servings
            </p>
            <p className="text-[10px] text-[#717A73]">
              {recipe.cooked_weight_per_serving_g ? `~${recipe.cooked_weight_per_serving_g}g / serving` : "Standard yield"}
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
            <Utensils size={16} className="mx-auto text-[#437151] mb-1" />
            <p className="text-sm font-bold text-[#1C1F1D] truncate">
              {recipe.cooking_method}
            </p>
            <p className="text-[10px] text-[#717A73]">Cooking Method</p>
          </div>
        </div>

        {/* Cultural Heritage Story */}
        {recipe.description && (
          <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/60 p-4 space-y-1.5 text-xs text-[#575E59]">
            <span className="font-semibold text-[#1C1F1D] flex items-center gap-1.5">
              <BookOpen size={14} className="text-[#437151]" />
              Cultural Heritage & Culinary Background
            </span>
            <p className="leading-relaxed text-xs">{recipe.description}</p>
          </div>
        )}

        {/* NUTRITION FACTS PANEL */}
        <Card variant="cream" className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1F1D]">
                Nutrition Breakdown ({servingsToLog} {servingsToLog === 1 ? "Serving" : "Servings"})
              </span>
              <p className="text-xs text-[#717A73]">
                Calculated from verified ICMR-NIN IFCT ingredient nutrient data
              </p>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-[#E8E5DD] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setServingsToLog(Math.max(0.5, servingsToLog - 0.5))}
                className="p-1 rounded text-[#575E59] hover:bg-[#FAF8F5]"
                title="Decrease servings"
              >
                <Minus size={12} />
              </button>
              <span className="text-xs font-bold px-2 text-[#1C1F1D]">
                {servingsToLog}x
              </span>
              <button
                type="button"
                onClick={() => setServingsToLog(Math.min(5, servingsToLog + 0.5))}
                className="p-1 rounded text-[#575E59] hover:bg-[#FAF8F5]"
                title="Increase servings"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
              <p className="text-xl font-bold text-[#1C1F1D]">{scaledCalories}</p>
              <p className="text-[10px] text-[#717A73] uppercase font-semibold mt-0.5">Calories</p>
            </div>
            <div className="rounded-xl bg-[#E2ECE4] p-3 border border-[#C7DBD0]">
              <p className="text-xl font-bold text-[#263B2C]">{scaledProtein}g</p>
              <p className="text-[10px] text-[#375A41] uppercase font-semibold mt-0.5">Protein</p>
            </div>
            <div className="rounded-xl bg-[#EDF0DF] p-3 border border-[#DBE0C1]">
              <p className="text-xl font-bold text-[#43492D]">{scaledCarbs}g</p>
              <p className="text-[10px] text-[#6B7546] uppercase font-semibold mt-0.5">Carbs</p>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
              <p className="text-xl font-bold text-[#1C1F1D]">{scaledFat}g</p>
              <p className="text-[10px] text-[#717A73] uppercase font-semibold mt-0.5">Fat</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-[#717A73] pt-1">
            <span>
              Dietary Fibre: <strong>{scaledFibre !== null ? `${scaledFibre}g` : "N/A"}</strong>
            </span>
            <span className="italic">
              Source: {recipe.source}
            </span>
          </div>
        </Card>

        {/* INGREDIENTS BREAKDOWN */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-[#575E59] uppercase tracking-wider block">
            Traditional Ingredients ({recipe.ingredients.length})
          </span>
          <div className="divide-y divide-[#E8E5DD] border border-[#E8E5DD] rounded-xl overflow-hidden bg-white">
            {recipe.ingredients.map((ing, idx) => (
              <div
                key={`${ing.ingredient_name}-${idx}`}
                className="p-3 px-4 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-[#1C1F1D]">
                    {ing.ingredient_name}
                  </span>
                  <span className="text-[#717A73] ml-2">
                    {ing.quantity} {ing.unit} ({ing.weight_in_grams}g)
                  </span>
                  {ing.preparation_notes && (
                    <p className="text-[11px] text-[#717A73] italic mt-0.5">
                      {ing.preparation_notes}
                    </p>
                  )}
                </div>
                {ing.is_verified_ingredient && (
                  <span className="text-[10px] font-semibold text-[#375A41] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-2 py-0.5 shrink-0">
                    IFCT 2017
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* STEP-BY-STEP COOKING METHOD */}
        {recipe.cooking_instructions && (
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#575E59] uppercase tracking-wider block">
              Traditional Cooking Instructions
            </span>
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-5 text-xs text-[#1C1F1D] leading-relaxed whitespace-pre-line">
              {recipe.cooking_instructions}
            </div>
          </div>
        )}

        {/* MEAL SLOT SELECTOR & LOGGING FOOTER */}
        <div className="pt-4 border-t border-[#E8E5DD] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#575E59]">Log to Meal Slot:</span>
            <div className="flex gap-1.5">
              {(["Breakfast", "Lunch", "Dinner", "Snacks"] as const).map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedMealType(slot)}
                  className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                    selectedMealType === slot
                      ? "bg-[#437151] text-white font-semibold"
                      : "bg-[#FAF8F5] text-[#575E59] border border-[#E8E5DD] hover:text-[#1C1F1D]"
                  }`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <Button
              type="button"
              onClick={handleLogRecipe}
              disabled={isLogging}
              size="lg"
              variant="primary"
              className="w-full"
              icon={<Check size={16} />}
              iconPosition="left"
            >
              {isLogging ? "Logging..." : "Log to Food Diary"}
            </Button>
            <Button
              href="/app/regional"
              size="lg"
              variant="outline"
              className="w-full"
            >
              Explore More Regional Dishes
            </Button>
          </div>
        </div>
      </Card>
    </PageContainer>
  );
}
