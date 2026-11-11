"use client";

import * as React from "react";
import { Card } from "@/components/ui/card";
import type { DailyNutritionTotals } from "@/types/nutrition-tracking";
import {
  calculateTargetComparison,
  formatDisplayDate,
} from "@/lib/nutrition-client";

interface NutritionDashboardHeaderProps {
  selectedDate: string;
  totals: DailyNutritionTotals | null;
  userGoals?: {
    daily_calorie_goal?: number | null;
    daily_protein_goal?: number | null;
  };
}

export function NutritionDashboardHeader({
  selectedDate,
  totals,
  userGoals,
}: NutritionDashboardHeaderProps) {
  const comparison = calculateTargetComparison(totals, userGoals);

  const totalCalories = totals?.totalCalories ?? 0;
  const totalProtein = totals?.totalProtein ?? 0;
  const totalCarbohydrates = totals?.totalCarbohydrates ?? 0;
  const totalFat = totals?.totalFat ?? 0;
  const totalFibre = totals?.totalFibre ?? 0;

  return (
    <Card variant="cream" className="p-6 space-y-4">
      {/* Top row: Section title & target status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E5DD]">
        <div className="space-y-0.5">
          <span className="text-xs font-bold text-[#1C1F1D] uppercase tracking-wider">
            Daily Nutrition Breakdown
          </span>
          <p className="text-xs text-[#575E59]">
            {formatDisplayDate(selectedDate)} • {totals?.entriesCount ?? 0}{" "}
            {(totals?.entriesCount ?? 0) === 1 ? "entry" : "entries"} logged
          </p>
        </div>

        <div className="text-left sm:text-right text-xs">
          {comparison.hasCalorieGoal ? (
            <span className="text-[#575E59]">
              Target: <strong className="text-[#1C1F1D]">{comparison.calorieTarget} kcal</strong> • Consumed:{" "}
              <strong className="text-[#1C1F1D]">{totalCalories} kcal</strong>
            </span>
          ) : (
            <span className="text-[#717A73] italic">
              No daily calorie target set in profile
            </span>
          )}
        </div>
      </div>

      {/* Main 5-column macro grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
        {/* Calories */}
        <div className="p-2 rounded-xl bg-white/60 border border-[#E8E5DD]/60">
          <span className="text-[11px] font-semibold text-[#575E59] uppercase tracking-wider">
            Calories Consumed
          </span>
          <p className="text-2xl font-bold text-[#1C1F1D] mt-1">{totalCalories}</p>
          <p className="text-[11px] text-[#717A73] mt-0.5">
            {comparison.hasCalorieGoal ? (
              <span>
                {comparison.caloriesRemaining} kcal left ({comparison.calorieProgressPercent}%)
              </span>
            ) : (
              <span>Logged total</span>
            )}
          </p>
        </div>

        {/* Protein */}
        <div className="p-2 rounded-xl bg-white/60 border border-[#E8E5DD]/60">
          <span className="text-[11px] font-semibold text-[#575E59] uppercase tracking-wider">
            Protein
          </span>
          <p className="text-2xl font-bold text-[#437151] mt-1">{totalProtein}g</p>
          <p className="text-[11px] text-[#717A73] mt-0.5">
            {comparison.hasProteinGoal ? (
              <span>
                Goal: {comparison.proteinTarget}g ({comparison.proteinProgressPercent}%)
              </span>
            ) : (
              <span>Building blocks</span>
            )}
          </p>
        </div>

        {/* Carbohydrates */}
        <div className="p-2 rounded-xl bg-white/60 border border-[#E8E5DD]/60">
          <span className="text-[11px] font-semibold text-[#575E59] uppercase tracking-wider">
            Carbohydrates
          </span>
          <p className="text-2xl font-bold text-[#6B7546] mt-1">{totalCarbohydrates}g</p>
          <p className="text-[11px] text-[#717A73] mt-0.5">Clean energy</p>
        </div>

        {/* Fats */}
        <div className="p-2 rounded-xl bg-white/60 border border-[#E8E5DD]/60">
          <span className="text-[11px] font-semibold text-[#575E59] uppercase tracking-wider">
            Fats
          </span>
          <p className="text-2xl font-bold text-[#88935D] mt-1">{totalFat}g</p>
          <p className="text-[11px] text-[#717A73] mt-0.5">Essential lipids</p>
        </div>

        {/* Fibre */}
        <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-white/60 border border-[#E8E5DD]/60">
          <span className="text-[11px] font-semibold text-[#575E59] uppercase tracking-wider">
            Dietary Fibre
          </span>
          <p className="text-2xl font-bold text-[#1C1F1D] mt-1">{totalFibre}g</p>
          <p className="text-[11px] text-[#717A73] mt-0.5">Gut vitality</p>
        </div>
      </div>

      {/* Progress Bar (Only rendered when a target actually exists) */}
      {comparison.hasCalorieGoal && (
        <div className="pt-2 space-y-1.5">
          <div className="flex justify-between items-center text-xs text-[#575E59]">
            <span>Calorie Goal Progress</span>
            <span className="font-semibold text-[#1C1F1D]">
              {totalCalories} / {comparison.calorieTarget} kcal ({comparison.calorieProgressPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                (comparison.calorieProgressPercent ?? 0) > 100
                  ? "bg-[#D97706]"
                  : "bg-[#437151]"
              }`}
              style={{ width: `${Math.min(100, comparison.calorieProgressPercent ?? 0)}%` }}
              role="progressbar"
              aria-valuenow={comparison.calorieProgressPercent ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Calorie Goal Progress"
            />
          </div>
        </div>
      )}
    </Card>
  );
}
