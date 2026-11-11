"use client";

import * as React from "react";
import Link from "next/link";
import { Target, ArrowRight, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserProfileGoals, GoalProgressItem } from "@/lib/dashboard-calculator";
import { evaluateGoalProgress } from "@/lib/dashboard-calculator";

interface DashboardGoalsCardProps {
  userGoals: UserProfileGoals;
  consumedCalories: number;
  consumedProtein: number;
  totalSteps: number;
  activeSeconds: number;
}

export function DashboardGoalsCard({
  userGoals,
  consumedCalories,
  consumedProtein,
  totalSteps,
  activeSeconds,
}: DashboardGoalsCardProps) {
  const activeMinutes = Math.round(activeSeconds / 60);

  const goalItems: GoalProgressItem[] = React.useMemo(() => {
    return evaluateGoalProgress(userGoals, {
      consumedCalories,
      consumedProtein,
      steps: totalSteps,
      activeMinutes,
    });
  }, [userGoals, consumedCalories, consumedProtein, totalSteps, activeMinutes]);

  const configuredGoalsCount = goalItems.filter((g) => g.isConfigured).length;

  return (
    <Card variant="default" className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8E5DD]">
        <div>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-[#437151]" />
            <h2 className="text-base font-semibold text-[#1C1F1D]">Daily Health Goals</h2>
          </div>
          <p className="text-xs text-[#575E59] mt-0.5">
            Strictly derived from your profile settings • Real measurements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={configuredGoalsCount > 0 ? "sage" : "neutral"} size="sm">
            {configuredGoalsCount} of 4 Tracked
          </Badge>
          <Button
            href="/app/profile"
            variant="outline"
            size="sm"
            className="text-xs h-7 px-2.5"
            icon={<Settings size={12} />}
            iconPosition="left"
          >
            Edit Profile
          </Button>
        </div>
      </div>

      {/* Goal Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goalItems.map((goal) => {
          return (
            <div
              key={goal.id}
              className="rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] p-4 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#1C1F1D]">{goal.title}</span>
                {goal.isConfigured ? (
                  <span className="text-[11px] font-bold text-[#375A41]">
                    {goal.percent}%
                  </span>
                ) : (
                  <span className="text-[10px] text-[#717A73] bg-[#EFEBE1] rounded px-1.5 py-0.5">
                    Not in profile
                  </span>
                )}
              </div>

              {/* Progress Bar (Only when both target and measurement exist) */}
              {goal.isConfigured && goal.percent !== null ? (
                <div className="space-y-1">
                  <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#437151] transition-all duration-500"
                      style={{ width: `${goal.percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-[#575E59]">
                    <span>{goal.statusText}</span>
                    {goal.note && <span className="text-[#375A41]">{goal.note}</span>}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-[#717A73] space-y-1">
                  <p className="font-medium text-[#1C1F1D]">{goal.statusText}</p>
                  <p className="text-[11px] text-[#717A73]">
                    {goal.note || "No custom target is supported or configured for this metric."}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Informational footer note */}
      <div className="pt-2 text-xs text-[#717A73] flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[#E8E5DD]">
        <span>
          LocalFit never invents arbitrary default targets. Goal numbers reflect your verified profile.
        </span>
        <Link
          href="/app/profile"
          className="text-xs font-semibold text-[#437151] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Update goals in profile</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </Card>
  );
}
