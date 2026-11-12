"use client";

import * as React from "react";
import {
  Scale,
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
  Edit2,
  Trash2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDisplayDate } from "@/lib/nutrition-client";
import type { WeightChangeResult, WeightLog } from "@/types/health-tracking";

interface WeightTrackerCardProps {
  weights: WeightLog[];
  weightChange: WeightChangeResult | null;
  onAddClick: () => void;
  onEditClick: (entry: WeightLog) => void;
  onDeleteClick: (entry: WeightLog) => void;
}

export function WeightTrackerCard({
  weights,
  weightChange,
  onAddClick,
  onEditClick,
  onDeleteClick,
}: WeightTrackerCardProps) {
  const latestWeight = weights.length > 0 ? weights[0] : null;

  return (
    <Card variant="default" className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
            <Scale size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D]">Weight Tracker</h2>
            <p className="text-xs text-[#575E59]">Daily morning weigh-ins & trajectory</p>
          </div>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onAddClick}
          className="flex items-center gap-1.5 text-xs w-full sm:w-auto justify-center"
        >
          <Plus size={14} />
          Log Weigh-In
        </Button>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Latest Weight */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
              Current Recorded Weight
            </span>
            <p className="text-3xl font-extrabold text-[#1C1F1D] pt-0.5">
              {latestWeight ? `${latestWeight.weight_kg} kg` : "—"}
            </p>
            <p className="text-[11px] text-[#575E59] pt-1">
              {latestWeight ? `Logged on ${formatDisplayDate(latestWeight.logged_date)}` : "No weigh-ins recorded yet"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#EFEBE1] text-[#437151]">
            <Scale size={24} />
          </div>
        </div>

        {/* Recent Change */}
        <div className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#717A73]">
              Recent Weigh-In Delta
            </span>
            <div className="flex items-baseline gap-2 pt-0.5">
              <p
                className={`text-3xl font-extrabold ${
                  weightChange?.direction === "loss"
                    ? "text-[#437151]"
                    : weightChange?.direction === "gain"
                    ? "text-[#B88746]"
                    : "text-[#1C1F1D]"
                }`}
              >
                {weightChange
                  ? `${weightChange.differenceKg > 0 ? "+" : ""}${weightChange.differenceKg} kg`
                  : "—"}
              </p>
              {weightChange && (
                <Badge
                  variant={
                    weightChange.direction === "loss"
                      ? "sage"
                      : weightChange.direction === "gain"
                      ? "olive"
                      : "neutral"
                  }
                  size="sm"
                >
                  {weightChange.direction === "loss" ? "Decrease" : weightChange.direction === "gain" ? "Increase" : "Stable"}
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-[#575E59] pt-1">
              {weights.length > 1
                ? `Compared with previous weigh-in (${weights[1].weight_kg} kg)`
                : "Record 2 or more weigh-ins to compare deltas"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-[#EFEBE1] text-[#375A41]">
            {weightChange?.direction === "loss" ? (
              <ArrowDownRight size={24} className="text-[#437151]" />
            ) : weightChange?.direction === "gain" ? (
              <ArrowUpRight size={24} className="text-[#B88746]" />
            ) : (
              <Minus size={24} className="text-[#717A73]" />
            )}
          </div>
        </div>
      </div>

      {/* History List Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#717A73]">
          Weigh-In History ({weights.length})
        </h3>

        {weights.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E8E5DD] bg-[#FAF8F5] p-6 text-center space-y-2">
            <p className="text-xs text-[#575E59]">No weight entries found.</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddClick}
              className="text-xs"
            >
              Add First Entry
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#E8E5DD]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-[#575E59] border-b border-[#E8E5DD] font-medium">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5DD] bg-white">
                {weights.map((entry) => (
                  <tr key={entry.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-[#1C1F1D]">
                      {entry.logged_date}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#437151]">
                      {entry.weight_kg} kg
                    </td>
                    <td className="py-2.5 px-3 text-[#575E59] hidden sm:table-cell max-w-xs truncate">
                      {entry.notes || "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditClick(entry)}
                          aria-label={`Edit weigh-in for ${entry.logged_date}`}
                          className="h-7 w-7 p-0 text-[#575E59] hover:text-[#1C1F1D]"
                        >
                          <Edit2 size={13} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteClick(entry)}
                          aria-label={`Delete weigh-in for ${entry.logged_date}`}
                          className="h-7 w-7 p-0 text-[#B91C1C] hover:text-[#7F1D1D] hover:bg-[#FEE2E2]"
                        >
                          <Trash2 size={13} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
