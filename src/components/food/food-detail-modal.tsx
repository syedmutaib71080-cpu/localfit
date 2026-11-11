"use client";

import * as React from "react";
import { Check, ShieldCheck, Scale, AlertCircle, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FoodCatalogueItem, CreateFoodLogRequest, MealType } from "@/types/nutrition-tracking";
import { calculateNutrientAmount } from "@/lib/nutrition-calculator";

interface FoodDetailModalProps {
  food: FoodCatalogueItem | null;
  defaultMealType?: MealType;
  isOpen: boolean;
  onClose: () => void;
  onLogMeal: (payload: CreateFoodLogRequest) => Promise<{ success: boolean; error?: string }>;
}

const MEAL_CATEGORY_OPTIONS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

function FoodDetailModalDialog({
  food,
  defaultMealType = "breakfast",
  onClose,
  onLogMeal,
}: {
  food: FoodCatalogueItem;
  defaultMealType?: MealType;
  onClose: () => void;
  onLogMeal: (payload: CreateFoodLogRequest) => Promise<{ success: boolean; error?: string }>;
}) {
  const [selectedMealType, setSelectedMealType] = React.useState<MealType>(defaultMealType);
  const [portionGrams, setPortionGrams] = React.useState<number>(
    food.serving_weight_g && food.serving_weight_g > 0 ? food.serving_weight_g : 100
  );
  const [notes, setNotes] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Client preview calculation (Authoritative calculation will be done on the server)
  const previewCalories = calculateNutrientAmount(food.calories_per_100g, portionGrams);
  const previewProtein = calculateNutrientAmount(food.protein_per_100g, portionGrams);
  const previewCarbs = calculateNutrientAmount(food.carbohydrates_per_100g, portionGrams);
  const previewFat = calculateNutrientAmount(food.fat_per_100g, portionGrams);
  const previewFibre = calculateNutrientAmount(food.fibre_per_100g, portionGrams);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (typeof portionGrams !== "number" || !Number.isFinite(portionGrams) || portionGrams <= 0) {
      setErrorMessage("Portion weight must be strictly greater than 0 grams.");
      return;
    }

    if (portionGrams > 10000) {
      setErrorMessage("Portion weight cannot exceed 10,000 grams (10 kg).");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onLogMeal({
        food_id: food.id,
        food_name: food.name,
        meal_type: selectedMealType,
        quantity_g: portionGrams,
        serving_name: food.serving_name || `${portionGrams}g portion`,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to log food entry. Please try again.");
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to log food.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="food-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl space-y-5 my-8 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#E8E5DD]">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="sage" size="sm">
                {food.category}
              </Badge>
              {food.region && (
                <span className="text-[11px] font-medium text-[#717A73] bg-[#FAF8F5] border border-[#E8E5DD] rounded-md px-2 py-0.5">
                  {food.region}
                </span>
              )}
              {food.is_verified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#375A41] bg-[#E2ECE4] border border-[#C7DBD0] rounded-md px-2 py-0.5">
                  <ShieldCheck size={12} />
                  <span>Verified Data</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8F5E16] bg-[#FDF6E2] border border-[#E8D49E] rounded-md px-2 py-0.5">
                  <AlertCircle size={12} />
                  <span>Estimated Formulation</span>
                </span>
              )}
            </div>

            <h3 id="food-modal-title" className="text-xl font-bold text-[#1C1F1D] tracking-tight">
              {food.name}
            </h3>
            {food.local_name && (
              <p className="text-xs text-[#575E59] font-medium">
                Local / Regional name: <span className="text-[#1C1F1D]">{food.local_name}</span>
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] transition-colors disabled:opacity-50"
            aria-label="Close food modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Meal Category Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider block">
              Meal Category
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedMealType(opt.id)}
                  disabled={isSubmitting}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all ${
                    selectedMealType === opt.id
                      ? "bg-[#437151] text-white shadow-sm"
                      : "bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Portion input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="portionGramsInput"
                className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider flex items-center gap-1.5"
              >
                <Scale size={14} className="text-[#437151]" />
                <span>Portion Weight (Grams)</span>
              </label>
              <span className="text-[11px] text-[#717A73]">
                Base: 100g = {food.calories_per_100g ?? "—"} kcal
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="portionGramsInput"
                type="number"
                min={1}
                max={10000}
                step="any"
                value={portionGrams || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPortionGrams(isNaN(val) ? 0 : val);
                }}
                disabled={isSubmitting}
                required
                className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3.5 py-2 text-sm font-semibold text-[#1C1F1D] focus:outline-none focus:ring-2 focus:ring-[#437151]"
              />
              <span className="text-xs font-medium text-[#575E59] shrink-0">grams</span>
            </div>

            {/* Quick Portion Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {food.serving_weight_g && food.serving_weight_g > 0 && (
                <button
                  type="button"
                  onClick={() => setPortionGrams(food.serving_weight_g!)}
                  disabled={isSubmitting}
                  className="px-2.5 py-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D] text-[11px] shrink-0"
                >
                  {food.serving_name || "1 Serving"} ({food.serving_weight_g}g)
                </button>
              )}
              <button
                type="button"
                onClick={() => setPortionGrams(50)}
                disabled={isSubmitting}
                className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D] text-[11px] shrink-0"
              >
                50g
              </button>
              <button
                type="button"
                onClick={() => setPortionGrams(100)}
                disabled={isSubmitting}
                className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D] text-[11px] shrink-0"
              >
                100g
              </button>
              <button
                type="button"
                onClick={() => setPortionGrams(150)}
                disabled={isSubmitting}
                className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D] text-[11px] shrink-0"
              >
                150g
              </button>
              <button
                type="button"
                onClick={() => setPortionGrams(200)}
                disabled={isSubmitting}
                className="px-2 py-1 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D] text-[11px] shrink-0"
              >
                200g
              </button>
            </div>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="foodLogNotesInput"
              className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider flex items-center gap-1"
            >
              <FileText size={13} className="text-[#717A73]" />
              <span>Notes (Optional)</span>
            </label>
            <input
              id="foodLogNotesInput"
              type="text"
              placeholder="e.g. cooked with minimal ghee, restaurant portion"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
          </div>

          {/* Estimated Nutrition Preview */}
          <div className="rounded-2xl border border-[#C7DBD0] bg-[#E2ECE4]/40 p-4 space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#C7DBD0]/60">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#375A41]">
                  Estimated Nutrition Preview
                </span>
                <p className="text-xs text-[#1C1F1D] font-medium">
                  {portionGrams}g portion (authoritative calculation done on server)
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-[#1C1F1D] leading-none">
                  {previewCalories !== null ? previewCalories : "—"}
                </span>
                <span className="text-xs font-semibold text-[#575E59] ml-1">kcal</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center pt-0.5">
              <div className="p-2 rounded-xl bg-white/80 border border-[#C7DBD0]/50">
                <span className="text-[10px] font-semibold text-[#575E59] uppercase block">Protein</span>
                <span className="text-sm font-bold text-[#375A41]">
                  {previewProtein !== null ? `${previewProtein}g` : "—"}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#C7DBD0]/50">
                <span className="text-[10px] font-semibold text-[#575E59] uppercase block">Carbs</span>
                <span className="text-sm font-bold text-[#566035]">
                  {previewCarbs !== null ? `${previewCarbs}g` : "—"}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#C7DBD0]/50">
                <span className="text-[10px] font-semibold text-[#575E59] uppercase block">Fat</span>
                <span className="text-sm font-bold text-[#747E4C]">
                  {previewFat !== null ? `${previewFat}g` : "—"}
                </span>
              </div>
              <div className="p-2 rounded-xl bg-white/80 border border-[#C7DBD0]/50">
                <span className="text-[10px] font-semibold text-[#575E59] uppercase block">Fibre</span>
                <span className="text-sm font-bold text-[#1C1F1D]">
                  {previewFibre !== null ? `${previewFibre}g` : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              variant="primary"
              size="sm"
              icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              iconPosition="left"
            >
              {isSubmitting ? "Logging..." : "Add to Log"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FoodDetailModal({
  food,
  defaultMealType = "breakfast",
  isOpen,
  onClose,
  onLogMeal,
}: FoodDetailModalProps) {
  if (!isOpen || !food) return null;

  return (
    <FoodDetailModalDialog
      key={`${food.id}-${defaultMealType}`}
      food={food}
      defaultMealType={defaultMealType}
      onClose={onClose}
      onLogMeal={onLogMeal}
    />
  );
}
