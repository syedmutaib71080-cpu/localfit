"use client";

import * as React from "react";
import Link from "next/link";
import {
  Footprints,
  Compass,
  Flame,
  Clock,
  Sparkles,
  Dumbbell,
  Plus,
  Bike,
  Navigation,
  Edit2,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { StepEntryModal } from "@/components/activity/step-entry-modal";
import {
  fetchWorkouts,
  fetchDailySteps,
  fetchStepsRange,
  addStepEntry,
  updateStepEntry,
  deleteStepEntry,
  computeDailyActivitySummary,
  computeWeeklySummary,
} from "@/lib/activity-client";
import { createClient } from "@/lib/supabase/client";
import type {
  ActivityWorkout,
  DailyStepEntry,
  CreateStepInput,
  UpdateStepInput,
  DailyActivitySummary,
  WeeklyDaySummary,
} from "@/types/activity";

export default function ActivityPage() {
  const [workouts, setWorkouts] = React.useState<ActivityWorkout[]>([]);
  const [todaySteps, setTodaySteps] = React.useState<DailyStepEntry[]>([]);
  const [weeklySteps, setWeeklySteps] = React.useState<DailyStepEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userWeightKg, setUserWeightKg] = React.useState<number | null>(null);

  // Step modal state
  const [isStepModalOpen, setIsStepModalOpen] = React.useState(false);
  const [editingStepEntry, setEditingStepEntry] = React.useState<DailyStepEntry | null>(null);

  // Sensor capability detection
  const [hasSensorSupport] = React.useState<boolean>(() => {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  });
  const [notification, setNotification] = React.useState<string | null>(null);

  const [todayStr, setTodayStr] = React.useState("2026-11-11");
  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch real data
  React.useEffect(() => {
    let isMounted = true;

    async function loadActivityData() {
      try {
        const now = new Date();
        const clientToday = now.toISOString().split("T")[0];
        const past = new Date(now);
        past.setDate(past.getDate() - 6);
        const clientSevenDaysAgo = past.toISOString().split("T")[0];

        if (isMounted) {
          setTodayStr(clientToday);
        }

        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && isMounted) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("weight_kg")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.weight_kg && isMounted) {
            setUserWeightKg(Number(profile.weight_kg));
          }
        }

        const [loadedWorkouts, loadedTodaySteps, loadedWeeklySteps] = await Promise.all([
          fetchWorkouts(),
          fetchDailySteps(clientToday),
          fetchStepsRange(clientSevenDaysAgo, clientToday),
        ]);

        if (isMounted) {
          setWorkouts(loadedWorkouts);
          setTodaySteps(loadedTodaySteps);
          setWeeklySteps(loadedWeeklySteps);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadActivityData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Compute real today summary
  const todaySummary: DailyActivitySummary = React.useMemo(() => {
    return computeDailyActivitySummary(todayStr, workouts, todaySteps);
  }, [todayStr, workouts, todaySteps]);

  // Compute real weekly 7-day summary
  const weeklySummary: WeeklyDaySummary[] = React.useMemo(() => {
    return computeWeeklySummary(workouts, weeklySteps, todayStr);
  }, [workouts, weeklySteps, todayStr]);

  const totalDistanceKm = (
    todaySummary.walking_distance_km +
    todaySummary.running_distance_km +
    todaySummary.cycling_distance_km
  ).toFixed(1);

  const activeMinutes = Math.round(todaySummary.total_workout_duration_seconds / 60);

  // Handlers for steps
  const handleOpenAddModal = () => {
    setEditingStepEntry(null);
    setIsStepModalOpen(true);
  };

  const handleOpenEditModal = (entry: DailyStepEntry) => {
    setEditingStepEntry(entry);
    setIsStepModalOpen(true);
  };

  const handleAddStep = async (input: CreateStepInput) => {
    const res = await addStepEntry(input);
    if (res.success && res.stepEntry) {
      setNotification(`Logged ${input.steps.toLocaleString()} steps.`);
      setTimeout(() => setNotification(null), 4000);
    }
    return res;
  };

  const handleUpdateStep = async (id: string, input: UpdateStepInput) => {
    const res = await updateStepEntry(id, input);
    if (res.success) {
      setNotification("Step entry updated.");
      setTimeout(() => setNotification(null), 4000);
    }
    return res;
  };

  const handleDeleteStep = async (id: string) => {
    const ok = await deleteStepEntry(id);
    if (ok) {
      setNotification("Step entry removed.");
      setTimeout(() => setNotification(null), 4000);
    }
    return ok;
  };

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <Sparkles size={12} className="text-[#375A41]" />
            <span>Activity & Fitness Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Daily Activity & Movement
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Real recorded movement, step volume, and active workout tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenAddModal}
            size="sm"
            variant="outline"
            icon={<Plus size={14} />}
            iconPosition="left"
          >
            Log Steps
          </Button>
          <Button
            href="/app/workouts"
            size="sm"
            variant="primary"
            icon={<Dumbbell size={15} />}
            iconPosition="left"
          >
            Workout Studio
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="h-1 w-full bg-[#EFEBE1] overflow-hidden rounded-full">
          <div className="h-full bg-[#437151] animate-pulse w-1/3 rounded-full" />
        </div>
      )}

      {notification && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#375A41]" />
          <span>{notification}</span>
        </div>
      )}

      {/* PRIMARY STATS TILES: Real Recorded Data Only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Steps */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Today&apos;s Steps
            </span>
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Footprints size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1C1F1D]">
              {todaySummary.total_steps.toLocaleString()}
            </p>
            <p className="text-xs text-[#717A73]">
              {todaySummary.step_entries_count > 0
                ? `${todaySummary.step_entries_count} logged entry${todaySummary.step_entries_count === 1 ? "" : "s"} today`
                : "No steps logged yet today"}
            </p>
          </div>
          <div className="pt-1">
            <button
              onClick={handleOpenAddModal}
              className="text-xs font-semibold text-[#375A41] hover:underline inline-flex items-center gap-1"
            >
              <Plus size={12} />
              <span>Add steps</span>
            </button>
          </div>
        </Card>

        {/* Distance */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Total Distance
            </span>
            <div className="p-2 rounded-xl bg-[#EDF0DF] text-[#43492D]">
              <Compass size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1C1F1D]">{totalDistanceKm} km</p>
            <p className="text-xs text-[#717A73]">
              {todaySummary.workouts_count > 0
                ? `From ${todaySummary.workouts_count} recorded session${todaySummary.workouts_count === 1 ? "" : "s"}`
                : "No workouts recorded today"}
            </p>
          </div>
          <div className="pt-1 text-[11px] text-[#717A73] flex items-center gap-2">
            <span>Walk: {todaySummary.walking_distance_km}km</span>
            <span>•</span>
            <span>Run: {todaySummary.running_distance_km}km</span>
          </div>
        </Card>

        {/* Active Calories */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Est. Active Burn
            </span>
            <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-[#437151]">
              <Flame size={18} />
            </div>
          </div>
          <div>
            {todaySummary.total_estimated_calories > 0 ? (
              <>
                <p className="text-3xl font-bold text-[#1C1F1D]">
                  {todaySummary.total_estimated_calories}{" "}
                  <span className="text-sm font-normal text-[#575E59]">kcal</span>
                </p>
                <p className="text-xs text-[#717A73]">
                  From {todaySummary.workouts_with_calories_count} workout{todaySummary.workouts_with_calories_count === 1 ? "" : "s"}
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-[#1C1F1D]">0 kcal</p>
                <p className="text-xs text-[#717A73]">
                  {userWeightKg
                    ? "Start a workout to record calorie burn"
                    : "Add profile weight for personalized calories"}
                </p>
              </>
            )}
          </div>
          {todaySummary.workouts_without_calories_count > 0 && (
            <p className="text-[10px] text-[#C25E34]">
              {todaySummary.workouts_without_calories_count} workout(s) excluded (weight missing)
            </p>
          )}
        </Card>

        {/* Active Minutes */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Active Workout Time
            </span>
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Clock size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1C1F1D]">{activeMinutes} mins</p>
            <p className="text-xs text-[#717A73]">
              {todaySummary.workouts_count > 0
                ? `${todaySummary.workouts_count} active session${todaySummary.workouts_count === 1 ? "" : "s"} today`
                : "No active workouts logged today"}
            </p>
          </div>
          <div className="pt-1">
            <Link
              href="/app/workouts"
              className="text-xs font-semibold text-[#375A41] hover:underline"
            >
              Start workout →
            </Link>
          </div>
        </Card>
      </div>

      {/* 3 DISCIPLINE DISTANCE CARDS (Walking, Running, Cycling) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Walking */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
                <Footprints size={18} />
              </div>
              <h3 className="font-semibold text-[#1C1F1D]">Walking</h3>
            </div>
            <Badge variant="sage" size="sm">Aerobic</Badge>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Recorded Distance</span>
              <span className="font-bold text-[#1C1F1D]">
                {todaySummary.walking_distance_km} km
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Daily Steps Logged</span>
              <span className="font-semibold text-[#1C1F1D]">
                {todaySummary.total_steps.toLocaleString()} steps
              </span>
            </div>
          </div>
          <Button
            href="/app/workouts"
            variant="outline"
            size="sm"
            className="w-full"
          >
            Track Walk
          </Button>
        </Card>

        {/* Running */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-[#437151]">
                <Navigation size={18} />
              </div>
              <h3 className="font-semibold text-[#1C1F1D]">Running</h3>
            </div>
            <Badge variant="sage" size="sm">Cardio</Badge>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Recorded Distance</span>
              <span className="font-bold text-[#1C1F1D]">
                {todaySummary.running_distance_km} km
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Discipline Type</span>
              <span className="font-semibold text-[#1C1F1D]">Outdoor / Trail</span>
            </div>
          </div>
          <Button
            href="/app/workouts"
            variant="outline"
            size="sm"
            className="w-full"
          >
            Track Run
          </Button>
        </Card>

        {/* Cycling */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#EDF0DF] text-[#43492D]">
                <Bike size={18} />
              </div>
              <h3 className="font-semibold text-[#1C1F1D]">Cycling</h3>
            </div>
            <Badge variant="sage" size="sm">Endurance</Badge>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Recorded Distance</span>
              <span className="font-bold text-[#1C1F1D]">
                {todaySummary.cycling_distance_km} km
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Discipline Type</span>
              <span className="font-semibold text-[#1C1F1D]">Road / Gravel</span>
            </div>
          </div>
          <Button
            href="/app/workouts"
            variant="outline"
            size="sm"
            className="w-full"
          >
            Track Ride
          </Button>
        </Card>
      </div>

      {/* WEEKLY ACTIVITY SUMMARY (7 Days from Real Records) */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#1C1F1D]">7-Day Activity Summary</h3>
            <p className="text-xs text-[#575E59]">
              Aggregated from your real recorded workouts and logged steps.
            </p>
          </div>
          <Badge variant="neutral" size="sm">Past 7 Days</Badge>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-2">
          {weeklySummary.map((day) => {
            const isToday = day.date === todayStr;
            return (
              <div
                key={day.date}
                className={`p-3 rounded-xl border text-center transition-all ${
                  isToday
                    ? "bg-[#E2ECE4] border-[#C7DBD0]"
                    : "bg-[#FAF8F5] border-[#E8E5DD]"
                }`}
              >
                <span className={`text-[11px] font-bold block ${isToday ? "text-[#263B2C]" : "text-[#575E59]"}`}>
                  {day.dayLabel}
                </span>
                <span className="text-[10px] text-[#717A73] block mb-2">
                  {day.date.slice(5)}
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#1C1F1D]">
                    {day.steps > 0 ? `${day.steps.toLocaleString()}` : "0"}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-[#717A73]">steps</p>
                  {day.totalDistanceKm > 0 && (
                    <p className="text-[10px] font-semibold text-[#437151]">
                      {day.totalDistanceKm}km
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* TODAY'S STEP ENTRIES (Cumulative log inspection, edit & delete) */}
      <Card variant="default" className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Footprints size={18} className="text-[#375A41]" />
            <h3 className="text-base font-semibold text-[#1C1F1D]">
              Today&apos;s Step Log Entries
            </h3>
          </div>
          <Button
            onClick={handleOpenAddModal}
            size="sm"
            variant="primary"
            icon={<Plus size={14} />}
            iconPosition="left"
          >
            Add Steps
          </Button>
        </div>

        {todaySteps.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#717A73] bg-[#FAF8F5] rounded-xl border border-[#E8E5DD]">
            No step entries recorded today yet. Log your steps using the button above.
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DD]">
            {todaySteps.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#1C1F1D]">
                      {s.steps.toLocaleString()} steps
                    </span>
                    <Badge variant="neutral" size="sm" className="capitalize text-[10px]">
                      {s.source.replace("_", " ")}
                    </Badge>
                  </div>
                  {s.notes && (
                    <p className="text-[#575E59] italic">&ldquo;{s.notes}&rdquo;</p>
                  )}
                  <span className="text-[10px] text-[#717A73]">
                    Logged at {new Date(s.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenEditModal(s)}
                  className="p-2 rounded-lg text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] transition-colors"
                  title="Edit or delete entry"
                >
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* SENSOR CAPABILITY & TRANSPARENCY NOTICE */}
      <div className="p-4 rounded-2xl bg-[#F5EFEB] border border-[#E8E5DD] flex items-start gap-3 text-xs text-[#575E59]">
        <Info size={16} className="text-[#375A41] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-[#1C1F1D]">
            Browser Step Tracking Notice
          </p>
          <p className="leading-relaxed">
            Web browsers do not support true background pedometer tracking when the browser is inactive or closed. LocalFit uses <strong>manual daily step entry</strong> as the dependable method for step volume. {hasSensorSupport ? "Motion sensors are accessible for active sessions." : "Your current browser does not expose motion sensors."}
          </p>
        </div>
      </div>

      {/* STEP ENTRY MODAL */}
      <StepEntryModal
        isOpen={isStepModalOpen}
        onClose={() => {
          setIsStepModalOpen(false);
          setEditingStepEntry(null);
        }}
        onSaved={() => setRefreshKey((k) => k + 1)}
        initialDate={todayStr}
        editingEntry={editingStepEntry}
        existingEntriesForDay={todaySteps}
        onAddStep={handleAddStep}
        onUpdateStep={handleUpdateStep}
        onDeleteStep={handleDeleteStep}
      />
    </PageContainer>
  );
}
