"use client";

import * as React from "react";
import { Check, Trash2, X, FileText, Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FoodLogEntry, UpdateFoodLogRequest, MealType } from "@/types/nutrition-tracking";

interface EditFoodLogModalProps {
  log: FoodLogEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: UpdateFoodLogRequest) => Promise<{ success: boolean; error?: string }>;
  onDelete: (entry: FoodLogEntry) => void;
}

const MEAL_CATEGORY_OPTIONS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

function EditFoodLogModalDialog({
  log,
  onClose,
  onUpdate,
  onDelete,
}: {
  log: FoodLogEntry;
  onClose: () => void;
  onUpdate: (id: string, updates: UpdateFoodLogRequest) => Promise<{ success: boolean; error?: string }>;
  onDelete: (entry: FoodLogEntry) => void;
}) {
  const [mealType, setMealType] = React.useState<MealType>(log.meal_type);
  const [quantityG, setQuantityG] = React.useState<number>(log.quantity_g);
  const [notes, setNotes] = React.useState<string>(log.notes || "");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Client preview scaling based on existing log ratio
  const ratio = log.quantity_g > 0 ? quantityG / log.quantity_g : 1;
  const previewCalories =
    log.calories !== null ? Math.round((log.calories * ratio) * 10) / 10 : null;
  const previewProtein =
    log.protein !== null ? Math.round((log.protein * ratio) * 10) / 10 : null;
  const previewCarbs =
    log.carbohydrates !== null ? Math.round((log.carbohydrates * ratio) * 10) / 10 : null;
  const previewFat =
    log.fat !== null ? Math.round((log.fat * ratio) * 10) / 10 : null;
  const previewFibre =
    log.fibre !== null ? Math.round((log.fibre * ratio) * 10) / 10 : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (typeof quantityG !== "number" || !Number.isFinite(quantityG) || quantityG <= 0) {
      setErrorMessage("Portion weight must be strictly greater than 0 grams.");
      return;
    }

    if (quantityG > 10000) {
      setErrorMessage("Portion weight cannot exceed 10,000 grams (10 kg).");
      return;
    }

    setIsSubmitting(true);
    try {
      const updates: UpdateFoodLogRequest = {};
      if (quantityG !== log.quantity_g) {
        updates.quantity_g = quantityG;
      }
      if (mealType !== log.meal_type) {
        updates.meal_type = mealType;
      }
      const trimmedNotes = notes.trim() || null;
      if (trimmedNotes !== (log.notes || null)) {
        updates.notes = trimmedNotes;
      }

      // If nothing changed, just close
      if (Object.keys(updates).length === 0) {
        onClose();
        return;
      }

      const res = await onUpdate(log.id, updates);
      if (!res.success) {
        setErrorMessage(res.error || "Failed to update food log entry.");
      } else {
        onClose();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to update food log.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-food-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl space-y-5 my-8 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#E8E5DD]">
          <div>
            <h3 id="edit-food-title" className="text-lg font-bold text-[#1C1F1D]">
              Edit Logged Food
            </h3>
            <p className="text-xs text-[#575E59] font-medium">{log.food_name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] disabled:opacity-50"
            aria-label="Close edit dialog"
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

          {/* Portion Weight */}
          <div className="space-y-1.5">
            <label
              htmlFor="editQuantityInput"
              className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider flex items-center gap-1.5"
            >
              <Scale size={14} className="text-[#437151]" />
              <span>Weight (Grams)</span>
            </label>
            <input
              id="editQuantityInput"
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
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm font-semibold text-[#1C1F1D] focus:outline-none focus:ring-2 focus:ring-[#437151]"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label
              htmlFor="editNotesInput"
              className="text-xs font-semibold text-[#1C1F1D] uppercase tracking-wider flex items-center gap-1"
            >
              <FileText size={13} className="text-[#717A73]" />
              <span>Notes (Optional)</span>
            </label>
            <input
              id="editNotesInput"
              type="text"
              placeholder="e.g. half portion left over"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
          </div>

          {/* Dynamically Recalculated Nutrition Snapshot */}
          <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1C1F1D]">Estimated Calories:</span>
              <span className="font-bold text-[#1C1F1D]">
                {previewCalories !== null ? `${previewCalories} kcal` : "— kcal"}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] pt-1 border-t border-[#E8E5DD]">
              <div>
                <span className="text-[#717A73] block text-[10px]">Protein</span>
                <span className="font-semibold text-[#375A41]">
                  {previewProtein !== null ? `${previewProtein}g` : "—"}
                </span>
              </div>
              <div>
                <span className="text-[#717A73] block text-[10px]">Carbs</span>
                <span className="font-semibold text-[#566035]">
                  {previewCarbs !== null ? `${previewCarbs}g` : "—"}
                </span>
              </div>
              <div>
                <span className="text-[#717A73] block text-[10px]">Fat</span>
                <span className="font-semibold text-[#747E4C]">
                  {previewFat !== null ? `${previewFat}g` : "—"}
                </span>
              </div>
              <div>
                <span className="text-[#717A73] block text-[10px]">Fibre</span>
                <span className="font-semibold text-[#1C1F1D]">
                  {previewFibre !== null ? `${previewFibre}g` : "—"}
                </span>
              </div>
            </div>
            <p className="text-[10px] text-[#717A73] italic text-center pt-1">
              Final accurate values are calculated server-side upon saving.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E8E5DD]">
            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete(log);
              }}
              disabled={isSubmitting}
              className="text-xs text-[#B33A3A] hover:underline flex items-center gap-1 p-1 disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Delete Entry</span>
            </button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                size="sm"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                iconPosition="left"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditFoodLogModal({
  log,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: EditFoodLogModalProps) {
  if (!isOpen || !log) return null;

  return (
    <EditFoodLogModalDialog
      key={`${log.id}-${log.quantity_g}-${log.meal_type}`}
      log={log}
      onClose={onClose}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}
