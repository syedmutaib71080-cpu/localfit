"use client";

import * as React from "react";
import {
  Footprints,
  Navigation,
  Bike,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoutePreviewCanvas } from "./route-preview-canvas";
import { formatDuration } from "@/lib/workout-timer";
import { formatPaceOrSpeed } from "@/lib/calorie-calculator";
import type { ActivityWorkout, ActivityType } from "@/types/activity";

interface WorkoutHistoryListProps {
  workouts: ActivityWorkout[];
  onDeleteWorkout: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function WorkoutHistoryList({
  workouts,
  onDeleteWorkout,
  isLoading = false,
}: WorkoutHistoryListProps) {
  const [filterType, setFilterType] = React.useState<"all" | ActivityType>("all");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const filtered = filterType === "all"
    ? workouts
    : workouts.filter((w) => w.activity_type === filterType);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeleteWorkout(id);
      setConfirmDeleteId(null);
    } finally {
      setDeletingId(null);
    }
  };

  const getIcon = (type: ActivityType) => {
    switch (type) {
      case "walking":
        return <Footprints size={16} className="text-[#375A41]" />;
      case "running":
        return <Navigation size={16} className="text-[#437151]" />;
      case "cycling":
        return <Bike size={16} className="text-[#6B7546]" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8E5DD]">
        <div>
          <h3 className="text-base font-semibold text-[#1C1F1D]">Workout History</h3>
          <p className="text-xs text-[#575E59]">
            {filtered.length} recorded session{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD]">
          {(["all", "walking", "running", "cycling"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterType === type
                  ? "bg-[#437151] text-white shadow-xs"
                  : "text-[#575E59] hover:text-[#1C1F1D] hover:bg-[#EFEBE1]"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-8 text-center text-xs text-[#717A73]">
          Loading workout history...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <Card variant="cream" className="p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-[#1C1F1D]">No recorded workouts found</p>
          <p className="text-xs text-[#575E59] max-w-sm mx-auto">
            {filterType === "all"
              ? "You haven't recorded any workouts yet. Start a walking, running, or cycling workout to track your movement."
              : `No ${filterType} sessions recorded yet.`}
          </p>
        </Card>
      )}

      {/* Workout Items */}
      {!isLoading && (
        <div className="space-y-3">
          {filtered.map((w) => {
            const isExpanded = expandedId === w.id;
            const paceOrSpeed = formatPaceOrSpeed(w.activity_type, w.distance_meters, w.duration_seconds);
            const dateStr = new Date(w.start_time).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            const timeStr = new Date(w.start_time).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <Card key={w.id} variant="default" className="p-4 sm:p-5 space-y-3 transition-all hover:border-[#D0C9BA]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Discipline icon + Date */}
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#E2ECE4]">
                      {getIcon(w.activity_type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold capitalize text-[#1C1F1D]">
                          {w.activity_type}
                        </span>
                        <Badge variant="sage" size="sm">
                          {(w.distance_meters / 1000).toFixed(2)} km
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#717A73] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {dateStr}
                        </span>
                        <span>•</span>
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Key Metrics Preview & Toggle */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                    <div className="flex items-center gap-4">
                      {/* Duration */}
                      <div>
                        <span className="text-[10px] uppercase text-[#717A73] block">Duration</span>
                        <span className="font-bold text-[#1C1F1D] font-mono">
                          {formatDuration(w.duration_seconds)}
                        </span>
                      </div>

                      {/* Pace / Speed */}
                      <div>
                        <span className="text-[10px] uppercase text-[#717A73] block">
                          {w.activity_type === "cycling" ? "Speed" : "Pace"}
                        </span>
                        <span className="font-bold text-[#1C1F1D]">
                          {paceOrSpeed.value} {paceOrSpeed.unit}
                        </span>
                      </div>

                      {/* Calories */}
                      <div>
                        <span className="text-[10px] uppercase text-[#717A73] block">Est. Cal</span>
                        {w.estimated_calories !== null ? (
                          <span className="font-bold text-[#C25E34]">
                            {w.estimated_calories} kcal
                          </span>
                        ) : (
                          <span className="text-[#717A73] italic">—</span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : w.id)}
                      className="p-1.5 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5]"
                      title={isExpanded ? "Collapse" : "Expand details"}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Drawer */}
                {isExpanded && (
                  <div className="pt-3 border-t border-[#E8E5DD] space-y-3">
                    {w.notes && (
                      <p className="text-xs text-[#575E59] italic bg-[#FAF8F5] p-2.5 rounded-xl border border-[#E8E5DD]">
                        &ldquo;{w.notes}&rdquo;
                      </p>
                    )}

                    {/* Route Preview Canvas */}
                    {w.route_data && w.route_data.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-[#575E59]">
                          Recorded Route Path ({w.route_data.length} checkpoints)
                        </span>
                        <RoutePreviewCanvas routeData={w.route_data} height={180} />
                      </div>
                    )}

                    {/* Calorie Note if unavailable */}
                    {w.estimated_calories === null && (
                      <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-[11px] text-[#717A73]">
                        Note: Calorie calculation was unavailable because body weight was not configured in your profile when this workout was recorded.
                      </div>
                    )}

                    {/* Delete Action Bar */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] text-[#717A73] font-mono">
                        Session ID: {w.session_token.slice(0, 8)}...
                      </span>

                      {confirmDeleteId === w.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            disabled={deletingId === w.id}
                            onClick={() => handleDelete(w.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            {deletingId === w.id ? "Deleting..." : "Confirm Delete"}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-3 py-1.5 text-xs rounded-lg border border-[#E8E5DD] text-[#575E59]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(w.id)}
                          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                          <span>Delete Workout</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
