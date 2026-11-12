"use client";

import * as React from "react";
import {
  Moon,
  Plus,
  Edit2,
  Trash2,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatSleepDuration } from "@/lib/health-calculator";
import type { SleepLog, SleepQuality, SleepSummary } from "@/types/health-tracking";

interface SleepTrackerCardProps {
  summary: SleepSummary | null;
  logs: SleepLog[];
  dailySleepGoalMinutes: number | null;
  selectedDate: string;
  onAddClick: () => void;
  onEditClick: (entry: SleepLog) => void;
  onDeleteClick: (entry: SleepLog) => void;
  onOpenGoalsModal: () => void;
}

export function SleepTrackerCard({
  summary,
  logs,
  dailySleepGoalMinutes,
  selectedDate,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onOpenGoalsModal,
}: SleepTrackerCardProps) {
  const durationMinutes = summary?.durationMinutes || 0;
  const goalMinutes = dailySleepGoalMinutes || summary?.goalMinutes || null;
  const progressPercent =
    goalMinutes && goalMinutes > 0
      ? Math.min(100, Math.round((durationMinutes / goalMinutes) * 100))
      : null;

  const getQualityBadgeVariant = (q: SleepQuality | null): "sage" | "olive" | "neutral" => {
    switch (q) {
      case "excellent":
      case "good":
        return "sage";
      case "fair":
        return "olive";
      case "poor":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <Card variant="default" className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#EDE9FE] text-[#6D28D9]">
            <Moon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D]">Sleep & Recovery Tracker</h2>
            <p className="text-xs text-[#575E59]">Nightly rest duration and restorative sleep quality</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOpenGoalsModal}
            className="text-xs flex items-center gap-1.5"
          >
            <Target size={13} className="text-[#6D28D9]" />
            {goalMinutes ? `${Math.round(goalMinutes / 60)}h Goal` : "Set Goal"}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onAddClick}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            Log Sleep
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Sleep */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Recorded Duration
          </span>
          <p className="text-3xl font-extrabold text-[#6D28D9] pt-0.5">
            {formatSleepDuration(durationMinutes)}
          </p>
          <p className="text-[11px] text-[#575E59] pt-1">
            {durationMinutes > 0 ? `${durationMinutes} total minutes` : "No sleep logged for this date"}
          </p>
        </div>

        {/* Quality Rating */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Sleep Quality
          </span>
          <div className="pt-1 flex items-center gap-2">
            <p className="text-xl font-bold text-[#1C1F1D] capitalize">
              {summary?.quality || "Unrated"}
            </p>
            {summary?.quality && (
              <Badge variant={getQualityBadgeVariant(summary.quality)} size="sm">
                {summary.quality}
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-[#575E59] pt-1">
            Restorative neuro-muscular recovery
          </p>
        </div>

        {/* Goal Progress */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Goal Compliance
          </span>
          <p className="text-3xl font-extrabold text-[#1C1F1D] pt-0.5">
            {progressPercent !== null ? `${progressPercent}%` : "Not set"}
          </p>
          <p className="text-[11px] text-[#575E59] pt-1">
            {goalMinutes ? `Target: ${formatSleepDuration(goalMinutes)}` : "Configure in Health Goals"}
          </p>
        </div>
      </div>

      {/* Goal Progress Bar */}
      {goalMinutes && goalMinutes > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#575E59]">
            <span className="font-semibold text-[#1C1F1D]">{progressPercent}% of sleep goal</span>
            <span>{formatSleepDuration(durationMinutes)} / {formatSleepDuration(goalMinutes)}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#7C3AED] transition-all duration-300"
              style={{ width: `${Math.min(100, progressPercent || 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Sleep Logs List */}
      <div className="space-y-2 pt-2 border-t border-[#E8E5DD]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">
          Sleep Entries for {selectedDate} ({logs.length})
        </h3>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8E5DD] bg-[#FAF8F5] p-5 text-center space-y-2">
            <p className="text-xs text-[#575E59]">No sleep recorded for this date.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddClick}
              className="text-xs"
            >
              Log Nightly Rest
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DD] rounded-xl border border-[#E8E5DD] bg-white overflow-hidden">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="p-3 flex items-center justify-between hover:bg-[#FAF8F5]/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#EDE9FE] text-[#6D28D9]">
                    <Moon size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#1C1F1D]">
                        {formatSleepDuration(entry.duration_minutes)}
                      </span>
                      {entry.sleep_quality && (
                        <Badge variant={getQualityBadgeVariant(entry.sleep_quality)} size="sm">
                          {entry.sleep_quality}
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-[#575E59] flex items-center gap-2 pt-0.5">
                      <span>{entry.sleep_date}</span>
                      {entry.bedtime && entry.wake_time && (
                        <span>
                          • {new Date(entry.bedtime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} –{" "}
                          {new Date(entry.wake_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {entry.notes && <span>• {entry.notes}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditClick(entry)}
                    aria-label={`Edit sleep entry for ${entry.sleep_date}`}
                    className="h-7 w-7 p-0 text-[#575E59] hover:text-[#1C1F1D]"
                  >
                    <Edit2 size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(entry)}
                    aria-label={`Delete sleep entry for ${entry.sleep_date}`}
                    className="h-7 w-7 p-0 text-[#B91C1C] hover:text-[#7F1D1D] hover:bg-[#FEE2E2]"
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
