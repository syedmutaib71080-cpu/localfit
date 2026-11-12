"use client";

import * as React from "react";
import { X, Target, Droplets, Moon, Flame, Dumbbell, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpdateHealthGoalsInput } from "@/types/health-tracking";

interface HealthGoalsModalProps {
  isOpen: boolean;
  initialWaterGoalMl: number | null;
  initialSleepGoalMinutes: number | null;
  calorieGoal: number | null;
  proteinGoalG: number | null;
  onClose: () => void;
  onSubmit: (input: UpdateHealthGoalsInput) => Promise<void>;
}

function HealthGoalsDialog({
  initialWaterGoalMl,
  initialSleepGoalMinutes,
  calorieGoal,
  proteinGoalG,
  onClose,
  onSubmit,
}: {
  initialWaterGoalMl: number | null;
  initialSleepGoalMinutes: number | null;
  calorieGoal: number | null;
  proteinGoalG: number | null;
  onClose: () => void;
  onSubmit: (input: UpdateHealthGoalsInput) => Promise<void>;
}) {
  const [waterGoal, setWaterGoal] = React.useState<string>(() =>
    initialWaterGoalMl ? initialWaterGoalMl.toString() : ""
  );
  const [sleepHours, setSleepHours] = React.useState<string>(() =>
    initialSleepGoalMinutes
      ? (Math.round((initialSleepGoalMinutes / 60) * 10) / 10).toString()
      : ""
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const payload: UpdateHealthGoalsInput = {};

    // Water Goal: 500 - 10000 ml or null
    if (waterGoal.trim() === "") {
      payload.daily_water_goal_ml = null;
    } else {
      const parsedWater = parseInt(waterGoal, 10);
      if (!Number.isFinite(parsedWater) || parsedWater < 500 || parsedWater > 10000) {
        setErrorMessage("Daily water goal must be between 500 and 10,000 ml.");
        return;
      }
      payload.daily_water_goal_ml = parsedWater;
    }

    // Sleep Goal: 180 - 1000 min or null (input in hours)
    if (sleepHours.trim() === "") {
      payload.daily_sleep_goal_minutes = null;
    } else {
      const parsedHours = parseFloat(sleepHours);
      if (!Number.isFinite(parsedHours) || parsedHours < 3.0 || parsedHours > 16.6) {
        setErrorMessage("Daily sleep goal must be between 3.0 and 16.6 hours (180 to 1,000 minutes).");
        return;
      }
      payload.daily_sleep_goal_minutes = Math.round(parsedHours * 60);
    }

    // Backend PATCH /api/health/goals requires at least one field to be defined
    if (payload.daily_water_goal_ml === undefined && payload.daily_sleep_goal_minutes === undefined) {
      setErrorMessage("Please specify at least one health goal to update.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(payload);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update health goals";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goals-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Target size={18} />
            </div>
            <div>
              <h2 id="goals-modal-title" className="text-base font-semibold text-[#1C1F1D]">
                Configure Health Goals
              </h2>
              <p className="text-xs text-[#575E59]">
                Adjust daily hydration and rest targets
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-[#717A73] hover:text-[#1C1F1D] hover:bg-[#FAF8F5] transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-[#FCA5A5] bg-[#FEE2E2] p-3 text-xs font-semibold text-[#B91C1C]">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Daily Water Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
              <Droplets size={14} className="text-[#0369A1]" />
              Daily Water Goal (ml)
            </label>
            <input
              type="number"
              step="50"
              min="500"
              max="10000"
              placeholder="e.g. 2500 (leave blank to clear)"
              value={waterGoal}
              onChange={(e) => setWaterGoal(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
            <p className="text-[11px] text-[#717A73]">Standard recommendation is ~2,000–3,000 ml/day.</p>
          </div>

          {/* Daily Sleep Goal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#1C1F1D] flex items-center gap-1.5">
              <Moon size={14} className="text-[#6D28D9]" />
              Daily Sleep Target (hours)
            </label>
            <input
              type="number"
              step="0.5"
              min="3"
              max="16"
              placeholder="e.g. 8.0 (leave blank to clear)"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              disabled={isSubmitting}
              className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2 text-sm text-[#1C1F1D] focus:outline-none focus:ring-1 focus:ring-[#437151]"
            />
            <p className="text-[11px] text-[#717A73]">Optimal adult rest spans 7.0–9.0 hours.</p>
          </div>

          {/* Integrated Nutrition Goals Display (Read-Only from profile) */}
          <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-3 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73] flex items-center gap-1">
              <Info size={12} /> Nutrition Targets from Profile
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-lg bg-white border border-[#E8E5DD]">
                <span className="text-[10px] text-[#575E59] flex items-center gap-1">
                  <Flame size={12} className="text-[#437151]" /> Calorie Goal
                </span>
                <p className="font-bold text-[#1C1F1D] pt-0.5">
                  {calorieGoal ? `${calorieGoal} kcal` : "Not set"}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-white border border-[#E8E5DD]">
                <span className="text-[10px] text-[#575E59] flex items-center gap-1">
                  <Dumbbell size={12} className="text-[#437151]" /> Protein Goal
                </span>
                <p className="font-bold text-[#1C1F1D] pt-0.5">
                  {proteinGoalG ? `${proteinGoalG}g` : "Not set"}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[#717A73]">
              To adjust calorie or protein targets, edit your biometric targets in the User Profile settings.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E8E5DD]">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Saving Goals...
                </span>
              ) : (
                "Save Goals"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function HealthGoalsModal({
  isOpen,
  initialWaterGoalMl,
  initialSleepGoalMinutes,
  calorieGoal,
  proteinGoalG,
  onClose,
  onSubmit,
}: HealthGoalsModalProps) {
  if (!isOpen) return null;

  return (
    <HealthGoalsDialog
      key={`goals-${initialWaterGoalMl ?? "null"}-${initialSleepGoalMinutes ?? "null"}`}
      initialWaterGoalMl={initialWaterGoalMl}
      initialSleepGoalMinutes={initialSleepGoalMinutes}
      calorieGoal={calorieGoal}
      proteinGoalG={proteinGoalG}
      onClose={onClose}
      onSubmit={onSubmit}
    />
  );
}
