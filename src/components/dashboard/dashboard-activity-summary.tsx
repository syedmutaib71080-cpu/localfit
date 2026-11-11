"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Footprints,
  ArrowRight,
  Plus,
  Bike,
  Navigation,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ActivityWorkout, DailyStepEntry, DailyActivitySummary } from "@/types/activity";
import { formatActiveDuration } from "@/lib/dashboard-calculator";

interface DashboardActivitySummaryProps {
  workouts: ActivityWorkout[];
  stepsList: DailyStepEntry[];
  summary: DailyActivitySummary;
  selectedDate: string;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  walking: <Navigation size={14} className="text-[#437151]" />,
  running: <Activity size={14} className="text-[#375A41]" />,
  cycling: <Bike size={14} className="text-[#6B7546]" />,
};

export function DashboardActivitySummary({
  workouts,
  stepsList,
  summary,
  selectedDate,
}: DashboardActivitySummaryProps) {
  // Filter workouts that occurred on selectedDate
  const dayWorkouts = React.useMemo(() => {
    return workouts
      .filter((w) => w.start_time.split("T")[0] === selectedDate)
      .sort((a, b) => b.start_time.localeCompare(a.start_time));
  }, [workouts, selectedDate]);

  // Filter step entries for selectedDate
  const daySteps = React.useMemo(() => {
    return stepsList.filter((s) => s.step_date === selectedDate);
  }, [stepsList, selectedDate]);

  return (
    <Card variant="default" className="p-6 space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-[#437151]" />
            <h2 className="text-base font-semibold text-[#1C1F1D]">Activity & Workouts</h2>
          </div>
          <p className="text-xs text-[#575E59]">
            {dayWorkouts.length} {dayWorkouts.length === 1 ? "workout" : "workouts"} •{" "}
            {summary.total_steps.toLocaleString()} steps on {selectedDate}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            href="/app/workouts"
            size="sm"
            variant="outline"
            className="text-xs h-8"
            icon={<Plus size={13} />}
            iconPosition="left"
          >
            Start Workout
          </Button>
          <Button
            href="/app/activity"
            size="sm"
            variant="primary"
            className="text-xs h-8"
            icon={<Footprints size={13} />}
            iconPosition="left"
          >
            View Activity
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-center">
          <p className="text-[11px] font-medium text-[#717A73] uppercase tracking-wider">
            Active Time
          </p>
          <p className="text-lg font-bold text-[#1C1F1D] mt-1">
            {formatActiveDuration(summary.total_workout_duration_seconds)}
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-center">
          <p className="text-[11px] font-medium text-[#717A73] uppercase tracking-wider">
            Total Steps
          </p>
          <p className="text-lg font-bold text-[#1C1F1D] mt-1">
            {summary.total_steps > 0 ? summary.total_steps.toLocaleString() : "0"}
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-center">
          <p className="text-[11px] font-medium text-[#717A73] uppercase tracking-wider">
            Distance
          </p>
          <p className="text-lg font-bold text-[#1C1F1D] mt-1">
            {Math.round(
              (summary.walking_distance_km +
                summary.running_distance_km +
                summary.cycling_distance_km) *
                10
            ) / 10}{" "}
            <span className="text-xs font-normal text-[#717A73]">km</span>
          </p>
        </div>

        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 text-center">
          <p className="text-[11px] font-medium text-[#717A73] uppercase tracking-wider">
            Calories Burned
          </p>
          <p className="text-lg font-bold text-[#1C1F1D] mt-1">
            {Math.round(summary.total_estimated_calories)}{" "}
            <span className="text-xs font-normal text-[#717A73]">kcal</span>
          </p>
        </div>
      </div>

      {/* Workouts List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">
            Workouts for {selectedDate}
          </h3>
          <Link
            href="/app/activity"
            className="text-xs font-semibold text-[#437151] hover:underline flex items-center gap-1"
          >
            <span>Full Workout Log</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {dayWorkouts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8E5DD] p-6 text-center text-xs text-[#717A73] space-y-2">
            <p>No workouts recorded for this date.</p>
            <Button href="/app/workouts" variant="outline" size="sm" className="text-xs">
              Start Workout Session
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DD] border border-[#E8E5DD] rounded-xl overflow-hidden bg-white">
            {dayWorkouts.map((w) => {
              const distanceKm = Math.round((w.distance_meters / 1000) * 10) / 10;
              const startTimeStr = new Date(w.start_time).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              });

              return (
                <div
                  key={w.id}
                  className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-[#FAF8F5] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-[#FAF8F5] border border-[#E8E5DD]">
                        {ACTIVITY_ICONS[w.activity_type] || <Activity size={14} />}
                      </span>
                      <span className="text-xs font-semibold text-[#1C1F1D] capitalize">
                        {w.activity_type}
                      </span>
                      <span className="text-[11px] text-[#717A73]">• {startTimeStr}</span>
                    </div>

                    <p className="text-[11px] text-[#717A73] mt-1">
                      Duration: {formatActiveDuration(w.duration_seconds)}
                      {w.distance_meters > 0 && ` • Distance: ${distanceKm} km`}
                      {w.step_count !== null && w.step_count > 0 && ` • Steps: ${w.step_count}`}
                      {w.notes && ` • "${w.notes}"`}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    {w.estimated_calories !== null ? (
                      <div>
                        <span className="text-sm font-bold text-[#1C1F1D]">
                          {Math.round(w.estimated_calories)}
                        </span>
                        <span className="text-[10px] text-[#717A73] block">kcal</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-[#717A73] italic">
                        Missing weight
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Steps Details */}
      {daySteps.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E8E5DD]">
          <h3 className="text-xs font-semibold text-[#717A73] uppercase tracking-wider">
            Step Entries Breakdown ({daySteps.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {daySteps.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg bg-[#FAF8F5] border border-[#E8E5DD] p-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-semibold text-[#1C1F1D]">
                    {entry.steps.toLocaleString()} steps
                  </span>
                  <span className="text-[10px] text-[#717A73] ml-2 capitalize">
                    via {entry.source.replace("_", " ")}
                  </span>
                  {entry.notes && (
                    <p className="text-[10px] text-[#717A73] mt-0.5 truncate max-w-xs">
                      {entry.notes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
