"use client";

import * as React from "react";
import {
  Activity,
  Apple,
  Droplets,
  Moon,
  Scale,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Info,
  Clock,
  Flame,
  Dumbbell,
  Compass,
  Footprints,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  DailyHealthSummaryResponse,
} from "@/types/daily-summary";

interface DailyHealthSummaryCardProps {
  selectedDate: string;
}

export function DailyHealthSummaryCard({ selectedDate }: DailyHealthSummaryCardProps) {
  const [data, setData] = React.useState<DailyHealthSummaryResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshCount, setRefreshCount] = React.useState(0);

  React.useEffect(() => {
    let isCancelled = false;

    async function fetchSummary() {
      try {
        const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
        const res = await fetch(
          `/api/health/daily-summary?date=${encodeURIComponent(selectedDate)}&timezone=${encodeURIComponent(clientTz)}`
        );
        const resData = (await res.json()) as DailyHealthSummaryResponse;

        if (isCancelled) return;

        if (!res.ok || !resData.success) {
          setError(resData.message || "Failed to load daily health summary.");
          return;
        }

        setData(resData);
      } catch (err: unknown) {
        if (isCancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Network error occurred while fetching daily summary."
        );
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    fetchSummary();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, refreshCount]);

  const handleRefresh = () => {
    setLoading(true);
    setError(null);
    setRefreshCount((c) => c + 1);
  };

  const nutrition = data?.nutrition;
  const activity = data?.activity;
  const health = data?.health;
  const insights = data?.insights || [];

  return (
    <Card variant="default" className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E2ECE4] text-[#375A41] border border-[#C7DBD0]">
            <Compass size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[#1C1F1D]">
                Daily Health Summary & Multi-Pillar Insights
              </h2>
              <Badge variant="sage" size="sm">
                Stage 10.4
              </Badge>
            </div>
            <p className="text-xs text-[#575E59]">
              Cross-pillar synthesis of nutrition, active movement, hydration, sleep, and weight trends
            </p>
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={loading}
          variant="secondary"
          size="sm"
          icon={<RefreshCw size={14} className={loading ? "animate-spin" : ""} />}
        >
          {loading ? "Refreshing..." : "Refresh Summary"}
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-center gap-2 text-xs text-[#717A73]">
            <RefreshCw size={14} className="animate-spin text-[#437151]" />
            <span>Compiling cross-pillar summary for {selectedDate}...</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-xl bg-[#FAF8F5]/80 border border-[#E8E5DD] animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error Notice */}
      {!loading && error && (
        <div className="p-4 rounded-xl border border-[#F3C4B8] bg-[#FDF3F0] space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#A63A20]">
            <AlertCircle size={16} />
            <span>Unable to load daily health summary</span>
          </div>
          <p className="text-xs text-[#717A73]">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm" className="text-xs">
            Try Again
          </Button>
        </div>
      )}

      {/* Main Content */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Three Pillar Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. NUTRITION PILLAR */}
            <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1F1D]">
                    <Apple size={16} className="text-[#437151]" />
                    <span>Nutrition Pillar</span>
                  </div>
                  {nutrition?.status === "recorded" ? (
                    <span className="text-[10px] font-semibold text-[#375A41] bg-[#E2ECE4] px-2 py-0.5 rounded-full">
                      {nutrition.loggedMealCount} Logged
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#717A73] bg-[#EFEBE1] px-2 py-0.5 rounded-full">
                      No Meals Logged
                    </span>
                  )}
                </div>

                {nutrition?.status === "recorded" ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#717A73] flex items-center gap-1">
                        <Flame size={13} className="text-[#C15C3D]" />
                        Calories
                      </span>
                      <span className="font-semibold text-[#1C1F1D]">
                        {nutrition.caloriesConsumed}
                        {nutrition.calorieGoal ? ` / ${nutrition.calorieGoal}` : ""} kcal
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#717A73] flex items-center gap-1">
                        <Dumbbell size={13} className="text-[#437151]" />
                        Protein
                      </span>
                      <span className="font-semibold text-[#437151]">
                        {nutrition.proteinConsumedG}
                        {nutrition.proteinGoalG ? ` / ${nutrition.proteinGoalG}` : ""}g
                      </span>
                    </div>

                    {nutrition.caloriesRemaining !== null && (
                      <div className="text-[11px] text-[#437151] font-medium pt-1">
                        {nutrition.caloriesRemaining} kcal remaining in budget
                      </div>
                    )}

                    {/* Meal Completeness Checklist */}
                    <div className="pt-2 border-t border-[#E8E5DD]">
                      <span className="text-[10px] text-[#717A73] block mb-1.5 font-medium">
                        Meal Completeness:
                      </span>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <span className={`flex items-center gap-1 ${nutrition.completeness.hasBreakfast ? "text-[#375A41] font-medium" : "text-[#717A73]"}`}>
                          <CheckCircle2 size={12} className={nutrition.completeness.hasBreakfast ? "text-[#375A41]" : "text-[#C7C3B8]"} />
                          Breakfast
                        </span>
                        <span className={`flex items-center gap-1 ${nutrition.completeness.hasLunch ? "text-[#375A41] font-medium" : "text-[#717A73]"}`}>
                          <CheckCircle2 size={12} className={nutrition.completeness.hasLunch ? "text-[#375A41]" : "text-[#C7C3B8]"} />
                          Lunch
                        </span>
                        <span className={`flex items-center gap-1 ${nutrition.completeness.hasDinner ? "text-[#375A41] font-medium" : "text-[#717A73]"}`}>
                          <CheckCircle2 size={12} className={nutrition.completeness.hasDinner ? "text-[#375A41]" : "text-[#C7C3B8]"} />
                          Dinner
                        </span>
                        <span className={`flex items-center gap-1 ${nutrition.completeness.hasSnacks ? "text-[#375A41] font-medium" : "text-[#717A73]"}`}>
                          <CheckCircle2 size={12} className={nutrition.completeness.hasSnacks ? "text-[#375A41]" : "text-[#C7C3B8]"} />
                          Snacks
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-[#717A73] space-y-1">
                    <p className="font-medium text-[#1C1F1D]">No Nutrition Records</p>
                    <p className="text-[11px]">No meals or food items have been recorded for this calendar date.</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E8E5DD] text-[11px] text-[#717A73]">
                {nutrition?.calorieGoal ? `Target: ${nutrition.calorieGoal} kcal / ${nutrition.proteinGoalG ?? "—"}g P` : "Goals unconfigured"}
              </div>
            </div>

            {/* 2. ACTIVITY PILLAR */}
            <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1F1D]">
                    <Activity size={16} className="text-[#375A41]" />
                    <span>Activity Pillar</span>
                  </div>
                  {activity?.status === "recorded" ? (
                    <span className="text-[10px] font-semibold text-[#375A41] bg-[#E2ECE4] px-2 py-0.5 rounded-full">
                      {activity.totalWorkouts} Workouts
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#717A73] bg-[#EFEBE1] px-2 py-0.5 rounded-full">
                      No Activity
                    </span>
                  )}
                </div>

                {activity?.status === "recorded" ? (
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[#717A73] flex items-center gap-1">
                        <Clock size={13} className="text-[#437151]" />
                        Active Duration
                      </span>
                      <span className="font-semibold text-[#1C1F1D]">
                        {Math.round(activity.totalDurationSeconds / 60)} minutes
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[#717A73] flex items-center gap-1">
                        <Compass size={13} className="text-[#437151]" />
                        Distance
                      </span>
                      <span className="font-semibold text-[#1C1F1D]">
                        {(activity.totalDistanceMeters / 1000).toFixed(1)} km
                      </span>
                    </div>

                    {activity.totalActiveCalories !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-[#717A73] flex items-center gap-1">
                          <Flame size={13} className="text-[#C15C3D]" />
                          Active Energy
                        </span>
                        <span className="font-semibold text-[#1C1F1D]">
                          ~{activity.totalActiveCalories} kcal
                        </span>
                      </div>
                    )}

                    {activity.totalSteps !== null ? (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[#717A73] flex items-center gap-1">
                          <Footprints size={13} className="text-[#6B7546]" />
                          Daily Steps
                        </span>
                        <span className="font-semibold text-[#437151]">
                          {activity.totalSteps.toLocaleString()} steps
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-[#717A73] pt-1">
                        Steps: No step entry logged
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-[#717A73] space-y-1">
                    <p className="font-medium text-[#1C1F1D]">No Workouts Recorded</p>
                    <p className="text-[11px]">No active exercise sessions recorded for this date.</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-[#E8E5DD] text-[11px] text-[#717A73]">
                {activity?.status === "recorded" ? `${activity.totalWorkouts} sessions logged` : "No sessions recorded"}
              </div>
            </div>

            {/* 3. HEALTH TRACKING PILLAR */}
            <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E8E5DD]">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#1C1F1D]">
                    <Scale size={16} className="text-[#437151]" />
                    <span>Health Tracking Pillar</span>
                  </div>
                  <span className="text-[10px] font-semibold text-[#375A41] bg-[#E2ECE4] px-2 py-0.5 rounded-full">
                    Biometrics
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Weight & BMI */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#717A73] flex items-center gap-1">
                      <Scale size={13} className="text-[#437151]" />
                      Weight / BMI
                    </span>
                    {health?.weightStatus === "recorded" && health.weightKg !== null ? (
                      <span className="font-semibold text-[#1C1F1D]">
                        {health.weightKg} kg {health.bmi ? `(BMI ${health.bmi})` : ""}
                      </span>
                    ) : (
                      <span className="text-[#717A73] text-[11px]">No weight logged</span>
                    )}
                  </div>

                  {health?.bmiCategory && (
                    <div className="text-[11px] text-[#437151] font-medium">
                      Category: {health.bmiCategory}
                    </div>
                  )}

                  {/* Water Intake */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E8E5DD]">
                    <span className="text-[#717A73] flex items-center gap-1">
                      <Droplets size={13} className="text-[#3A729E]" />
                      Water Intake
                    </span>
                    {health?.waterStatus === "recorded" && health.waterTotalMl !== null ? (
                      <span className="font-semibold text-[#1C1F1D]">
                        {health.waterTotalMl}
                        {health.waterGoalMl ? ` / ${health.waterGoalMl}` : ""} ml
                      </span>
                    ) : (
                      <span className="text-[#717A73] text-[11px]">No water logged</span>
                    )}
                  </div>

                  {/* Sleep Duration */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E8E5DD]">
                    <span className="text-[#717A73] flex items-center gap-1">
                      <Moon size={13} className="text-[#655787]" />
                      Sleep Duration
                    </span>
                    {health?.sleepStatus === "recorded" && health.sleepDurationMinutes !== null ? (
                      <span className="font-semibold text-[#1C1F1D]">
                        {Math.floor(health.sleepDurationMinutes / 60)}h {health.sleepDurationMinutes % 60}m
                        {health.sleepGoalMinutes ? ` / ${Math.floor(health.sleepGoalMinutes / 60)}h` : ""}
                      </span>
                    ) : (
                      <span className="text-[#717A73] text-[11px]">No sleep logged</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E5DD] text-[11px] text-[#717A73]">
                {health && health.weightChangeKg !== null ? `Trajectory: ${health.weightChangeKg > 0 ? "+" : ""}${health.weightChangeKg} kg vs prior` : "Baseline recorded"}
              </div>
            </div>
          </div>

          {/* Multi-Pillar Insights Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#437151]" />
                <h3 className="text-sm font-bold text-[#1C1F1D]">
                  Multi-Pillar Cautious Observations
                </h3>
              </div>
              <span className="text-[11px] text-[#717A73]">
                {insights.length} insight{insights.length === 1 ? "" : "s"} generated
              </span>
            </div>

            {insights.length === 0 ? (
              <div className="p-4 rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] text-center text-xs text-[#717A73]">
                No specific observations triggered. Log meals, hydration, and workouts to generate cross-pillar insights.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {insights.map((ins) => (
                  <div
                    key={ins.id}
                    className="p-3.5 rounded-xl border border-[#E8E5DD] bg-white space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold text-[#375A41] uppercase tracking-wider bg-[#E2ECE4] px-2 py-0.5 rounded-md">
                          {ins.pillar.replace("_", " ")}
                        </span>
                        {ins.isAiGenerated ? (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-[#8C6D23] bg-[#FEF7E6] px-1.5 py-0.5 rounded border border-[#FBE0A6]">
                            <Sparkles size={11} className="text-[#B58514]" />
                            AI Insight
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-[#2C4A35] bg-[#E2ECE4] px-1.5 py-0.5 rounded border border-[#C7DBD0]">
                            <CheckCircle2 size={11} className="text-[#375A41]" />
                            Verified Observation
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-[#1C1F1D]">
                        {ins.title}
                      </h4>

                      <p className="text-xs text-[#575E59] leading-relaxed">
                        {ins.observation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Educational Disclaimer */}
          <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] flex items-start gap-2 text-[11px] text-[#717A73]">
            <Info size={14} className="shrink-0 mt-0.5 text-[#88935D]" />
            <span>
              <strong>Wellness Advisory:</strong> {data.disclaimer}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
