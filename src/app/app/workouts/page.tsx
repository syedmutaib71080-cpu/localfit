"use client";

import * as React from "react";
import {
  Play,
  Sparkles,
  CheckCircle2,
  Footprints,
  Navigation,
  Bike,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import { LiveWorkoutTracker } from "@/components/activity/live-workout-tracker";
import { WorkoutHistoryList } from "@/components/activity/workout-history-list";
import { fetchWorkouts, deleteWorkout } from "@/lib/activity-client";
import { createClient } from "@/lib/supabase/client";
import type { ActivityWorkout, ActivityType } from "@/types/activity";

export default function WorkoutsPage() {
  const [workouts, setWorkouts] = React.useState<ActivityWorkout[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTrackerOpen, setIsTrackerOpen] = React.useState(false);
  const [selectedDiscipline, setSelectedDiscipline] = React.useState<ActivityType>("walking");
  const [userWeightKg, setUserWeightKg] = React.useState<number | null>(null);
  const [notification, setNotification] = React.useState<string | null>(null);

  const [refreshKey, setRefreshKey] = React.useState(0);

  // Fetch real workouts and user weight
  React.useEffect(() => {
    let isMounted = true;

    async function loadWorkoutData() {
      try {
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

        const list = await fetchWorkouts();
        if (isMounted) {
          setWorkouts(list);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadWorkoutData();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  // Aggregate real stats
  const totalWorkoutMinutes = Math.round(
    workouts.reduce((sum, w) => sum + w.duration_seconds, 0) / 60
  );
  const totalWorkoutKm = (
    workouts.reduce((sum, w) => sum + w.distance_meters, 0) / 1000
  ).toFixed(1);

  // Strict Requirement #3: Exclude workouts where calorie estimation is unavailable
  const totalCaloriesBurned = workouts.reduce(
    (sum, w) => (w.estimated_calories !== null ? sum + w.estimated_calories : sum),
    0
  );
  const workoutsWithCaloriesCount = workouts.filter((w) => w.estimated_calories !== null).length;

  const handleStartWorkout = (type: ActivityType) => {
    setSelectedDiscipline(type);
    setIsTrackerOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleWorkoutCompleted = (newWorkout: ActivityWorkout) => {
    setWorkouts((prev) => [newWorkout, ...prev]);
    setRefreshKey((k) => k + 1);
    setIsTrackerOpen(false);
    setNotification(
      `Workout saved successfully! Recorded ${(newWorkout.distance_meters / 1000).toFixed(2)} km in ${Math.round(newWorkout.duration_seconds / 60)} minutes.`
    );
    setTimeout(() => setNotification(null), 6000);
  };

  const handleDeleteWorkout = async (id: string): Promise<boolean> => {
    const ok = await deleteWorkout(id);
    if (ok) {
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      setNotification("Workout deleted successfully.");
      setTimeout(() => setNotification(null), 4000);
      return true;
    }
    return false;
  };

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <Sparkles size={12} className="text-[#375A41]" />
            <span>Real-Time Fitness Tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Workout Studio
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            GPS route tracking, active interval timing, and personalized workout analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isTrackerOpen && (
            <Button
              onClick={() => handleStartWorkout("walking")}
              size="sm"
              variant="primary"
              icon={<Play size={15} />}
              iconPosition="left"
            >
              Start New Workout
            </Button>
          )}
        </div>
      </div>

      {notification && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#375A41]" />
          <span>{notification}</span>
        </div>
      )}

      {/* ACTIVE WORKOUT TRACKER SECTION */}
      {isTrackerOpen && (
        <div className="space-y-3">
          <LiveWorkoutTracker
            userWeightKg={userWeightKg}
            defaultType={selectedDiscipline}
            onWorkoutCompleted={handleWorkoutCompleted}
            onCancel={() => setIsTrackerOpen(false)}
          />
        </div>
      )}

      {/* REAL SUMMARY BANNER */}
      <Card variant="cream" className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Total Training Time
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-[#1C1F1D] mt-1">
              {totalWorkoutMinutes} <span className="text-sm font-normal text-[#575E59]">mins</span>
            </p>
            <p className="text-[11px] text-[#717A73]">
              {workouts.length} recorded session{workouts.length === 1 ? "" : "s"}
            </p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Accumulated Distance
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-[#437151] mt-1">
              {totalWorkoutKm} <span className="text-sm font-normal text-[#575E59]">km</span>
            </p>
            <p className="text-[11px] text-[#717A73]">Walking, running & cycling</p>
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">
              Estimated Energy Burn
            </span>
            <p className="text-2xl sm:text-3xl font-bold text-[#6B7546] mt-1">
              {totalCaloriesBurned} <span className="text-sm font-normal text-[#575E59]">kcal</span>
            </p>
            <p className="text-[11px] text-[#717A73]">
              {userWeightKg
                ? `From ${workoutsWithCaloriesCount} session${workoutsWithCaloriesCount === 1 ? "" : "s"} (${userWeightKg}kg profile)`
                : "Profile weight required for calorie totals"}
            </p>
          </div>
        </div>
      </Card>

      {/* 3 QUICK LAUNCH CARDS */}
      {!isTrackerOpen && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-[#1C1F1D]">Start a Workout</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Walking */}
            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
                    <Footprints size={20} />
                  </div>
                  <Badge variant="sage" size="sm">Aerobic Zone</Badge>
                </div>
                <h3 className="text-base font-bold text-[#1C1F1D]">Walking Session</h3>
                <p className="text-xs text-[#575E59] leading-relaxed">
                  Low-impact aerobic base building, active recovery, and coastal promenade walks.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStartWorkout("walking")}
                icon={<Play size={14} />}
                iconPosition="left"
              >
                Track Walk
              </Button>
            </Card>

            {/* Running */}
            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-[#437151]">
                    <Navigation size={20} />
                  </div>
                  <Badge variant="sage" size="sm">Cardio & Tempo</Badge>
                </div>
                <h3 className="text-base font-bold text-[#1C1F1D]">Running Session</h3>
                <p className="text-xs text-[#575E59] leading-relaxed">
                  High-intensity cardiovascular endurance, pace tracking, and interval pacing.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStartWorkout("running")}
                icon={<Play size={14} />}
                iconPosition="left"
              >
                Track Run
              </Button>
            </Card>

            {/* Cycling */}
            <Card variant="default" className="p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-xl bg-[#EDF0DF] text-[#43492D]">
                    <Bike size={20} />
                  </div>
                  <Badge variant="sage" size="sm">Endurance & Speed</Badge>
                </div>
                <h3 className="text-base font-bold text-[#1C1F1D]">Cycling Session</h3>
                <p className="text-xs text-[#575E59] leading-relaxed">
                  Road, trail, and outdoor cycling with speed tracking in km/h.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleStartWorkout("cycling")}
                icon={<Play size={14} />}
                iconPosition="left"
              >
                Track Ride
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* WORKOUT HISTORY LIST */}
      <div className="pt-2">
        <WorkoutHistoryList
          workouts={workouts}
          onDeleteWorkout={handleDeleteWorkout}
          isLoading={isLoading}
        />
      </div>
    </PageContainer>
  );
}
