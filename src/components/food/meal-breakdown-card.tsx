"use client";

import * as React from "react";
import { Utensils, Plus, Trash2, Edit2, FileText, Sun, Coffee, Moon, Cookie } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { FoodLogEntry, MealType } from "@/types/nutrition-tracking";
import { calculateMealTotals } from "@/lib/nutrition-client";

interface MealBreakdownCardProps {
  mealType: MealType;
  displayTitle: string;
  entries: FoodLogEntry[];
  onAddFood: (mealType: MealType) => void;
  onEditEntry: (entry: FoodLogEntry) => void;
  onDeleteEntry: (entry: FoodLogEntry) => void;
}

function getMealIcon(mealType: MealType) {
  switch (mealType) {
    case "breakfast":
      return <Coffee size={18} />;
    case "lunch":
      return <Sun size={18} />;
    case "dinner":
      return <Moon size={18} />;
    case "snack":
      return <Cookie size={18} />;
    default:
      return <Utensils size={18} />;
  }
}

export function MealBreakdownCard({
  mealType,
  displayTitle,
  entries,
  onAddFood,
  onEditEntry,
  onDeleteEntry,
}: MealBreakdownCardProps) {
  const totals = calculateMealTotals(entries);

  return (
    <Card variant="default" className="overflow-hidden border border-[#E8E5DD]">
      {/* Meal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 border-b border-[#E8E5DD] bg-[#FAF8F5]/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2ECE4] text-[#375A41] border border-[#C7DBD0]">
            {getMealIcon(mealType)}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1C1F1D]">{displayTitle}</h3>
            <p className="text-xs text-[#575E59]">
              {entries.length} {entries.length === 1 ? "entry" : "entries"} logged
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="text-left sm:text-right text-xs">
            <span className="font-semibold text-[#1C1F1D]">{totals.calories} kcal</span>
            <p className="text-[11px] text-[#717A73]">
              P: {totals.protein}g • C: {totals.carbohydrates}g • F: {totals.fat}g
            </p>
          </div>
          <Button
            type="button"
            onClick={() => onAddFood(mealType)}
            size="sm"
            variant="secondary"
            icon={<Plus size={14} />}
            iconPosition="left"
            className="text-xs"
          >
            Add Food
          </Button>
        </div>
      </div>

      {/* Meal Items List or Empty State */}
      <div className="p-4 sm:p-5">
        {entries.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#717A73] border border-dashed border-[#E8E5DD] rounded-xl bg-[#FAF8F5]/40 space-y-2">
            <p>No foods logged for {displayTitle.toLowerCase()}.</p>
            <button
              type="button"
              onClick={() => onAddFood(mealType)}
              className="inline-flex items-center gap-1 font-semibold text-[#437151] hover:underline"
            >
              <Plus size={13} />
              <span>Log food for this meal</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DD]">
            {entries.map((log) => (
              <div
                key={log.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-[#1C1F1D]">{log.food_name}</span>
                    {log.is_ai_estimate && (
                      <span className="text-[10px] font-medium text-[#263B2C] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-1.5 py-0.2">
                        AI Scan
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#717A73]">
                    <span>{log.serving_name || `${log.quantity_g}g`}</span>
                    {log.notes && (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] text-[#575E59] italic"
                        title={log.notes}
                      >
                        <FileText size={11} className="text-[#717A73]" />
                        <span className="max-w-[200px] truncate">{log.notes}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-[#1C1F1D]">
                      {log.calories !== null ? `${log.calories} kcal` : "— kcal"}
                    </p>
                    <p className="text-[11px] text-[#575E59]">
                      P: {log.protein !== null ? `${log.protein}g` : "—"} • C:{" "}
                      {log.carbohydrates !== null ? `${log.carbohydrates}g` : "—"} • F:{" "}
                      {log.fat !== null ? `${log.fat}g` : "—"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => onEditEntry(log)}
                      className="p-1.5 text-[#717A73] hover:text-[#437151] hover:bg-[#FAF8F5] rounded-md transition-colors"
                      title="Edit entry"
                      aria-label={`Edit ${log.food_name}`}
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(log)}
                      className="p-1.5 text-[#717A73] hover:text-[#B33A3A] hover:bg-[#FAF8F5] rounded-md transition-colors"
                      title="Delete entry"
                      aria-label={`Delete ${log.food_name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
