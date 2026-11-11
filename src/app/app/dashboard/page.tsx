"use client";

import * as React from "react";
import Link from "next/link";
import {
  Utensils,
  Scan,
  Activity,
  Droplet,
  Plus,
  Flame,
  ArrowRight,
  Footprints,
  Compass,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { cn } from "@/lib/utils";
import {
  demoUserProfile,
  demoTodayNutrition,
  demoWeeklyActivity,
} from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";
import {
  getFoodLogsForDate,
  calculateDayNutritionSummary,
  getTodayDateString,
} from "@/lib/food-logs";
import type { FoodLog, DayNutritionSummary } from "@/types/food-log";

export default function DashboardPage() {
  const [userName, setUserName] = React.useState(demoUserProfile.name);
  const [todayLogs, setTodayLogs] = React.useState<FoodLog[]>([]);
  const [todayDate, setTodayDate] = React.useState("2026-11-11");
  const [userGoals, setUserGoals] = React.useState<{
    daily_calorie_goal?: number | null;
    daily_protein_goal?: number | null;
  }>({});
  const [isLoadingNutrition, setIsLoadingNutrition] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboardData() {
      try {
        const clientToday = getTodayDateString();
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        let profileGoals = {};
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, daily_calorie_goal, daily_protein_goal")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.full_name) {
            setUserName(profile.full_name);
          } else if (user.user_metadata?.full_name) {
            setUserName(user.user_metadata.full_name);
          }

          if (profile) {
            profileGoals = {
              daily_calorie_goal: profile.daily_calorie_goal,
              daily_protein_goal: profile.daily_protein_goal,
            };
            setUserGoals(profileGoals);
          }
        }

        // Fetch real food logs for today
        const logs = await getFoodLogsForDate(clientToday);
        setTodayDate(clientToday);
        setTodayLogs(logs);
      } catch {
        // Fallback handled
      } finally {
        setIsLoadingNutrition(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute real daily nutrition summary
  const summary: DayNutritionSummary = React.useMemo(() => {
    return calculateDayNutritionSummary(todayLogs, todayDate, userGoals);
  }, [todayLogs, todayDate, userGoals]);

  // Interactive prototype state for water intake
  const [waterMl, setWaterMl] = React.useState(demoTodayNutrition.waterMl);
  const [waterAddedMessage, setWaterAddedMessage] = React.useState<string | null>(null);

  const handleAddWater = () => {
    setWaterMl((prev) => Math.min(prev + 250, 4000));
    setWaterAddedMessage("+250ml added");
    setTimeout(() => setWaterAddedMessage(null), 2000);
  };

  // Today's steps from weekly activity
  const todayActivity = demoWeeklyActivity[1];
  const stepsPercent = Math.min(
    Math.round((todayActivity.steps / todayActivity.stepGoal) * 100),
    100
  );

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Banner & Personal Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#437151]" />
            <span>Daily Activity & Diary</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Good morning, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            {todayDate} • Clean nutrition & intentional movement
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            href="/app/food/scan"
            size="sm"
            variant="primary"
            icon={<Scan size={15} />}
            iconPosition="left"
          >
            Scan Food
          </Button>
          <Button
            href="/app/food"
            size="sm"
            variant="secondary"
            icon={<Utensils size={15} />}
            iconPosition="left"
          >
            Log Meal
          </Button>
          <Button
            href="/app/workouts"
            size="sm"
            variant="outline"
            icon={<Activity size={15} />}
            iconPosition="left"
          >
            Log Workout
          </Button>
        </div>
      </div>

      {/* PRIMARY STATS ROW: Real Calorie Overview & Macro Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Calorie Overview Card */}
        <Card variant="default" className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <div>
                <h2 className="text-base font-semibold text-[#1C1F1D]">Daily Calorie Budget</h2>
                <p className="text-xs text-[#575E59]">Target: {summary.targetCalories} kcal</p>
              </div>
              <Badge variant="sage" size="sm">
                {summary.caloriesPercent}% of Goal
              </Badge>
            </div>

            {isLoadingNutrition ? (
              <div className="py-10 text-center text-xs text-[#717A73]">
                Loading daily nutrition logs...
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 pt-6 text-center">
                <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
                  <p className="text-2xl font-bold text-[#1C1F1D]">{summary.totalCalories}</p>
                  <p className="text-[11px] font-medium text-[#717A73] uppercase tracking-wider mt-0.5">
                    Consumed
                  </p>
                </div>
                <div className="rounded-xl bg-[#E2ECE4] p-3 border border-[#C7DBD0]">
                  <p className="text-2xl font-bold text-[#263B2C]">{summary.caloriesRemaining}</p>
                  <p className="text-[11px] font-medium text-[#375A41] uppercase tracking-wider mt-0.5">
                    Remaining
                  </p>
                </div>
                <div className="rounded-xl bg-[#FAF8F5] p-3 border border-[#E8E5DD]">
                  <p className="text-2xl font-bold text-[#6B7546]">{todayActivity.caloriesBurned}</p>
                  <p className="text-[11px] font-medium text-[#717A73] uppercase tracking-wider mt-0.5">
                    Burned Active
                  </p>
                </div>
              </div>
            )}

            {/* Calorie Progress Bar */}
            <div className="pt-6 space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-[#575E59]">
                <span>Progress to maintenance</span>
                <span>
                  {summary.totalCalories} / {summary.targetCalories} kcal
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#437151] transition-all duration-500"
                  style={{ width: `${summary.caloriesPercent}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-6 mt-4 border-t border-[#E8E5DD] flex items-center justify-between text-xs text-[#575E59]">
            <span className="flex items-center gap-1.5">
              <Flame size={14} className="text-[#437151]" />
              {todayLogs.length} {todayLogs.length === 1 ? "meal logged" : "meals logged"} today
            </span>
            <Link
              href="/app/food"
              className="font-semibold text-[#437151] hover:underline flex items-center gap-1"
            >
              <span>Open Food Diary</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </Card>

        {/* Real Macronutrient Progress Card */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
              <h2 className="text-base font-semibold text-[#1C1F1D]">Macronutrients</h2>
              <Badge variant="neutral" size="sm">Grams</Badge>
            </div>

            <div className="space-y-4 pt-5">
              {/* Protein */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#1C1F1D]">Protein</span>
                  <span className="text-[#575E59]">
                    {summary.totalProtein} / {summary.targetProtein}g ({summary.proteinPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#437151] transition-all duration-300"
                    style={{ width: `${summary.proteinPercent}%` }}
                  />
                </div>
              </div>

              {/* Carbohydrates */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#1C1F1D]">Carbohydrates</span>
                  <span className="text-[#575E59]">
                    {summary.totalCarbs} / {summary.targetCarbs}g ({summary.carbsPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#6B7546] transition-all duration-300"
                    style={{ width: `${summary.carbsPercent}%` }}
                  />
                </div>
              </div>

              {/* Healthy Fats */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-[#1C1F1D]">Fats</span>
                  <span className="text-[#575E59]">
                    {summary.totalFat} / {summary.targetFat}g ({summary.fatPercent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#88935D] transition-all duration-300"
                    style={{ width: `${summary.fatPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-5 mt-4 border-t border-[#E8E5DD] text-center">
            <p className="text-[11px] text-[#717A73]">
              Target: 30% Protein • 45% Carbs • 25% Fats
            </p>
          </div>
        </Card>
      </div>

      {/* SECONDARY ROW: Activity Quick Stats & Water Intake */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Steps Overview */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#575E59] uppercase tracking-wider">
              Steps Today
            </span>
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Footprints size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1C1F1D]">{todayActivity.steps.toLocaleString()}</p>
            <p className="text-xs text-[#717A73]">
              Goal: {todayActivity.stepGoal.toLocaleString()} ({stepsPercent}%)
            </p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: `${stepsPercent}%` }} />
          </div>
        </Card>

        {/* Distance Overview */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#575E59] uppercase tracking-wider">
              Distance
            </span>
            <div className="p-2 rounded-xl bg-[#EDF0DF] text-[#43492D]">
              <Compass size={18} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1C1F1D]">{todayActivity.distanceKm} km</p>
            <p className="text-xs text-[#717A73]">Outdoor movement</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#6B7546]" style={{ width: "78%" }} />
          </div>
        </Card>

        {/* Activity Calorie Estimate */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#575E59] uppercase tracking-wider">
              Active Burn
            </span>
            <div className="p-2 rounded-xl bg-[#FAF8F5] text-[#1C1F1D] border border-[#E8E5DD]">
              <Flame size={18} className="text-[#437151]" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1C1F1D]">{todayActivity.caloriesBurned} kcal</p>
            <p className="text-xs text-[#717A73]">{todayActivity.activeMinutes} mins active time</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: "85%" }} />
          </div>
        </Card>

        {/* Interactive Water Intake */}
        <Card variant="default" className="p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#575E59] uppercase tracking-wider">
              Water Intake
            </span>
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Droplet size={18} />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-[#1C1F1D]">{(waterMl / 1000).toFixed(2)}L</p>
              <span className="text-xs text-[#717A73]">
                / {(demoTodayNutrition.targetWaterMl / 1000).toFixed(1)}L
              </span>
            </div>
            {waterAddedMessage && (
              <span className="text-[11px] font-semibold text-[#437151]">{waterAddedMessage}</span>
            )}
          </div>
          <Button
            onClick={handleAddWater}
            size="sm"
            variant="secondary"
            className="w-full text-xs"
            icon={<Plus size={14} />}
            iconPosition="left"
          >
            +250ml Glass
          </Button>
        </Card>
      </div>

      {/* BOTTOM SECTION: Real Meal Log from Food Diary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Meals List */}
        <Card variant="default" className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DD]">
            <div>
              <h2 className="text-base font-semibold text-[#1C1F1D]">Today&apos;s Meal Log</h2>
              <p className="text-xs text-[#575E59]">
                {todayLogs.length} {todayLogs.length === 1 ? "entry logged" : "entries logged"} today
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button href="/app/food/scan" size="sm" variant="primary" icon={<Scan size={14} />} iconPosition="left">
                Scan Meal
              </Button>
              <Button href="/app/food" size="sm" variant="secondary" icon={<Plus size={14} />} iconPosition="left">
                Add Food
              </Button>
            </div>
          </div>

          <div className="pt-2">
            {todayLogs.length === 0 ? (
              <div className="py-10 text-center text-xs text-[#717A73] border border-dashed border-[#E8E5DD] rounded-xl bg-[#FAF8F5]/40 space-y-2 mt-2">
                <p className="font-semibold text-[#1C1F1D]">No meals logged yet today.</p>
                <p>Track whole foods and portion sizes to monitor your daily calories.</p>
                <Button href="/app/food" size="sm" variant="secondary" className="mt-2 text-xs">
                  Open Food Tracker
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-[#E8E5DD]">
                {todayLogs.slice(0, 5).map((meal) => (
                  <div key={meal.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-[#375A41]">
                        <Utensils size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[#1C1F1D]">{meal.food_name}</p>
                          {meal.is_ai_estimate ? (
                            <span className="text-[10px] font-medium text-[#263B2C] bg-[#E2ECE4] border border-[#C7DBD0] rounded px-1.5 py-0.2">
                              AI Scan
                            </span>
                          ) : (
                            <span className="text-[10px] text-[#717A73] bg-[#FAF8F5] border border-[#E8E5DD] rounded px-1.5 py-0.2">
                              {meal.meal_type}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#717A73]">
                          {meal.serving_name || `${meal.quantity_g}g`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-[#1C1F1D]">{meal.calories} kcal</p>
                      <p className="text-[11px] text-[#575E59]">
                        {meal.protein}g P • {meal.carbohydrates}g C • {meal.fat}g F
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Weekly Movement Progress Card */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DD]">
              <h2 className="text-base font-semibold text-[#1C1F1D]">Weekly Movement</h2>
              <Badge variant="sage" size="sm">7 Days</Badge>
            </div>

            <p className="text-xs text-[#575E59] pt-4">Daily step volume vs 10,000 goal</p>

            {/* Apple-style minimalist SVG Bar Chart */}
            <div className="pt-6 pb-2 flex items-end justify-between gap-2 h-44">
              {demoWeeklyActivity.map((day) => {
                const heightPercent = Math.min(Math.round((day.steps / 14000) * 100), 100);
                const isTargetMet = day.steps >= day.stepGoal;

                return (
                  <div key={day.shortDay} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[10px] font-semibold text-[#717A73] opacity-0 group-hover:opacity-100 transition-opacity">
                      {(day.steps / 1000).toFixed(1)}k
                    </span>
                    <div className="w-full rounded-t-lg bg-[#EFEBE1] h-32 flex items-end overflow-hidden p-0.5">
                      <div
                        className={cn(
                          "w-full rounded-t-md transition-all duration-300",
                          isTargetMet ? "bg-[#437151]" : "bg-[#6B7546]/80"
                        )}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-medium text-[#575E59]">
                      {day.shortDay}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E5DD] flex items-center justify-between text-xs text-[#575E59]">
            <span>Weekly Avg: 9,820 steps</span>
            <Link href="/app/activity" className="font-semibold text-[#437151] hover:underline">
              Activity Trends →
            </Link>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
