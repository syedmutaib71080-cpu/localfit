"use client";

import * as React from "react";
import {
  Droplets,
  Plus,
  Edit2,
  Trash2,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { WaterIntakeSummary, WaterLog } from "@/types/health-tracking";

interface WaterTrackerCardProps {
  summary: WaterIntakeSummary | null;
  logs: WaterLog[];
  dailyWaterGoalMl: number | null;
  selectedDate: string;
  onAddClick: () => void;
  onQuickAdd: (amountMl: number) => Promise<void>;
  onEditClick: (entry: WaterLog) => void;
  onDeleteClick: (entry: WaterLog) => void;
  onOpenGoalsModal: () => void;
}

export function WaterTrackerCard({
  summary,
  logs,
  dailyWaterGoalMl,
  selectedDate,
  onAddClick,
  onQuickAdd,
  onEditClick,
  onDeleteClick,
  onOpenGoalsModal,
}: WaterTrackerCardProps) {
  const [quickAddLoading, setQuickAddLoading] = React.useState<number | null>(null);

  const totalMl = summary?.totalMl || 0;
  const goalMl = dailyWaterGoalMl || summary?.goalMl || null;
  const progressPercent = goalMl && goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : null;
  const remainingMl = goalMl && goalMl > 0 ? Math.max(0, goalMl - totalMl) : null;

  const handleQuickAdd = async (amount: number) => {
    setQuickAddLoading(amount);
    try {
      await onQuickAdd(amount);
    } finally {
      setQuickAddLoading(null);
    }
  };

  return (
    <Card variant="default" className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#E0F2FE] text-[#0369A1]">
            <Droplets size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D]">Daily Hydration Tracker</h2>
            <p className="text-xs text-[#575E59]">Water intake & fluid replenishment</p>
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
            <Target size={13} className="text-[#0369A1]" />
            {goalMl ? `${goalMl} ml Goal` : "Set Goal"}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onAddClick}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            Log Water
          </Button>
        </div>
      </div>

      {/* Progress & Big Numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Consumed */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Today&apos;s Total
          </span>
          <p className="text-3xl font-extrabold text-[#0369A1] pt-0.5">{totalMl} ml</p>
          <p className="text-[11px] text-[#575E59] pt-1">
            {(totalMl / 1000).toFixed(2)} liters consumed
          </p>
        </div>

        {/* Goal Progress */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Daily Target
          </span>
          <p className="text-3xl font-extrabold text-[#1C1F1D] pt-0.5">
            {goalMl ? `${goalMl} ml` : "Not set"}
          </p>
          <p className="text-[11px] text-[#575E59] pt-1">
            {progressPercent !== null ? `${progressPercent}% completed` : "Configure in Health Goals"}
          </p>
        </div>

        {/* Remaining to Goal */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
            Remaining
          </span>
          <p className="text-3xl font-extrabold text-[#1C1F1D] pt-0.5">
            {remainingMl !== null ? `${remainingMl} ml` : "—"}
          </p>
          <p className="text-[11px] text-[#437151] font-medium pt-1">
            {remainingMl === 0 ? "Daily hydration goal achieved!" : "Optimal fluid balance"}
          </p>
        </div>
      </div>

      {/* Visual Progress Bar */}
      {goalMl && goalMl > 0 && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-[#575E59]">
            <span className="font-semibold text-[#1C1F1D]">{progressPercent}% of daily goal</span>
            <span>{totalMl} / {goalMl} ml</span>
          </div>
          <div className="h-3 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0284C7] transition-all duration-300"
              style={{ width: `${Math.min(100, progressPercent || 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Quick Add Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-semibold text-[#1C1F1D] mr-1">Quick Add:</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleQuickAdd(250)}
          disabled={quickAddLoading !== null}
          className="text-xs border-[#E0F2FE] hover:bg-[#E0F2FE] text-[#0369A1]"
        >
          {quickAddLoading === 250 ? "Adding..." : "+250 ml (Glass)"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleQuickAdd(500)}
          disabled={quickAddLoading !== null}
          className="text-xs border-[#E0F2FE] hover:bg-[#E0F2FE] text-[#0369A1]"
        >
          {quickAddLoading === 500 ? "Adding..." : "+500 ml (Bottle)"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleQuickAdd(750)}
          disabled={quickAddLoading !== null}
          className="text-xs border-[#E0F2FE] hover:bg-[#E0F2FE] text-[#0369A1]"
        >
          {quickAddLoading === 750 ? "Adding..." : "+750 ml (Flask)"}
        </Button>
      </div>

      {/* Today's Water Logs List */}
      <div className="space-y-2 pt-2 border-t border-[#E8E5DD]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">
          Hydration Entries for {selectedDate} ({logs.length})
        </h3>

        {logs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8E5DD] bg-[#FAF8F5] p-5 text-center space-y-2">
            <p className="text-xs text-[#575E59]">No water logged for this date.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddClick}
              className="text-xs"
            >
              Add First Intake
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#E8E5DD] rounded-xl border border-[#E8E5DD] bg-white overflow-hidden">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="p-3 flex items-center justify-between hover:bg-[#FAF8F5]/60 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#E0F2FE] text-[#0369A1]">
                    <Droplets size={14} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1C1F1D]">
                      {entry.amount_ml} ml
                    </span>
                    {entry.notes && (
                      <p className="text-xs text-[#575E59]">{entry.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditClick(entry)}
                    aria-label={`Edit ${entry.amount_ml}ml water entry`}
                    className="h-7 w-7 p-0 text-[#575E59] hover:text-[#1C1F1D]"
                  >
                    <Edit2 size={13} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteClick(entry)}
                    aria-label={`Delete ${entry.amount_ml}ml water entry`}
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
