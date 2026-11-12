"use client";

import * as React from "react";
import { TrendingDown, TrendingUp, Minus, LineChart as ChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getHealthyWeightRange } from "@/lib/health-calculator";
import type { WeightLog } from "@/types/health-tracking";

interface WeightTrendChartProps {
  weights: WeightLog[];
  heightCm?: number | null;
}

export function WeightTrendChart({ weights, heightCm }: WeightTrendChartProps) {
  // Sort chronologically ascending (oldest to newest) for chart timeline
  const chronologicalWeights = React.useMemo(() => {
    return [...weights].sort(
      (a, b) => new Date(a.logged_date).getTime() - new Date(b.logged_date).getTime()
    );
  }, [weights]);

  const healthyRange = React.useMemo(() => {
    if (!heightCm || heightCm <= 0) return null;
    return getHealthyWeightRange(heightCm);
  }, [heightCm]);

  if (chronologicalWeights.length === 0) {
    return (
      <Card variant="default" className="p-6 text-center space-y-3">
        <div className="inline-flex p-3 rounded-full bg-[#EFEBE1] text-[#717A73]">
          <ChartIcon size={24} />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-[#1C1F1D]">No Weight History Recorded</h3>
          <p className="text-xs text-[#575E59] max-w-sm mx-auto">
            Your weight trend chart will render automatically once you record weigh-ins across multiple days.
          </p>
        </div>
      </Card>
    );
  }

  // Calculate dynamic Y-axis min and max
  const minWeight = Math.min(...chronologicalWeights.map((w) => w.weight_kg));
  const maxWeight = Math.max(...chronologicalWeights.map((w) => w.weight_kg));
  const rangeMargin = Math.max(1, (maxWeight - minWeight) * 0.2);
  const yMin = Math.floor(Math.max(0, minWeight - rangeMargin));
  const yMax = Math.ceil(maxWeight + rangeMargin);
  const yRange = yMax - yMin || 1;

  // Compute overall trajectory
  const first = chronologicalWeights[0].weight_kg;
  const last = chronologicalWeights[chronologicalWeights.length - 1].weight_kg;
  const netDiff = Math.round((last - first) * 10) / 10;

  return (
    <Card variant="default" className="p-5 sm:p-6 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E8E5DD]">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
            <ChartIcon size={18} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D]">Weight Trajectory & History</h2>
            <p className="text-xs text-[#575E59]">
              {chronologicalWeights.length} recorded {chronologicalWeights.length === 1 ? "entry" : "entries"} over time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {healthyRange && (
            <span className="text-[11px] text-[#717A73]">
              Healthy span: {healthyRange.min}–{healthyRange.max} kg
            </span>
          )}
          {chronologicalWeights.length > 1 && (
            <Badge
              variant={netDiff < 0 ? "sage" : netDiff > 0 ? "olive" : "neutral"}
              size="sm"
            >
              {netDiff < 0 ? (
                <span className="flex items-center gap-1">
                  <TrendingDown size={13} /> {netDiff} kg
                </span>
              ) : netDiff > 0 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp size={13} /> +{netDiff} kg
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Minus size={13} /> 0.0 kg
                </span>
              )}
            </Badge>
          )}
        </div>
      </div>

      {/* Visual Chart Area */}
      <div className="pt-4 pb-2">
        <div className="h-52 w-full flex items-end justify-between gap-2 sm:gap-4 px-2 relative">
          {/* Reference Line for Healthy Max Weight if in range */}
          {healthyRange && healthyRange.max >= yMin && healthyRange.max <= yMax && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-[#6B7546] opacity-50 z-0 pointer-events-none"
              style={{ bottom: `${((healthyRange.max - yMin) / yRange) * 100}%` }}
              title={`Healthy Max: ${healthyRange.max} kg`}
            />
          )}

          {/* Reference Line for Healthy Min Weight if in range */}
          {healthyRange && healthyRange.min >= yMin && healthyRange.min <= yMax && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-[#6B7546] opacity-50 z-0 pointer-events-none"
              style={{ bottom: `${((healthyRange.min - yMin) / yRange) * 100}%` }}
              title={`Healthy Min: ${healthyRange.min} kg`}
            />
          )}

          {chronologicalWeights.map((w, idx) => {
            const heightPercent = Math.min(
              100,
              Math.max(10, Math.round(((w.weight_kg - yMin) / yRange) * 100))
            );
            const isLatest = idx === chronologicalWeights.length - 1;

            return (
              <div
                key={w.id || idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative z-10"
              >
                {/* Tooltip on Hover */}
                <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1C1F1D] text-white text-[10px] font-semibold py-0.5 px-2 rounded-md pointer-events-none whitespace-nowrap shadow-md">
                  {w.weight_kg} kg • {w.logged_date}
                </div>

                <span className={`text-[11px] font-bold ${isLatest ? "text-[#437151]" : "text-[#1C1F1D]"}`}>
                  {w.weight_kg}
                </span>

                <div className="w-full rounded-t-xl bg-[#EFEBE1] h-36 flex items-end overflow-hidden p-1">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      isLatest ? "bg-[#437151]" : "bg-[#717A73]/70 group-hover:bg-[#437151]"
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                <span className="text-[10px] text-[#575E59] font-medium pt-1 truncate max-w-[50px] text-center">
                  {w.logged_date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend & Summary Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-[#575E59] pt-2 border-t border-[#E8E5DD]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#437151]" /> Latest Weigh-In
          </span>
          {healthyRange && (
            <span className="flex items-center gap-1.5 text-[11px] text-[#717A73]">
              <span className="h-0.5 w-3 border-t border-dashed border-[#6B7546]" /> Target Healthy Span
            </span>
          )}
        </div>
        <span className="text-[11px] text-[#717A73]">
          Min: {minWeight} kg • Max: {maxWeight} kg
        </span>
      </div>
    </Card>
  );
}
