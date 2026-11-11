"use client";

import * as React from "react";
import Link from "next/link";
import {
  Utensils,
  Scan,
  Plus,
  ArrowRight,
  Coffee,
  Sun,
  Moon,
  Cookie,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FoodLogEntry, DailyNutritionTotals, MealType } from "@/types/nutrition-tracking";
import type { UserProfileGoals } from "@/lib/dashboard-calculator";
import {
  calculateMealTotals,
  filterLogsByMeal,
} from "@/lib/nutrition-client";
import { calculateMacroDistribution } from "@/lib/dashboard-calculator";

interface DashboardNutritionSummaryProps {
  logs: FoodLogEntry[];
  totals: DailyNutritionTotals | null;
  userGoals: UserProfileGoals;
  selectedDate: string;
}

const MEAL_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <Coffee size={14} className="text-[#6B7546]" />,
  lunch: <Sun size={14} className="text-[#B88746]" />,
  dinner: <Moon size={14} className="text-[#375A41]" />,
  snack: <Cookie size={14} className="text-[#717A73]" />,
};

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
};

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export function DashboardNutritionSummary({
  logs,
  totals,
  userGoals,
  selectedDate,
}: DashboardNutritionSummaryProps) {
  const macros = React.useMemo(() => {
    return calculateMacroDistribution(totals);
  }, [totals]);

  const mealSummaries = React.useMemo(() => {
    return MEAL_TYPES.map((type) => {
      const mealLogs = filterLogsByMeal(logs, type);
      const mealTotals = calculateMealTotals(mealLogs);
      return {
        type,
        label: MEAL_LABELS[type],
        icon: MEAL_ICONS[type],
        totals: mealTotals,
        logs: mealLogs,
      };
    });
  }, [logs]);

  // Sort logs by logged_at descending for recent entries
  const recentEntries = React.useMemo(() => {
    return [...logs].sort((a, b) => b.logged_at.localeCompare(a.logged_at)).slice(0, 5);
  }, [logs]);

  return (
    <Card variant="default" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Utensils size={16} className="text-[#437151]" />
            <h2 className="text-base font-semibold text-[#1C1F1D]">Nutrition & Meals</h2>
          </div>
          <p className="text-xs text-[#575E59]">
            {logs.length} {logs.length === 1 ? "entry" : "entries"} logged for {selectedDate}
            {userGoals.daily_calorie_goal ? ` • Target: ${userGoals.daily_calorie_goal} kcal` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            href="/app/food/scan"
            size="sm"
            variant="outline"
            className="text-xs h-8"
            icon={<Scan size={13} />}
            iconPosition="left"
          >
            Scan Photo
          </Button>
          <Button
            href="/app/food"
            size="sm"
            variant="primary"
            className="text-xs h-8"
            icon={<Plus size={13} />}
            iconPosition="left"
          >
            Log Meal
          </Button>
        </div>
      </div>

      {/* Macro Ratio Bar */}
      <div className="rounded-xl bg-[#FAF8F5] p-4 border border-[#E8E5DD] space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-semibold text-[#1C1F1D]">Caloric Macro Distribution</span>
          <span className="text-[#717A73]">
            {macros.totalMacroCalories > 0 ? `${macros.totalMacroCalories} kcal from macros` : "No macros logged"}
          </span>
        </div>

        {/* Multi-segment stacked bar */}
        <div className="h-3 w-full rounded-full bg-[#EFEBE1] overflow-hidden flex">
          {macros.proteinPercent > 0 && (
            <div
              className="h-full bg-[#437151] transition-all duration-300"
              style={{ width: `${macros.proteinPercent}%` }}
              title={`Protein: ${macros.proteinPercent}% (${macros.proteinGrams}g)`}
            />
          )}
          {macros.carbsPercent > 0 && (
            <div
              className="h-full bg-[#B88746] transition-all duration-300"
              style={{ width: `${macros.carbsPercent}%` }}
              title={`Carbohydrates: ${macros.carbsPercent}% (${macros.carbsGrams}g)`}
            />
          )}
          {macros.fatPercent > 0 && (
            <div
              className="h-full bg-[#6B7546] transition-all duration-300"
              style={{ width: `${macros.fatPercent}%` }}
              title={`Fat: ${macros.fatPercent}% (${macros.fatGrams}g)`}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#437151]" />
            <span className="text-[#575E59]">
              Protein: <strong className="text-[#1C1F1D]">{macros.proteinGrams}g</strong> ({macros.proteinPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#B88746]" />
            <span className="text-[#575E59]">
              Carbs: <strong className="text-[#1C1F1D]">{macros.carbsGrams}g</strong> ({macros.carbsPercent}%)
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#6B7546]" />
            <span className="text-[#575E59]">
              Fat: <strong className="text-[#1C1F1D]">{macros.fatGrams}g</strong> ({macros.fatPercent}%)
            </span>
          </div>
        </div>
      </div>

      {/* Meal Breakdown Grid (Breakfast, Lunch, Dinner, Snack) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {mealSummaries.map((m) => (
          <div
            key={m.type}
            className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
                {m.icon}
                {m.label}
              </span>
              <span className="text-[10px] text-[#717A73]">
                {m.totals.count} {m.totals.count === 1 ? "item" : "items"}
              </span>
            </div>

            <div>
              <p className="text-lg font-bold text-[#1C1F1D]">
                {Math.round(m.totals.calories)}{" "}
                <span className="text-xs font-normal text-[#717A73]">kcal</span>
              </p>
              <p className="text-[11px] text-[#717A73]">
                {m.totals.protein}g P • {m.totals.carbohydrates}g C • {m.totals.fat}g F
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Food Entries List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">
            Recent Entries for {selectedDate}
          </h3>
          <Link
            href="/app/food"
            className="text-xs font-semibold text-[#437151] hover:underline flex items-center gap-1"
          >
            <span>View Food Diary</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {recentEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8E5DD] p-6 text-center text-xs text-[#717A73] space-y-2">
            <p>No meals logged for this date yet.</p>
            <div className="flex justify-center gap-2 pt-1">
              <Button href="/app/food" variant="outline" size="sm" className="text-xs">
                Log Manual Meal
              </Button>
              <Button href="/app/food/scan" variant="primary" size="sm" className="text-xs">
                Scan Food Photo
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DD] border border-[#E8E5DD] rounded-xl overflow-hidden bg-white">
            {recentEntries.map((item) => (
              <div
                key={item.id}
                className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#1C1F1D] truncate">
                      {item.food_name}
                    </span>
                    <Badge variant="neutral" size="sm" className="text-[10px] capitalize">
                      {item.meal_type}
                    </Badge>
                    {item.is_ai_estimate && (
                      <Badge variant="sage" size="sm" className="text-[10px]">
                        AI Scan
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[#717A73] mt-0.5">
                    {item.quantity_g}g
                    {item.serving_name ? ` (${item.serving_name})` : ""}
                    {" • "}
                    {item.protein ?? 0}g P • {item.carbohydrates ?? 0}g C • {item.fat ?? 0}g F
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-[#1C1F1D]">
                    {item.calories !== null ? `${Math.round(item.calories)}` : "—"}
                  </span>
                  <span className="text-[10px] text-[#717A73] block">kcal</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
