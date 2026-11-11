"use client";

import * as React from "react";
import {
  Scale,
  Sparkles,
  Target,
  CheckCircle2,
  Award,
  ArrowDownRight,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/ui/page-container";
import {
  demoUserProfile,
  demoWeightHistory,
  DEMO_DATA_TAG,
} from "@/lib/demo-data";

export default function ProgressPage() {
  const [timeframe, setTimeframe] = React.useState<"7d" | "30d" | "90d">("7d");
  const [logWeightInput, setLogWeightInput] = React.useState("");
  const [weightLoggedSuccess, setWeightLoggedSuccess] = React.useState<string | null>(null);

  const startWeight = 75.8;
  const currentWeight = demoUserProfile.weightKg;
  const goalWeight = demoUserProfile.goalWeightKg;
  const totalLost = (startWeight - currentWeight).toFixed(1);
  const remainingToGoal = (currentWeight - goalWeight).toFixed(1);

  // BMI = weight(kg) / (height(m))^2
  const heightMeters = demoUserProfile.heightCm / 100;
  const currentBmi = (currentWeight / (heightMeters * heightMeters)).toFixed(1);

  const handleLogWeight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logWeightInput) return;
    setWeightLoggedSuccess(`Recorded ${logWeightInput} kg for today!`);
    setLogWeightInput("");
    setTimeout(() => setWeightLoggedSuccess(null), 3000);
  };

  return (
    <PageContainer size="wide" className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E5DD]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#C7DBD0] bg-[#E2ECE4] px-2.5 py-0.5 text-[11px] font-semibold text-[#263B2C] mb-2">
            <Sparkles size={12} className="text-[#375A41]" />
            <span>{DEMO_DATA_TAG}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1C1F1D]">
            Progress & Body Composition
          </h1>
          <p className="text-xs sm:text-sm text-[#575E59] mt-0.5">
            Long-term trajectories, habit consistency, and milestone achievements.
          </p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div className="flex items-center rounded-xl border border-[#E8E5DD] bg-white p-1 shadow-sm">
          {(["7d", "30d", "90d"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg uppercase transition-colors ${
                timeframe === t
                  ? "bg-[#E2ECE4] text-[#263B2C] font-semibold"
                  : "text-[#575E59] hover:text-[#1C1F1D]"
              }`}
            >
              {t === "7d" ? "7 Days" : t === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {weightLoggedSuccess && (
        <div className="rounded-xl border border-[#C7DBD0] bg-[#E2ECE4] p-3 text-xs font-semibold text-[#263B2C] flex items-center gap-2">
          <CheckCircle2 size={16} className="text-[#375A41]" />
          <span>{weightLoggedSuccess}</span>
        </div>
      )}

      {/* METRIC HIGHLIGHTS ROW: Current Weight, Net Change, BMI, Goal Remaining */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Current Weight */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Current Weight</span>
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <Scale size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1C1F1D]">{currentWeight} kg</p>
            <p className="text-xs text-[#717A73]">Start: {startWeight} kg (Oct 1)</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: "70%" }} />
          </div>
        </Card>

        {/* Total Lost */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Net Trajectory</span>
            <div className="p-2 rounded-xl bg-[#E2ECE4] text-[#375A41]">
              <ArrowDownRight size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#437151]">-{totalLost} kg</p>
            <p className="text-xs text-[#717A73]">Healthy, sustained decline</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: "85%" }} />
          </div>
        </Card>

        {/* BMI Display */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Body Mass Index</span>
            <div className="p-2 rounded-xl bg-[#EDF0DF] text-[#43492D]">
              <Target size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1C1F1D]">{currentBmi}</p>
            <p className="text-xs text-[#6B7546] font-medium">Optimal Normal Range (18.5 – 24.9)</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#6B7546]" style={{ width: "65%" }} />
          </div>
        </Card>

        {/* Goal Progress */}
        <Card variant="default" className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#575E59]">Target Goal</span>
            <div className="p-2 rounded-xl bg-[#FAF8F5] border border-[#E8E5DD] text-[#437151]">
              <Award size={18} />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1C1F1D]">{goalWeight} kg</p>
            <p className="text-xs text-[#717A73]">{remainingToGoal} kg remaining to goal</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[#EFEBE1] overflow-hidden">
            <div className="h-full rounded-full bg-[#437151]" style={{ width: "71%" }} />
          </div>
        </Card>
      </div>

      {/* WEIGHT TREND CHART & LOG WEIGHT INPUT FORM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Chart Card */}
        <Card variant="default" className="lg:col-span-2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E5DD]">
              <div>
                <h2 className="text-base font-semibold text-[#1C1F1D]">Weight History & Trajectory</h2>
                <p className="text-xs text-[#575E59]">Recorded weekly weigh-ins</p>
              </div>
              <Badge variant="sage" size="sm">Trend: Downward</Badge>
            </div>

            {/* Apple-style Weight Sparkline Chart */}
            <div className="pt-8 pb-3 flex items-end justify-between gap-3 h-52">
              {demoWeightHistory.map((w) => {
                // Scale from 70kg to 77kg
                const minScale = 70;
                const maxScale = 77;
                const heightPercent = Math.min(
                  Math.max(Math.round(((w.weightKg - minScale) / (maxScale - minScale)) * 100), 10),
                  100
                );

                return (
                  <div key={w.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <span className="text-[11px] font-semibold text-[#1C1F1D]">
                      {w.weightKg}k
                    </span>
                    <div className="w-full rounded-t-xl bg-[#EFEBE1] h-36 flex items-end overflow-hidden p-1">
                      <div
                        className="w-full rounded-t-lg bg-[#437151] transition-all duration-300"
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#575E59] font-medium">{w.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#E8E5DD] flex items-center justify-between text-xs text-[#575E59]">
            <span>Average weekly loss: ~0.4 kg/week</span>
            <span className="font-semibold text-[#437151]">Projected goal reached: Dec 2026</span>
          </div>
        </Card>

        {/* Quick Log Weigh-In Card */}
        <Card variant="default" className="p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1C1F1D] pb-3 border-b border-[#E8E5DD]">
              Log Morning Weigh-In
            </h2>
            <p className="text-xs text-[#575E59] pt-3 leading-relaxed">
              Weigh yourself after waking and before hydration for highest physiological consistency.
            </p>

            <form onSubmit={handleLogWeight} className="pt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1C1F1D]">Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 73.2"
                  value={logWeightInput}
                  onChange={(e) => setLogWeightInput(e.target.value)}
                  className="w-full rounded-xl border border-[#E8E5DD] bg-[#FAF8F5] px-3.5 py-2.5 text-sm text-[#1C1F1D] focus:ring-1 focus:ring-[#437151]"
                />
              </div>
              <Button type="submit" size="md" variant="primary" className="w-full">
                Record Weigh-In
              </Button>
            </form>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E8E5DD] text-[11px] text-[#717A73]">
            LocalFit smooths daily water weight fluctuations to keep your focus on long-term trends.
          </div>
        </Card>
      </div>

      {/* CALORIE TRENDS & PROTEIN CONSISTENCY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calorie Deficit Trends */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
            <h2 className="text-base font-semibold text-[#1C1F1D]">Calorie Trends & Deficit</h2>
            <Badge variant="sage" size="sm">-320 kcal / day avg</Badge>
          </div>
          <p className="text-xs text-[#575E59]">
            A steady moderate deficit preserves metabolic rate while steadily tapping fat reserves.
          </p>
          <div className="space-y-2 text-xs text-[#1C1F1D] pt-2">
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Weekly Calorie Intake</span>
              <span className="font-semibold">14,910 kcal</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Weekly Total Expenditure</span>
              <span className="font-semibold">17,150 kcal</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#575E59]">Estimated Fat Mass Reduction</span>
              <span className="font-semibold text-[#437151]">~0.32 kg this week</span>
            </div>
          </div>
        </Card>

        {/* Protein Consistency */}
        <Card variant="default" className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
            <h2 className="text-base font-semibold text-[#1C1F1D]">Protein Consistency Score</h2>
            <Badge variant="olive" size="sm">92% Compliance</Badge>
          </div>
          <p className="text-xs text-[#575E59]">
            Maintaining 1.6–2.0g per kg of bodyweight guarantees lean muscle preservation during weight loss.
          </p>
          <div className="space-y-2 text-xs text-[#1C1F1D] pt-2">
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Average Daily Protein</span>
              <span className="font-semibold">142g / 150g target</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#FAF8F5]">
              <span className="text-[#575E59]">Streak at &gt;130g Protein</span>
              <span className="font-semibold">12 Consecutive Days</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#575E59]">Protein per kg Bodyweight</span>
              <span className="font-semibold text-[#437151]">1.93 g/kg</span>
            </div>
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
