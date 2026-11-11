"use client";

import * as React from "react";
import Link from "next/link";
import {
  X,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { addFoodLog } from "@/lib/food-logs";
import type { RegionalRecipe } from "@/types/regional-food";
import type { MealType } from "@/types/food-log";

interface RecipeDetailModalProps {
  recipe: RegionalRecipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export function RecipeDetailModal({
  recipe,
  isOpen,
  onClose,
}: RecipeDetailModalProps) {
  const [servingsToLog, setServingsToLog] = React.useState<number>(1);
  const [selectedMealType, setSelectedMealType] = React.useState<MealType>("Lunch");
  const [isLogging, setIsLogging] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const handleClose = () => {
    setServingsToLog(1);
    setSuccessMessage(null);
    onClose();
  };

  if (!isOpen || !recipe) return null;

  // Scale nutrition based on user selected servings to log
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-[#E8E5DD] shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] transition-colors"
          title="Close recipe"
        >
          <X size={18} />
        </button>

        {/* Top Header & Regional Identity */}
        <div className="space-y-2 pr-8">
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

          <h2 className="text-2xl font-bold tracking-tight text-[#1C1F1D]">
            {recipe.name}
          </h2>

          {recipe.local_name && (
            <p className="text-xs font-semibold text-[#6B7546]">
              {recipe.local_name}
            </p>
          )}

          {recipe.aliases && recipe.aliases.length > 0 && (
            <p className="text-[11px] text-[#717A73]">
              Also known as: {recipe.aliases.map((a) => a.alias).join(", ")}
            </p>
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3.5 text-xs font-semibold text-[#263B2C] flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <Check size={16} className="text-[#375A41]" />
              <span>{successMessage}</span>
            </div>
            <Link
              href="/app/food"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-[#375A41] hover:underline"
            >
              <span>View Diary</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        )}

        {/* Recipe Overview Badges */}
        <div className="grid grid-cols-3 gap-2.5 text-center">
          <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#E8E5DD]">
            <Clock size={14} className="mx-auto text-[#437151] mb-1" />
            <p className="text-xs font-bold text-[#1C1F1D]">
              {recipe.preparation_time_minutes + recipe.cooking_time_minutes} mins
            </p>
            <p className="text-[10px] text-[#717A73]">
              {recipe.preparation_time_minutes}m prep • {recipe.cooking_time_minutes}m cook
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#E8E5DD]">
            <Users size={14} className="mx-auto text-[#437151] mb-1" />
            <p className="text-xs font-bold text-[#1C1F1D]">
              {recipe.default_servings} Servings
            </p>
            <p className="text-[10px] text-[#717A73]">
              {recipe.cooked_weight_per_serving_g ? `~${recipe.cooked_weight_per_serving_g}g / serving` : "Standard yield"}
            </p>
          </div>

          <div className="rounded-xl bg-[#FAF8F5] p-2.5 border border-[#E8E5DD]">
            <Utensils size={14} className="mx-auto text-[#437151] mb-1" />
            <p className="text-xs font-bold text-[#1C1F1D]">
              {recipe.cooking_method}
            </p>
            <p className="text-[10px] text-[#717A73]">Cooking Method</p>
          </div>
        </div>

        {/* Cultural Heritage Story */}
        {recipe.description && (
          <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5]/60 p-4 space-y-1 text-xs text-[#575E59]">
            <span className="font-semibold text-[#1C1F1D] flex items-center gap-1.5">
              <BookOpen size={13} className="text-[#437151]" />
              Cultural Heritage & Context
            </span>
            <p className="leading-relaxed text-[11px]">{recipe.description}</p>
          </div>
        )}

        {/* NUTRITION FACTS PANEL */}
        <Card variant="cream" className="p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#1C1F1D]">
                Nutrition Breakdown ({servingsToLog} {servingsToLog === 1 ? "Serving" : "Servings"})
              </span>
              <p className="text-[11px] text-[#717A73]">
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
              <span className="text-xs font-bold px-1.5 text-[#1C1F1D]">
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
            <div className="rounded-xl bg-[#FAF8F5] p-2 border border-[#E8E5DD]">
              <p className="text-lg font-bold text-[#1C1F1D]">{scaledCalories}</p>
              <p className="text-[10px] text-[#717A73] uppercase font-semibold">Calories</p>
            </div>
            <div className="rounded-xl bg-[#E2ECE4] p-2 border border-[#C7DBD0]">
              <p className="text-lg font-bold text-[#263B2C]">{scaledProtein}g</p>
              <p className="text-[10px] text-[#375A41] uppercase font-semibold">Protein</p>
            </div>
            <div className="rounded-xl bg-[#EDF0DF] p-2 border border-[#DBE0C1]">
              <p className="text-lg font-bold text-[#43492D]">{scaledCarbs}g</p>
              <p className="text-[10px] text-[#6B7546] uppercase font-semibold">Carbs</p>
            </div>
            <div className="rounded-xl bg-[#FAF8F5] p-2 border border-[#E8E5DD]">
              <p className="text-lg font-bold text-[#1C1F1D]">{scaledFat}g</p>
              <p className="text-[10px] text-[#717A73] uppercase font-semibold">Fat</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-[#717A73] pt-1">
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
                className="p-2.5 px-3 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-[#1C1F1D]">
                    {ing.ingredient_name}
                  </span>
                  <span className="text-[#717A73] ml-2">
                    {ing.quantity} {ing.unit} ({ing.weight_in_grams}g)
                  </span>
                  {ing.preparation_notes && (
                    <p className="text-[11px] text-[#717A73] italic">
                      {ing.preparation_notes}
                    </p>
                  )}
                </div>
                {ing.is_verified_ingredient && (
                  <span className="text-[10px] font-semibold text-[#375A41] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-1.5 py-0.5 shrink-0">
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
            <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 text-xs text-[#1C1F1D] leading-relaxed whitespace-pre-line">
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
                  className={`px-2.5 py-1 text-xs rounded-lg transition-colors ${
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

          <div className="grid grid-cols-2 gap-3">
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
              type="button"
              onClick={handleClose}
              size="lg"
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
