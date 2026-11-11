"use client";

import * as React from "react";
import { Plus, X, FileText, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CreateFoodLogRequest, MealType } from "@/types/nutrition-tracking";

interface ManualFoodModalProps {
  isOpen: boolean;
  defaultMealType?: MealType;
  onClose: () => void;
  onSubmit: (input: CreateFoodLogRequest) => Promise<{ success: boolean; error?: string }>;
}

const MEAL_CATEGORY_OPTIONS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

function ManualFoodModalDialog({
  defaultMealType = "breakfast",
  onClose,
  onSubmit,
}: {
  defaultMealType?: MealType;
  onClose: () => void;
  onSubmit: (input: CreateFoodLogRequest) => Promise<{ success: boolean; error?: string }>;
}) {
  const [foodName, setFoodName] = React.useState("");
  const [mealType, setMealType] = React.useState<MealType>(defaultMealType);
  const [servingName, setServingName] = React.useState("1 homemade serving");
  const [quantityG, setQuantityG] = React.useState<number>(150);
  const [caloriesPer100g, setCaloriesPer100g] = React.useState<number>(150);
  const [proteinPer100g, setProteinPer100g] = React.useState<number>(8);
  const [carbsPer100g, setCarbsPer100g] = React.useState<number>(20);
  const [fatPer100g, setFatPer100g] = React.useState<number>(4);
  const [fibrePer100g, setFibrePer100g] = React.useState<number>(2);
  const [notes, setNotes] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = foodName.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a food or dish name.");
      return;
    }

    if (typeof quantityG !== "number" || !Number.isFinite(quantityG) || quantityG <= 0) {
      setErrorMessage("Portion weight must be strictly greater than 0 grams.");
      return;
    }

    if (quantityG > 10000) {
      setErrorMessage("Portion weight cannot exceed 10,000 grams (10 kg).");
      return;
    }

    if (caloriesPer100g < 0 || proteinPer100g < 0 || carbsPer100g < 0 || fatPer100g < 0 || fibrePer100g < 0) {
      setErrorMessage("Nutrient values cannot be negative.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmit({
        food_name: trimmedName,
        meal_type: mealType,
        serving_name: servingName.trim() || `${quantityG}g portion`,
        quantity_g: quantityG,
        calories_per_100g: caloriesPer100g,
        protein_per_100g: proteinPer100g,
        carbohydrates_per_100g: carbsPer100g,
        fat_per_100g: fatPer100g,
        fibre_per_100g: fibrePer100g,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        setErrorMessage(res.error || "Failed to save custom food log. Please try again.");
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to save food log.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-food-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl space-y-5 my-8 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E8E5DD]">
          <div>
            <h3 id="manual-food-title" className="text-lg font-bold text-[#1C1F1D]">
              Log Custom Food Entry
            </h3>
            <p className="text-xs text-[#575E59]">
              Enter nutrition values per 100g for homemade or untracked dishes
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] disabled:opacity-50"
            aria-label="Close custom food dialog"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Food Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D]">Food or Dish Name</label>
            <input
              type="text"
              placeholder="e.g. Homemade Palak Paneer, Sourdough Toast..."
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
          </div>

          {/* Meal Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider block">
              Meal Category
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {MEAL_CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMealType(opt.id)}
                  disabled={isSubmitting}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition-all ${
                    mealType === opt.id
                      ? "bg-[#437151] text-white shadow-sm"
                      : "bg-[#FAF8F5] border border-[#E8E5DD] text-[#575E59] hover:text-[#1C1F1D]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Portion and Serving Name */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1">
                <Scale size={13} className="text-[#437151]" />
                <span>Portion Weight (g)</span>
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                step="any"
                value={quantityG || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setQuantityG(isNaN(val) ? 0 : val);
                }}
                disabled={isSubmitting}
                required
                className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-xs font-semibold text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1C1F1D]">Serving Label</label>
              <input
                type="text"
                placeholder="e.g. 1 bowl, 2 pieces"
                value={servingName}
                onChange={(e) => setServingName(e.target.value)}
                disabled={isSubmitting}
                className="w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
              />
            </div>
          </div>

          {/* Nutrition Per 100g */}
          <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 space-y-2">
            <span className="text-[11px] font-semibold text-[#1C1F1D] uppercase tracking-wider block">
              Nutrition Values (Per 100g)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-[#575E59] block">Calories</label>
                <input
                  type="number"
                  min={0}
                  max={950}
                  value={caloriesPer100g}
                  onChange={(e) => setCaloriesPer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E8E5DD] bg-white p-1.5 text-xs text-center font-bold text-[#1C1F1D]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#575E59] block">Protein (g)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={proteinPer100g}
                  onChange={(e) => setProteinPer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E8E5DD] bg-white p-1.5 text-xs text-center font-bold text-[#437151]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#575E59] block">Carbs (g)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={carbsPer100g}
                  onChange={(e) => setCarbsPer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E8E5DD] bg-white p-1.5 text-xs text-center font-bold text-[#566035]"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#575E59] block">Fat (g)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={fatPer100g}
                  onChange={(e) => setFatPer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E8E5DD] bg-white p-1.5 text-xs text-center font-bold text-[#747E4C]"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-[10px] text-[#575E59] block">Fibre (g)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={fibrePer100g}
                  onChange={(e) => setFibrePer100g(Math.max(0, parseFloat(e.target.value) || 0))}
                  disabled={isSubmitting}
                  className="w-full rounded-lg border border-[#E8E5DD] bg-white p-1.5 text-xs text-center font-bold text-[#1C1F1D]"
                />
              </div>
            </div>
            <p className="text-[10px] text-[#717A73] italic">
              Estimated portion total: {Math.round(((caloriesPer100g * quantityG) / 100) * 10) / 10} kcal
            </p>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="manualNotesInput"
              className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider flex items-center gap-1"
            >
              <FileText size={13} className="text-[#717A73]" />
              <span>Notes (Optional)</span>
            </label>
            <input
              id="manualNotesInput"
              type="text"
              placeholder="e.g. prepared at home with olive oil"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
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
              icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              iconPosition="left"
            >
              {isSubmitting ? "Saving..." : "Save Custom Food"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ManualFoodModal({
  isOpen,
  defaultMealType = "breakfast",
  onClose,
  onSubmit,
}: ManualFoodModalProps) {
  if (!isOpen) return null;

  return (
    <ManualFoodModalDialog
      defaultMealType={defaultMealType}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
