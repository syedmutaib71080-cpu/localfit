"use client";

import * as React from "react";
import {
  Utensils,
  Flame,
  Activity,
  Footprints,
  Compass,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DailyNutritionTotals } from "@/types/nutrition-tracking";
import type { DailyActivitySummary } from "@/types/activity";
import type { UserProfileGoals } from "@/lib/dashboard-calculator";
import { formatActiveDuration, calculateNetCalories } from "@/lib/dashboard-calculator";

interface DashboardOverviewCardsProps {
  totals: DailyNutritionTotals | null;
  activity: DailyActivitySummary;
  userGoals: UserProfileGoals;
}

export function DashboardOverviewCards({
  totals,
  activity,
  userGoals,
}: DashboardOverviewCardsProps) {
  const consumedCalories = totals?.totalCalories ?? 0;
  const burnedCalories = activity.total_estimated_calories;
  const netCalories = calculateNetCalories(consumedCalories, burnedCalories);

  const calorieTarget =
    typeof userGoals.daily_calorie_goal === "number" && userGoals.daily_calorie_goal > 0
      ? userGoals.daily_calorie_goal
      : null;

  const proteinTarget =
    typeof userGoals.daily_protein_goal === "number" && userGoals.daily_protein_goal > 0
      ? userGoals.daily_protein_goal
      : null;

  const caloriesRemaining =
    calorieTarget !== null ? Math.max(0, calorieTarget - Math.round(consumedCalories)) : null;

  const calorieProgressPercent =
    calorieTarget !== null && calorieTarget > 0
      ? Math.min(100, Math.round((consumedCalories / calorieTarget) * 100))
      : null;

  const totalDistanceKm =
    Math.round(
      (activity.walking_distance_km + activity.running_distance_km + activity.cycling_distance_km) * 10
    ) / 10;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Calories Consumed & Target */}
      <Card variant="default" className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73] flex items-center gap-1.5">
              <Utensils size={13} className="text-[#437151]" />
              Calories Consumed
            </span>
            {calorieTarget !== null ? (
              <Badge variant="sage" size="sm">
                {calorieProgressPercent}% of Goal
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                No Target Set
              </Badge>
            )}
          </div>

          <div className="pt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-[#1C1F1D]">
                {Math.round(consumedCalories)}
              </span>
              <span className="text-xs font-medium text-[#717A73]">kcal</span>
            </div>

            {calorieTarget !== null ? (
              <p className="text-xs text-[#575E59] mt-1">
                Target: <strong>{calorieTarget} kcal</strong> •{" "}
                <span className="text-[#375A41]">{caloriesRemaining} kcal left</span>
              </p>
            ) : (
              <p className="text-xs text-[#717A73] italic mt-1">
                Set a daily target in your profile
              </p>
            )}
          </div>
        </div>

        {/* Progress bar if goal configured */}
        <div className="pt-4">
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#437151] transition-all duration-500"
              style={{ width: `${calorieProgressPercent ?? 0}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[11px] text-[#717A73] mt-1.5">
            <span>{totals?.entriesCount ?? 0} items logged</span>
            {calorieTarget !== null && <span>Goal: {calorieTarget}</span>}
          </div>
        </div>
      </Card>

      {/* 2. Active Calories Burned & Net Balance */}
      <Card variant="default" className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73] flex items-center gap-1.5">
              <Flame size={13} className="text-[#6B7546]" />
              Active Burned
            </span>
            <Badge variant="outline" size="sm">
              Workouts
            </Badge>
          </div>

          <div className="pt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight text-[#1C1F1D]">
                {Math.round(burnedCalories)}
              </span>
              <span className="text-xs font-medium text-[#717A73]">kcal</span>
            </div>

            <p className="text-xs text-[#575E59] mt-1">
              Net balance:{" "}
              <strong className={netCalories > 0 ? "text-[#1C1F1D]" : "text-[#375A41]"}>
                {netCalories > 0 ? `+${netCalories}` : netCalories} kcal
              </strong>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E8E5DD] flex items-center justify-between text-xs text-[#717A73]">
          <span>
            {activity.workouts_with_calories_count}{" "}
            {activity.workouts_with_calories_count === 1 ? "session calculated" : "sessions calculated"}
          </span>
          {activity.workouts_without_calories_count > 0 && (
            <span className="text-amber-700 font-medium">
              {activity.workouts_without_calories_count} missing weight
            </span>
          )}
        </div>
      </Card>

      {/* 3. Macronutrients Snapshot */}
      <Card variant="default" className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73] flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#437151]" />
              Macronutrients
            </span>
            <Badge variant="neutral" size="sm">
              Today
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 text-center">
            {/* Protein */}
            <div className="rounded-lg bg-[#FAF8F5] p-2 border border-[#E8E5DD]">
              <p className="text-xs text-[#717A73] font-medium">Protein</p>
              <p className="text-lg font-bold text-[#1C1F1D]">
                {totals?.totalProtein ?? 0}
                <span className="text-[10px] text-[#717A73] font-normal">g</span>
              </p>
              {proteinTarget !== null && (
                <p className="text-[10px] text-[#375A41] font-medium">/ {proteinTarget}g</p>
              )}
            </div>

            {/* Carbs */}
            <div className="rounded-lg bg-[#FAF8F5] p-2 border border-[#E8E5DD]">
              <p className="text-xs text-[#717A73] font-medium">Carbs</p>
              <p className="text-lg font-bold text-[#1C1F1D]">
                {totals?.totalCarbohydrates ?? 0}
                <span className="text-[10px] text-[#717A73] font-normal">g</span>
              </p>
            </div>

            {/* Fat */}
            <div className="rounded-lg bg-[#FAF8F5] p-2 border border-[#E8E5DD]">
              <p className="text-xs text-[#717A73] font-medium">Fat</p>
              <p className="text-lg font-bold text-[#1C1F1D]">
                {totals?.totalFat ?? 0}
                <span className="text-[10px] text-[#717A73] font-normal">g</span>
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 text-[11px] text-[#717A73] flex justify-between items-center">
          <span>Dietary fibre: {totals?.totalFibre ?? 0}g</span>
          {proteinTarget !== null && (
            <span className="text-[#375A41] font-medium">
              {Math.min(100, Math.round(((totals?.totalProtein ?? 0) / proteinTarget) * 100))}% Protein
            </span>
          )}
        </div>
      </Card>

      {/* 4. Movement & Workouts */}
      <Card variant="default" className="p-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#717A73] flex items-center gap-1.5">
              <Activity size={13} className="text-[#437151]" />
              Movement & Workouts
            </span>
            <Badge variant="sage" size="sm">
              {activity.workouts_count} {activity.workouts_count === 1 ? "Workout" : "Workouts"}
            </Badge>
          </div>

          <div className="pt-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#717A73] flex items-center gap-1">
                <Footprints size={12} className="text-[#437151]" />
                Daily Steps:
              </span>
              <span className="font-bold text-[#1C1F1D]">
                {activity.total_steps > 0
                  ? `${activity.total_steps.toLocaleString()} steps`
                  : "None logged"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#717A73] flex items-center gap-1">
                <Compass size={12} className="text-[#6B7546]" />
                Distance:
              </span>
              <span className="font-bold text-[#1C1F1D]">
                {totalDistanceKm > 0 ? `${totalDistanceKm} km` : "0 km"}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#717A73] flex items-center gap-1">
                <Activity size={12} className="text-[#437151]" />
                Active Duration:
              </span>
              <span className="font-bold text-[#1C1F1D]">
                {formatActiveDuration(activity.total_workout_duration_seconds)}
              </span>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#E8E5DD] flex items-center justify-between text-[11px] text-[#717A73]">
          <span>Walking: {activity.walking_distance_km}km</span>
          <span>Cycling: {activity.cycling_distance_km}km</span>
          <span>Running: {activity.running_distance_km}km</span>
        </div>
      </Card>
    </div>
  );
}
