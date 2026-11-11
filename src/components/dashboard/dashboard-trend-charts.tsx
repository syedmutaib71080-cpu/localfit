"use client";

import * as React from "react";
import { BarChart3, Flame, Clock, Footprints } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WeeklyNutritionDay } from "@/lib/dashboard-calculator";
import type { WeeklyDaySummary } from "@/types/activity";

interface DashboardTrendChartsProps {
  weeklyNutrition: WeeklyNutritionDay[];
  weeklyActivity: WeeklyDaySummary[];
  calorieTarget: number | null;
  selectedDate: string;
}

export function DashboardTrendCharts({
  weeklyNutrition,
  weeklyActivity,
  calorieTarget,
  selectedDate,
}: DashboardTrendChartsProps) {
  // Max scale calculation for calorie chart
  const maxCalories = React.useMemo(() => {
    const dataMax = Math.max(...weeklyNutrition.map((d) => d.calories), 0);
    const target = calorieTarget || 0;
    const peak = Math.max(dataMax, target);
    return peak > 0 ? Math.ceil(peak * 1.15) : 2500;
  }, [weeklyNutrition, calorieTarget]);

  // Max scale calculation for active duration
  const maxDurationMinutes = React.useMemo(() => {
    const dataMax = Math.max(...weeklyActivity.map((d) => d.activeDurationMinutes), 0);
    return dataMax > 0 ? Math.ceil(dataMax * 1.2) : 60;
  }, [weeklyActivity]);

  // Max scale calculation for steps
  const maxSteps = React.useMemo(() => {
    const dataMax = Math.max(...weeklyActivity.map((d) => d.steps), 0);
    return dataMax > 0 ? Math.ceil(dataMax * 1.2) : 10000;
  }, [weeklyActivity]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-[#437151]" />
          <h2 className="text-base font-semibold text-[#1C1F1D]">7-Day Health Trends</h2>
        </div>
        <Badge variant="sage" size="sm">
          Leading to {selectedDate}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Weekly Calorie Consumption */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <span className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
                <Flame size={13} className="text-[#437151]" />
                Daily Calories Consumed
              </span>
              <span className="text-[10px] text-[#717A73]">kcal/day</span>
            </div>

            {/* Visual Bar Columns */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1 relative">
              {/* Optional Calorie Target Reference Line */}
              {calorieTarget !== null && calorieTarget > 0 && (
                <div
                  className="absolute left-0 right-0 border-t-2 border-dashed border-[#B88746] opacity-60 z-10 pointer-events-none"
                  style={{ bottom: `${Math.min(95, (calorieTarget / maxCalories) * 100)}%` }}
                  title={`Calorie Target: ${calorieTarget} kcal`}
                />
              )}

              {weeklyNutrition.map((item) => {
                const heightPercent =
                  item.calories > 0 ? Math.min(100, Math.max(8, (item.calories / maxCalories) * 100)) : 4;
                const isSelected = item.date === selectedDate;

                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1F1D] text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-20">
                      {item.calories} kcal ({item.entriesCount} items)
                    </div>

                    <div
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? "bg-[#437151]"
                          : item.calories > 0
                          ? "bg-[#C7DBD0] hover:bg-[#A8C7B5]"
                          : "bg-[#EFEBE1]"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Day Labels */}
            <div className="flex justify-between text-[11px] text-[#717A73] pt-1 border-t border-[#E8E5DD] px-1">
              {weeklyNutrition.map((item) => (
                <span
                  key={item.date}
                  className={`text-center flex-1 ${
                    item.date === selectedDate ? "font-bold text-[#1C1F1D]" : ""
                  }`}
                >
                  {item.dayLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-[#717A73] flex justify-between items-center">
            <span>7-day rolling intake</span>
            {calorieTarget !== null && (
              <span className="text-[#B88746] font-medium flex items-center gap-1">
                <span className="h-1 w-3 bg-[#B88746] inline-block rounded" /> Target: {calorieTarget} kcal
              </span>
            )}
          </div>
        </Card>

        {/* Chart 2: Weekly Workout Duration */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <span className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
                <Clock size={13} className="text-[#437151]" />
                Active Workout Duration
              </span>
              <span className="text-[10px] text-[#717A73]">minutes</span>
            </div>

            {/* Visual Bar Columns */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1 relative">
              {weeklyActivity.map((item) => {
                const heightPercent =
                  item.activeDurationMinutes > 0
                    ? Math.min(100, Math.max(8, (item.activeDurationMinutes / maxDurationMinutes) * 100))
                    : 4;
                const isSelected = item.date === selectedDate;

                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1F1D] text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-20">
                      {item.activeDurationMinutes} mins ({item.totalDistanceKm} km)
                    </div>

                    <div
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? "bg-[#6B7546]"
                          : item.activeDurationMinutes > 0
                          ? "bg-[#DDE3CF] hover:bg-[#CCD5B8]"
                          : "bg-[#EFEBE1]"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Day Labels */}
            <div className="flex justify-between text-[11px] text-[#717A73] pt-1 border-t border-[#E8E5DD] px-1">
              {weeklyActivity.map((item) => (
                <span
                  key={item.date}
                  className={`text-center flex-1 ${
                    item.date === selectedDate ? "font-bold text-[#1C1F1D]" : ""
                  }`}
                >
                  {item.dayLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-[#717A73] flex justify-between items-center">
            <span>Peak session: {maxDurationMinutes}m</span>
            <span>Recorded workouts only</span>
          </div>
        </Card>

        {/* Chart 3: Weekly Daily Steps */}
        <Card variant="default" className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <span className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
                <Footprints size={13} className="text-[#437151]" />
                Daily Steps Logged
              </span>
              <span className="text-[10px] text-[#717A73]">steps</span>
            </div>

            {/* Visual Bar Columns */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-1 relative">
              {weeklyActivity.map((item) => {
                const heightPercent =
                  item.steps > 0
                    ? Math.min(100, Math.max(8, (item.steps / maxSteps) * 100))
                    : 4;
                const isSelected = item.date === selectedDate;

                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative"
                  >
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1F1D] text-white text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap pointer-events-none z-20">
                      {item.steps.toLocaleString()} steps
                    </div>

                    <div
                      className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                        isSelected
                          ? "bg-[#375A41]"
                          : item.steps > 0
                          ? "bg-[#C7DBD0] hover:bg-[#A8C7B5]"
                          : "bg-[#EFEBE1]"
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Day Labels */}
            <div className="flex justify-between text-[11px] text-[#717A73] pt-1 border-t border-[#E8E5DD] px-1">
              {weeklyActivity.map((item) => (
                <span
                  key={item.date}
                  className={`text-center flex-1 ${
                    item.date === selectedDate ? "font-bold text-[#1C1F1D]" : ""
                  }`}
                >
                  {item.dayLabel}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-3 text-[11px] text-[#717A73] flex justify-between items-center">
            <span>Real sensor & manual entries</span>
            <span>Total: {weeklyActivity.reduce((acc, c) => acc + c.steps, 0).toLocaleString()}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
